import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import pb from '../lib/pocketbase';
import ClockSvg from '../components/ClockSvg';

const Cart = () => {
  const { 
    cart, 
    products, 
    currentUser, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    settings 
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  const grandTotal = cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleProceedToCheckout = async () => {
    if (cart.length === 0) return;

    const timestamp = new Date().toLocaleString();
    let orderItemsText = '';

    cart.forEach(item => {
      // Ensure image URL is absolute and public-facing for WhatsApp
      const baseUrl = (settings.websiteUrl || 'https://devi-times.com').replace(/\/$/, '');
      let imgPath = item.image || `/images/clock-${item.modelNumber}.png`;
      const absoluteImageUrl = imgPath.startsWith('http') ? imgPath : `${baseUrl}${imgPath.startsWith('/') ? '' : '/'}${imgPath}`;

      orderItemsText += `• ${item.productName}\n  Model: ${item.modelNumber}\n  Category: ${item.category}\n  Size: ${item.size}\n  Color: ${item.color || 'Default'}\n  Qty: ${item.quantity}\n  Price: ₹${item.unitPrice} × ${item.quantity} = ₹${item.unitPrice * item.quantity}\n  Product Image:\n  ${absoluteImageUrl}\n\n`;
    });

    const message = `━━━━━━━━━━━━━━━━━━━━━
🕐 DEVI TIMES — NEW ORDER
━━━━━━━━━━━━━━━━━━━━━

👤 CUSTOMER DETAILS
Name: ${currentUser.name}
Mobile: ${currentUser.mobile}
User ID: ${currentUser.userId}

🛒 ORDER ITEMS
${orderItemsText.trim()}

────────────────
TOTAL: ₹${grandTotal}
━━━━━━━━━━━━━━━━━━━━━
[${timestamp}]`;

    sessionStorage.setItem('lumiere_last_order', JSON.stringify({
      customer: currentUser,
      items: cart,
      grandTotal,
      timestamp
    }));

    let finalPhone = settings.whatsappNumber;
    try {
      const records = await pb.collection('app_settings').getFullList();
      if (records && records.length > 0) {
        finalPhone = records[0].whatsapp_number;
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp number from PB:", err);
    }

    const cleanPhone = finalPhone.replace(/[^0-9+]/g, '').replace('+', '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    clearCart();
    navigate('/checkout/success');
  };

  return (
    <div className="cart-root">

      {/* Navy Page Header */}
      <header className="cart-page-header">
        <div className="container">
          <span className="uppercase-label" style={{color:'rgba(126,179,232,0.85)',display:'block',marginBottom:'8px'}}>DEVI TIMES</span>
          <h1 className="cart-page-title font-heading">
            {cart.length === 0 ? 'Your Cart' : `Your Cart (${itemCount})`}
          </h1>
          <p className="cart-page-subtitle font-body">Review your selections before checkout</p>
        </div>
      </header>

      <div className="cart-content-wrapper container">
        
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="empty-cart-state animate-fade-in">
            <div className="empty-cart-icon-wrap">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="100" height="100">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#D0DCF0" strokeWidth="2"/>
                <circle cx="60" cy="60" r="42" fill="#F0F4F9" stroke="none"/>
                {Array.from({length:12}).map((_,i) => {
                  const a = (i*30*Math.PI)/180;
                  return <line key={i}
                    x1={60+32*Math.sin(a)} y1={60-32*Math.cos(a)}
                    x2={60+38*Math.sin(a)} y2={60-38*Math.cos(a)}
                    stroke="#B8C8DC" strokeWidth={i%3===0?"2.5":"1"} strokeLinecap="round"/>
                })}
                <line x1="60" y1="60" x2="60" y2="38" stroke="#8A9BB0" strokeWidth="3" strokeLinecap="round"/>
                <line x1="60" y1="60" x2="76" y2="60" stroke="#8A9BB0" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="60" cy="60" r="3" fill="#8A9BB0"/>
              </svg>
            </div>
            <h2 className="font-heading" style={{fontSize:'26px',color:'var(--text-primary)',marginBottom:'12px'}}>Your cart is empty</h2>
            <p className="font-body" style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.7' }}>
              Explore our curated collection and discover your perfect timepiece.
            </p>
            <Link to="/collection" className="btn-primary" style={{height:'48px',fontSize:'12px',padding:'0 32px'}}>
              BROWSE COLLECTION &nbsp; →
            </Link>
          </div>
        ) : (
          /* Cart List & Summary Panel */
          <div className="cart-active-state animate-fade-in">

            <div className="cart-split-layout">
              
              {/* Left Column: Cart Items List */}
              <div className="cart-items-list-col">
                {cart.map((item) => {
                  const lineTotal = item.unitPrice * item.quantity;
                  
                  return (
                    <div key={item.productId} className="cart-item-row">
                      
                      {/* Thumbnail Image */}
                      <div className="cart-thumbnail-wrapper">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="cart-item-thumbnail" />
                        ) : (
                          <ClockSvg model={item.modelNumber} category={item.category} color={item.color} size={60} />
                        )}
                      </div>

                      {/* Item Details Stack */}
                      <div className="cart-item-details-stack">
                        <span className="category-label" style={{ fontSize: '9px' }}>{item.category}</span>
                        <h3 className="cart-item-name font-heading">{item.productName}</h3>
                        <div className="cart-item-meta font-body">
                          Model: <strong>{item.modelNumber}</strong> &nbsp;|&nbsp; {item.size}
                        </div>
                      </div>

                      {/* Quantity steppers */}
                      <div className="cart-qty-controller font-body">
                        <button 
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="cart-qty-btn"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="cart-qty-val">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="cart-qty-btn"
                        >
                          +
                        </button>
                      </div>

                      {/* Pricing block */}
                      <div className="cart-pricing-block font-body">
                        <div className="cart-unit-price">₹{item.unitPrice} each</div>
                        <div className="cart-line-total font-body">₹{lineTotal}</div>
                      </div>

                      {/* Remove Button */}
                      <button 
                        onClick={() => removeFromCart(item.productId)}
                        className="cart-item-remove-btn"
                        aria-label="Remove item"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>

                    </div>
                  );
                })}
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="cart-summary-col">
                <div className="cart-summary-card">
                  <h3 className="summary-card-title font-heading">Order Summary</h3>
                  
                  <div className="summary-pricing-row">
                    <span className="summary-label font-body">Subtotal ({itemCount} items)</span>
                    <span className="summary-value font-body" style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>
                      ₹{grandTotal}
                    </span>
                  </div>

                  <p className="tax-helper-note font-body">
                    Prices are inclusive of all taxes
                  </p>

                  {/* Customer Context Info */}
                  <div className="summary-customer-box">
                    <h4 className="customer-box-title uppercase-label">Shipping Details</h4>
                    <div className="customer-info-row font-body">
                      <span>Name:</span> <strong>{currentUser.name}</strong>
                    </div>
                    <div className="customer-info-row font-body">
                      <span>Mobile:</span> <strong>{currentUser.mobile}</strong>
                    </div>
                    <div className="customer-info-row font-body">
                      <span>User ID:</span> <strong>{currentUser.userId}</strong>
                    </div>
                  </div>

                  {/* WhatsApp Checkout Button */}
                  <button 
                    onClick={handleProceedToCheckout}
                    className="btn-primary full-width-btn checkout-submit-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:'8px'}}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    CHECKOUT VIA WHATSAPP
                  </button>

                  {/* Continue Shopping */}
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Link to="/collection" className="cart-continue-link font-body">
                      ← Continue Shopping
                    </Link>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      <style>{`
        .cart-root {
          background-color: var(--page-bg);
          min-height: calc(100vh - var(--navbar-height));
          padding-bottom: 80px;
        }

        /* ── Navy Page Header ── */
        .cart-page-header {
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 48px 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cart-page-header::before {
          content: '';
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45,93,161,0.18) 0%, transparent 70%);
          top: -180px; right: -80px;
          pointer-events: none;
        }

        .cart-page-header .container { position: relative; z-index: 1; }

        .cart-page-title {
          font-size: 40px;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
          line-height: 1.1;
        }

        .cart-page-subtitle {
          color: rgba(200,216,238,0.65);
          font-size: 14px;
        }

        .cart-content-wrapper {
          max-width: 1080px !important;
          padding-top: 40px;
        }

        /* ── Empty Cart State ── */
        .empty-cart-state {
          text-align: center;
          background-color: #ffffff;
          padding: 80px 32px;
          border-radius: 4px;
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border-color);
          max-width: 540px;
          margin: 0 auto;
        }

        .empty-cart-icon-wrap {
          margin-bottom: 28px;
        }

        /* ── Active Cart Layout ── */
        .cart-split-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 28px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .cart-split-layout {
            grid-template-columns: 1fr;
          }
        }

        .cart-items-list-col {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
        }

        .cart-item-row {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          position: relative;
          transition: background-color 120ms ease;
        }

        .cart-item-row:last-child {
          border-bottom: none;
        }

        .cart-item-row:hover {
          background-color: #FAFBFD;
        }

        .cart-thumbnail-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 4px;
          overflow: hidden;
          background: linear-gradient(135deg, #F0F4F9, #E8EEF6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cart-item-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .cart-item-details-stack {
          flex-grow: 1;
          margin-left: 18px;
          padding-right: 16px;
        }

        .cart-item-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 2px;
        }

        .cart-item-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 3px;
        }

        .cart-qty-controller {
          display: flex;
          align-items: center;
          border: 1.5px solid var(--border-color);
          border-radius: 3px;
          height: 34px;
          margin-right: 20px;
          flex-shrink: 0;
        }

        .cart-qty-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          color: var(--text-secondary);
          transition: color 120ms ease, background-color 120ms ease;
        }

        .cart-qty-btn:hover:not(:disabled) {
          background-color: var(--page-bg);
          color: var(--accent-blue);
        }

        .cart-qty-btn:disabled {
          opacity: 0.25;
        }

        .cart-qty-val {
          font-size: 13px;
          font-weight: 700;
          padding: 0 8px;
          color: var(--text-primary);
        }

        .cart-pricing-block {
          text-align: right;
          margin-right: 36px;
          min-width: 80px;
          flex-shrink: 0;
        }

        .cart-unit-price {
          font-size: 11px;
          color: var(--text-muted);
        }

        .cart-line-total {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 2px;
        }

        .cart-item-remove-btn {
          color: var(--text-muted);
          transition: color 120ms ease;
          flex-shrink: 0;
        }

        .cart-item-remove-btn:hover {
          color: #ef4444;
        }

        /* ── Order Summary Card ── */
        .cart-summary-card {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          padding: 28px 24px;
          box-shadow: var(--card-shadow);
          position: sticky;
          top: calc(var(--navbar-height) + 24px);
        }

        .summary-card-title {
          font-size: 20px;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px;
          margin-bottom: 20px;
        }

        .summary-pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .summary-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .tax-helper-note {
          font-size: 11px;
          color: var(--text-muted);
          font-style: italic;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .summary-customer-box {
          background: linear-gradient(135deg, #F4F6F9, #EDF1F7);
          padding: 16px;
          border-radius: 3px;
          margin-bottom: 24px;
        }

        .customer-box-title {
          font-size: 10px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          display: block;
        }

        .customer-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 6px;
          color: var(--text-secondary);
        }

        .customer-info-row:last-child {
          margin-bottom: 0;
        }

        .checkout-submit-btn {
          height: 50px;
          font-size: 12px;
          letter-spacing: 0.1em;
          width: 100%;
          background-color: #25D366;
          border-color: #25D366;
        }

        .checkout-submit-btn:hover {
          background-color: #1FAF57;
          box-shadow: 0 4px 14px rgba(37,211,102,0.35);
        }

        .cart-continue-link {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          transition: color var(--transition-speed) ease;
        }

        .cart-continue-link:hover {
          color: var(--accent-blue);
        }

        @media (max-width: 640px) {
          .cart-item-row {
            flex-wrap: wrap;
            gap: 12px;
            padding: 16px;
          }

          .cart-item-details-stack {
            margin-left: 12px;
            padding-right: 32px;
          }

          .cart-qty-controller {
            margin-right: 12px;
          }

          .cart-pricing-block {
            margin-right: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;
