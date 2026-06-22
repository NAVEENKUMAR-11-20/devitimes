import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import pb from '../lib/pocketbase';
import { getOrCreateRegistrationId, formatOrderId } from '../lib/usersService';
import ClockSvg from '../components/ClockSvg';

const History = () => {
  const { currentUser, currentRetailUser } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [timeFilter, setTimeFilter] = useState('3months');
  const [searchVal, setSearchVal] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const availableYears = useMemo(() => {
    const years = new Set();
    orders.forEach(o => {
      const orderDate = new Date(o.timestamp);
      if (!isNaN(orderDate.getTime())) {
        years.add(orderDate.getFullYear().toString());
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      // If there is an active search, search globally across all orders
      if (activeSearch.trim()) {
        const query = activeSearch.toLowerCase().trim();
        const matchesId = (o.id || '').toLowerCase().includes(query);
        const matchesItems = (o.items || []).some(item => 
          (item.productName || '').toLowerCase().includes(query) ||
          (item.modelNumber || '').toLowerCase().includes(query) ||
          (item.category || '').toLowerCase().includes(query) ||
          (item.size || '').toLowerCase().includes(query) ||
          (item.color || '').toLowerCase().includes(query)
        );
        return matchesId || matchesItems;
      }

      // Otherwise, filter by time period
      const orderDate = new Date(o.timestamp);
      if (isNaN(orderDate.getTime())) return true;
      
      const diffMs = now - orderDate;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (timeFilter === '30days') {
        return diffDays <= 30;
      }
      if (timeFilter === '3months') {
        return diffDays <= 90;
      }
      if (timeFilter === '6months') {
        return diffDays <= 180;
      }
      if (timeFilter === 'all') {
        return true;
      }
      const orderYear = orderDate.getFullYear().toString();
      return orderYear === timeFilter;
    });
  }, [orders, timeFilter, activeSearch]);

  useEffect(() => {
    if (filteredOrders.length > 0) {
      if (!selectedOrder || !filteredOrders.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [filteredOrders, selectedOrder]);

  useEffect(() => {
    const isRetail = !!currentRetailUser || !!currentUser?.isRetail;
    if (isRetail) {
      navigate('/', { replace: true });
      return;
    }
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    const loadOrders = async () => {
      let regUserId = '';
      try {
        regUserId = await getOrCreateRegistrationId(currentUser);
      } catch (err) {
        console.error("[History] Failed to resolve registered_users record ID:", err);
      }

      if (regUserId) {
        // --- Migration of localStorage orders ---
        try {
          const stored = localStorage.getItem('lumiere_order_history');
          let parsed = stored ? JSON.parse(stored) : [];
          
          // Filter local orders belonging to this user
          const userLocalOrders = parsed.filter(o => o.customer && o.customer.userId === currentUser.userId);
          
          if (userLocalOrders.length > 0) {
            console.log(`[History] Found ${userLocalOrders.length} local orders for migration.`);
            
            for (const localOrder of userLocalOrders) {
              const isPbId = localOrder.id && !localOrder.id.startsWith('ORD-');
              
              if (isPbId) {
                // If it looks like a PocketBase ID, verify if it exists and update its User relation
                try {
                  const record = await pb.collection('orders').getOne(localOrder.id);
                  if (record && record.User !== regUserId) {
                    await pb.collection('orders').update(localOrder.id, { User: regUserId });
                    console.log(`[History] Linked existing PB order ${localOrder.id} to User ${regUserId}`);
                  }
                } catch (err) {
                  // If not found in database, create it
                  if (err.status === 404) {
                    try {
                      await pb.collection('orders').create({
                        id: localOrder.id,
                        User: regUserId,
                        orderDate: new Date(localOrder.timestamp || Date.now()).toISOString(),
                        products: localOrder.items,
                        totalAmount: localOrder.grandTotal,
                        status: localOrder.status || 'Pending'
                      });
                      console.log(`[History] Re-created PB order ${localOrder.id} during migration.`);
                    } catch (e) {
                      console.error(`[History] Failed to re-create PB order:`, e.message);
                    }
                  } else {
                    console.error(`[History] Failed to verify/link order ${localOrder.id}:`, err.message);
                  }
                }
              } else {
                // If it's a generated local ID (ORD-xxx), create a new order in PocketBase
                try {
                  const newRecord = await pb.collection('orders').create({
                    User: regUserId,
                    orderDate: new Date(localOrder.timestamp || Date.now()).toISOString(),
                    products: localOrder.items,
                    totalAmount: localOrder.grandTotal,
                    status: localOrder.status || 'Pending'
                  });
                  console.log(`[History] Migrated local order ${localOrder.id} to PB. New PB ID: ${newRecord.id}`);
                } catch (err) {
                  console.error(`[History] Failed to migrate local order ${localOrder.id}:`, err.message);
                }
              }
            }

            // Remove migrated orders from localStorage
            const remainingOrders = parsed.filter(o => !(o.customer && o.customer.userId === currentUser.userId));
            if (remainingOrders.length > 0) {
              localStorage.setItem('lumiere_order_history', JSON.stringify(remainingOrders));
            } else {
              localStorage.removeItem('lumiere_order_history');
            }
            console.log("[History] Migration of local orders completed successfully.");
          }
        } catch (err) {
          console.error("[History] Failed to migrate local orders:", err);
        }

        // --- Fetch all orders from PocketBase ---
        try {
          console.log("[History] Fetching orders for user registration ID:", regUserId);
          const records = await pb.collection('orders').getFullList({
            filter: `User = "${regUserId}"`
          });

          // Sort oldest first to assign sequential indices to legacy orders
          const sortedRecords = [...records].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
          const dayCounters = {};

          let fetchedOrders = sortedRecords.map(record => {
            const items = Array.isArray(record.products) 
              ? record.products 
              : (typeof record.products === 'string' ? JSON.parse(record.products) : []);

            // Generate date string (YYYYMMDD) in local time
            const dateObj = new Date(record.orderDate || record.created);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;

            let formattedId = '';
            if (record.id.toLowerCase().startsWith('dvt') && record.id.length === 15) {
              // Custom ID: Format directly from ID
              const clean = record.id.toUpperCase();
              formattedId = `DVT-${clean.substring(3, 11)}-${clean.substring(11)}`;
              
              // Track maximum sequence number for this day
              const seqNum = parseInt(clean.substring(11), 10);
              if (!isNaN(seqNum)) {
                dayCounters[dateStr] = Math.max(dayCounters[dateStr] || 0, seqNum);
              }
            } else {
              // Legacy ID: Assign sequential sequence number
              dayCounters[dateStr] = (dayCounters[dateStr] || 0) + 1;
              formattedId = `DVT-${dateStr}-${String(dayCounters[dateStr]).padStart(4, '0')}`;
            }
              
            return {
              id: record.id,
              formattedId: formattedId,
              grandTotal: record.totalAmount,
              timestamp: new Date(record.orderDate || record.created).toLocaleString(),
              _rawCreated: record.created,
              status: record.status || 'Pending',
              items: items.map(item => ({
                productName: item.productName || item.name || '',
                modelNumber: item.modelNumber || item.model || '',
                category: item.category || '',
                size: item.size || '',
                color: item.color || '',
                quantity: item.quantity || 1,
                unitPrice: item.price || item.unitPrice || 0,
                image: item.image || null
              }))
            };
          });

          // Sort back to newest first for display
          fetchedOrders.sort((a, b) => new Date(b._rawCreated).getTime() - new Date(a._rawCreated).getTime());

          console.log("[History] Orders fetched successfully from PocketBase. Count:", fetchedOrders.length);
          setOrders(fetchedOrders);
          if (fetchedOrders.length > 0) {
            setSelectedOrder(fetchedOrders[0]);
          }
          return;
        } catch (err) {
          console.error("[History] Failed to fetch orders from PocketBase:", err.message);
        }
      }

      setOrders([]);
      setSelectedOrder(null);
    };

    loadOrders();
  }, [currentUser, currentRetailUser, navigate]);

  const handlePrintInvoice = (order) => {
    const formattedId = order.formattedId || formatOrderId(order.id);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Please allow popups to print/view the invoice.");
      return;
    }

    const customerName = currentUser?.name || 'Valued Customer';
    const customerMobile = currentUser?.mobile || '';
    const customerId = currentUser?.userId || '';

    // Calculate subtotal
    const subtotal = order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${formattedId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1A2332;
            padding: 40px;
            background-color: #ffffff;
            margin: 0;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1A2332;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand-name {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #1A2332;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #8A9BB0;
            letter-spacing: 0.15em;
            margin-top: 4px;
            text-transform: uppercase;
          }
          .invoice-title-block {
            text-align: right;
          }
          .invoice-title {
            font-size: 32px;
            font-weight: 800;
            color: #1A2332;
            margin: 0 0 5px 0;
            letter-spacing: 0.05em;
          }
          .invoice-meta {
            font-size: 13px;
            color: #4A5568;
            margin: 3px 0;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #8A9BB0;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 6px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .detail-text {
            font-size: 14px;
            line-height: 1.6;
            margin: 4px 0;
            color: #2D3748;
          }
          table.invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          table.invoice-table th {
            background-color: #f8fafc;
            color: #1A2332;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 10px;
            text-align: left;
            border-bottom: 1px solid #E2E8F0;
          }
          table.invoice-table td {
            padding: 12px 10px;
            font-size: 13px;
            border-bottom: 1px solid #F1F5F9;
            color: #2D3748;
          }
          .item-desc {
            font-weight: 600;
            color: #1A2332;
          }
          .item-meta {
            font-size: 11px;
            color: #8A9BB0;
            margin-top: 2px;
          }
          .summary-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
          }
          .summary-table {
            width: 300px;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 8px 10px;
            font-size: 13px;
            color: #4A5568;
          }
          .summary-table tr.total-row td {
            font-weight: 800;
            font-size: 16px;
            color: #2D5DA1;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #E2E8F0;
            padding-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #8A9BB0;
            line-height: 1.6;
          }
          .no-print-btn {
            background-color: #2D5DA1;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 30px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .no-print-btn:hover {
            background-color: #1E4A8A;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="no-print" style="text-align: right;">
            <button class="no-print-btn" onclick="window.print()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Invoice / Save as PDF
            </button>
          </div>

          <div class="header-row">
            <div>
              <div class="brand-name">DEVI TIMES</div>
              <div class="brand-subtitle">Wholesale Clock Distributors</div>
            </div>
            <div class="invoice-title-block">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-meta"><strong>Invoice No:</strong> ${formattedId}</div>
              <div class="invoice-meta"><strong>Date:</strong> ${order.timestamp.split(',')[0]}</div>
            </div>
          </div>

          <div class="details-grid">
            <div>
              <div class="section-title">Billing To</div>
              <div class="detail-text"><strong>${customerName}</strong></div>
              <div class="detail-text">Wholesale Partner ID: ${customerId}</div>
              ${customerMobile ? `<div class="detail-text">Mobile: ${customerMobile}</div>` : ''}
            </div>
            <div>
              <div class="section-title">Supplier Details</div>
              <div class="detail-text"><strong>DEVI TIMES</strong></div>
              <div class="detail-text">Chennai, Tamil Nadu, India</div>
              <div class="detail-text">Support Email: devitimes@gmail.com</div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 50%">Item Details</th>
                <th style="width: 15%; text-align: right;">Price</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <div class="item-desc">${item.productName}</div>
                    <div class="item-meta">Model: ${item.modelNumber}${item.size ? ` | Size: ${item.size}` : ''}${item.color ? ` | Color: ${item.color}` : ''}</div>
                  </td>
                  <td style="text-align: right;">₹${item.unitPrice}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right; font-weight: 500;">₹${item.unitPrice * item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-container">
            <table class="summary-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">₹${subtotal}</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total:</td>
                <td style="text-align: right;">₹${order.grandTotal}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>This is a computer-generated invoice for your wholesale purchase record.</p>
            <p>For any queries regarding this order, please quote invoice number ${formattedId}.</p>
            <p style="font-weight: 600; color: #1A2332; margin-top: 15px;">Thank you for your business!</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  return (
    <div className="history-page-root">
      
      {/* Top accent banner */}
      <div className="history-accent-strip">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="uppercase-label" style={{ color: 'rgba(126,179,232,0.85)', letterSpacing: '0.2em' }}>DEVI TIMES</span>
          <span className="user-type-badge font-body">
            WHOLESALE ACCOUNT
          </span>
        </div>
      </div>

      <div className="container history-main-container animate-fade-in">
        <header className="history-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 className="history-title font-heading">Order History</h1>
              <p className="history-subtitle font-body">
                Purchase history and orders placed for {currentUser?.name}
              </p>
            </div>
            {orders.length > 0 && (
              <div className="history-filter-container font-body">
                {activeSearch ? (
                  <span className="history-filter-label">
                    Found <strong>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</strong> matching search
                  </span>
                ) : (
                  <>
                    <span className="history-filter-label">
                      <strong>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</strong> placed in
                    </span>
                    <select 
                      value={timeFilter} 
                      onChange={(e) => setTimeFilter(e.target.value)} 
                      className="history-filter-select"
                    >
                      <option value="30days">last 30 days</option>
                      <option value="3months">past 3 months</option>
                      <option value="6months">past 6 months</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                      <option value="all">all orders</option>
                    </select>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {orders.length > 0 && (
          <div className="history-search-row">
            <div className="history-search-container">
              <div className="history-search-input-wrapper">
                <svg className="history-search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="#8A9BB0" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search all orders" 
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActiveSearch(searchVal);
                    }
                  }}
                  className="history-search-input font-body"
                />
                {searchVal && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setSearchVal('');
                      setActiveSearch('');
                    }} 
                    className="history-search-clear-btn"
                  >
                    &times;
                  </button>
                )}
              </div>
              <button 
                onClick={() => setActiveSearch(searchVal)}
                className="history-search-btn font-body"
              >
                Search Orders
              </button>
            </div>
            
            {activeSearch && (
              <div className="search-status-message font-body">
                Showing results for "<strong>{activeSearch}</strong>"&nbsp;·&nbsp;
                <button 
                  onClick={() => {
                    setSearchVal('');
                    setActiveSearch('');
                  }}
                  className="search-clear-link"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="empty-history font-body">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <p>No orders found in your history.</p>
            <Link to="/collection" className="btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="history-layout">
            
            {/* Left side: Orders list */}
            <div className="orders-sidebar">
              <h3 className="sidebar-section-title font-heading">YOUR ORDERS</h3>
              <div className="orders-list">
                {filteredOrders.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0', textAlign: 'center', width: '100%' }}>
                    {activeSearch ? 'No orders match your search query.' : 'No orders matching this period.'}
                  </div>
                ) : (
                  filteredOrders.map((o) => (
                    <div 
                      key={o.id} 
                      className={`order-card-item ${selectedOrder && selectedOrder.id === o.id ? 'active' : ''}`}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <div className="order-card-header">
                        <span className="order-card-id font-heading">{o.formattedId || o.id}</span>
                      </div>
                      <div className="order-card-meta font-body">
                        <span>{o.timestamp.split(',')[0]}</span>
                        <strong className="order-card-price">₹{o.grandTotal}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right side: Selected order detail */}
            {selectedOrder && (
              <div className="order-details-pane font-body animate-fade-in">
                <div className="detail-header">
                  <div>
                    <span className="detail-meta-label">ORDER ID</span>
                    <h2 className="detail-order-id font-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {selectedOrder.formattedId || selectedOrder.id}
                      <button 
                        onClick={() => handlePrintInvoice(selectedOrder)}
                        className="btn-invoice font-body"
                        title="Print / Download Invoice"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Invoice
                      </button>
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="detail-meta-label">PLACED ON</span>
                    <div className="detail-order-date">{selectedOrder.timestamp}</div>
                  </div>
                </div>

                <div className="detail-divider" />

                {/* Items List */}
                <div className="detail-items-section">
                  <h4 className="detail-section-title font-heading">ITEMS ORDERED</h4>
                  <div className="detail-items-list">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="detail-item-row">
                        <div className="detail-item-thumbnail-wrapper">
                          {item.image ? (
                            <img src={item.image} alt={item.productName} className="detail-item-thumbnail" loading="lazy" />
                          ) : (
                            <ClockSvg model={item.modelNumber} category={item.category} color={item.color} size={48} />
                          )}
                        </div>
                        
                        <div className="detail-item-info">
                          <div className="detail-item-name font-heading">{item.productName}</div>
                          <div className="detail-item-meta">
                            Model: <code>{item.modelNumber}</code> &nbsp;·&nbsp; {item.category} &nbsp;·&nbsp; {item.size}
                          </div>
                        </div>
                        
                        <div className="detail-item-price-calc">
                          {item.quantity} × ₹{item.unitPrice} = <strong style={{ color: 'var(--text-primary)' }}>₹{item.unitPrice * item.quantity}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-divider" />

                {/* Grand Total */}
                <div className="detail-total-section">
                  <span className="grand-total-label font-heading">GRAND TOTAL</span>
                  <span className="grand-total-amount">₹{selectedOrder.grandTotal}</span>
                </div>

                <div className="detail-footer-note">
                  <p>
                    * This order has been submitted via WhatsApp. If you need to make changes, please contact support with the Order ID above.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        <div className="history-actions-row">
          <Link to="/collection" className="btn-secondary">
            ← Continue Shopping
          </Link>
        </div>

      </div>

      <style>{`
        .history-page-root {
          background-color: var(--page-bg);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 80px;
        }

        .history-accent-strip {
          width: 100%;
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 16px 0;
          color: #ffffff;
        }

        .user-type-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          background-color: rgba(255, 255, 255, 0.1);
          padding: 4px 10px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .history-main-container {
          max-width: 1100px !important;
          width: 100%;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 4px;
          box-shadow: 0 4px 20px rgba(26,35,50,0.08);
          border: 1px solid var(--border-color);
          margin-top: 30px;
          box-sizing: border-box;
        }

        .history-header {
          margin-bottom: 32px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px;
        }

        .history-title {
          font-size: 28px;
          color: var(--text-primary);
          margin: 0 0 6px 0;
        }

        .history-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }

        .empty-history {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        }

        .history-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 32px;
          align-items: start;
        }

        .sidebar-section-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin: 0 0 16px 0;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-card-item {
          background-color: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-card-item:hover {
          border-color: #cbd5e1;
          background-color: #f1f5f9;
        }

        .order-card-item.active {
          border-color: var(--accent-blue);
          background-color: #f0f6ff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .order-card-id {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .order-status-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 2px;
          text-transform: uppercase;
        }

        .order-status-tag.delivered, .order-status-tag.processed {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .order-status-tag.pending {
          background-color: #FEF3C7;
          color: #92400E;
        }

        .order-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .order-card-price {
          color: var(--text-primary);
          font-weight: 600;
        }

        .order-details-pane {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.02);
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-meta-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          display: block;
          margin-bottom: 4px;
        }

        .detail-order-id {
          font-size: 22px;
          color: var(--text-primary);
          margin: 0;
        }

        .detail-order-date {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .detail-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 24px 0;
        }

        .detail-section-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin: 0 0 16px 0;
        }

        .detail-items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

         .detail-item-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #f1f5f9;
        }

        .detail-item-thumbnail-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          overflow: hidden;
          background: linear-gradient(135deg, #F0F4F9, #E8EEF6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--border-color);
        }

        .detail-item-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .detail-item-info {
          flex-grow: 1;
        }

        .detail-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .detail-item-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .detail-item-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .detail-item-price-calc {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .detail-total-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .grand-total-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .grand-total-amount {
          font-size: 24px;
          font-weight: 800;
          color: var(--accent-blue);
        }

        .detail-footer-note {
          margin-top: 32px;
          background-color: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 16px;
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .history-filter-container {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .history-filter-select {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 32px 6px 12px;
          font-size: 13px;
          font-family: inherit;
          color: var(--text-primary);
          cursor: pointer;
          outline: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 12px;
        }

        .history-filter-select:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .history-search-row {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .history-search-container {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 500px;
          width: 100%;
        }

        .history-search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex-grow: 1;
          background-color: #ffffff;
          border: 1px solid #d5d9d9;
          border-radius: 8px;
          padding: 0 12px;
          height: 38px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .history-search-input-wrapper:focus-within {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .history-search-icon {
          flex-shrink: 0;
          margin-right: 8px;
          color: var(--text-muted);
        }

        .history-search-input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          height: 100%;
          color: var(--text-primary);
          font-size: 14px;
        }

        .history-search-input::placeholder {
          color: var(--text-muted);
        }

        .history-search-clear-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .history-search-clear-btn:hover {
          color: var(--text-primary);
        }

        .history-search-btn {
          background-color: #232f3e;
          color: #ffffff;
          border: none;
          border-radius: 100px;
          padding: 0 20px;
          height: 38px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.2s, transform 0.1s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .history-search-btn:hover {
          background-color: #1a242f;
        }

        .history-search-btn:active {
          transform: scale(0.98);
        }

        .search-status-message {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .search-clear-link {
          background: none;
          border: none;
          color: var(--accent-blue);
          text-decoration: underline;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          display: inline;
        }

        .search-clear-link:hover {
          color: var(--button-primary-hover);
        }

        .btn-invoice {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-invoice:hover {
          background-color: #e2e8f0;
          color: #1e293b;
          border-color: #94a3b8;
        }

        .btn-invoice svg {
          stroke-width: 2.5;
        }

        .history-actions-row {
          margin-top: 32px;
          display: flex;
          justify-content: flex-start;
        }

        @media (max-width: 850px) {
          .history-layout {
            grid-template-columns: 1fr;
          }
          .history-main-container {
            padding: 24px;
          }
        }
      `}</style>

    </div>
  );
};

export default History;
