import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ClockSvg from '../../components/ClockSvg';

const AdminProducts = () => {
  const { products, deleteProduct, updateProduct, toggleProductLive } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, LIVE, HIDDEN
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, or specific categories

  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortAscending, setSortAscending] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', category: 'Modern Minimalist', modelNumber: '', size: '', packageNo: '',
    color: '', salePrice: 0, originalPrice: 0, stockCount: 0,
    description: '', isOnSale: false, isLive: true, images: []
  });

  // Delete Confirmation Modal State
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Instant notification feedback state
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 1500);
  };

  // Metrics summary
  const totalCount = products.length;
  const liveCount = products.filter(p => p.isLive).length;
  const hiddenCount = totalCount - liveCount;

  const categories = ['Modern Minimalist', 'Contemporary', 'Luxury Vintage', 'Classic', 'Special Edition'];

  // Handle Sort Header clicks
  const requestSort = (field) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Instant status toggle
  const handleToggleLive = (id, currentStatus) => {
    toggleProductLive(id);
    triggerToast(currentStatus ? 'Product set to HIDDEN' : 'Product set to LIVE');
  };

  // Trigger Delete confirmation
  const triggerDeleteConfirm = (id) => {
    setDeletingProductId(id);
  };

  const handleConfirmDelete = () => {
    if (deletingProductId) {
      deleteProduct(deletingProductId);
      setDeletingProductId(null);
      triggerToast('Product deleted successfully');
    }
  };

  // Trigger Edit Form
  const triggerEdit = (product) => {
    setEditingProduct(product);
    setEditForm({ ...product });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.modelNumber.trim() || !editForm.size.trim()) {
      alert('Please fill in all required fields marked with *');
      return;
    }
    
    updateProduct({
      ...editForm,
      salePrice: Number(editForm.salePrice),
      originalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : null,
      stockCount: Number(editForm.stockCount)
    });
    setEditingProduct(null);
    triggerToast('Product updated successfully');
  };

  // Image helpers for Edit Modal
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditForm(prev => ({
          ...prev,
          images: [...prev.images, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEditImage = (indexToRemove) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Filter and Sort Table rows
  const sortedFilteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Status checks
        if (statusFilter === 'LIVE' && !p.isLive) return false;
        if (statusFilter === 'HIDDEN' && p.isLive) return false;

        // Category checks
        if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

        // Search text check
        const q = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || 
               p.modelNumber.toLowerCase().includes(q) || 
               p.category.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Format strings or numbers for comparison
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;
        return 0;
      });
  }, [products, searchQuery, statusFilter, categoryFilter, sortField, sortAscending]);

  // Paginated elements
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedFilteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedFilteredProducts, currentPage]);

  const totalPages = Math.ceil(sortedFilteredProducts.length / itemsPerPage) || 1;

  // Sorting Indicators
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortAscending ? ' ▲' : ' ▼';
  };

  return (
    <div className="admin-products-root font-body">
      
      {/* Toast Alert popup */}
      {toastMessage && (
        <div className="toast-notification font-body">
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="products-header-row">
        <div>
          <h1 className="dashboard-heading font-heading">Product Catalogue</h1>
          <p className="stats-indicator font-body">
            {totalCount} products total &nbsp;|&nbsp; 
            <span style={{ color: '#10B981', fontWeight: '600' }}>{liveCount} live</span> &nbsp;|&nbsp; 
            <span style={{ color: '#6B7280', fontWeight: '600' }}>{hiddenCount} hidden</span>
          </p>
        </div>
        <Link to="/admin/add-product" className="btn-primary font-body" style={{ height: '40px', padding: '0 20px', fontSize: '12px' }}>
          ➕ &nbsp; ADD NEW PRODUCT
        </Link>
      </div>

      {/* Search and Filters deck */}
      <div className="table-controls-card">
        
        {/* Real-time search bar */}
        <div className="search-control-wrapper">
          <input 
            type="text" 
            placeholder="Search catalogue by name, category, or model..."
            className="form-input search-catalogue-input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Tab Filters row */}
        <div className="filters-tabs-row">
          
          <div className="status-tabs-group">
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'ALL' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
            >
              All
            </button>
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'LIVE' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('LIVE'); setCurrentPage(1); }}
            >
              Live
            </button>
            <button 
              className={`tab-btn uppercase-label ${statusFilter === 'HIDDEN' ? 'active-tab' : ''}`}
              onClick={() => { setStatusFilter('HIDDEN'); setCurrentPage(1); }}
            >
              Hidden
            </button>
          </div>

          <div className="category-select-wrapper">
            <select 
              className="form-input category-select-filter"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Products Table container */}
      <div className="table-container-card">
        {paginatedProducts.length === 0 ? (
          <div className="empty-table-state font-body">
            No products match the search or filter query.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th onClick={() => requestSort('name')} className="sortable-header">
                  Name{renderSortIndicator('name')}
                </th>
                <th onClick={() => requestSort('modelNumber')} className="sortable-header">
                  Model No{renderSortIndicator('modelNumber')}
                </th>
                <th onClick={() => requestSort('category')} className="sortable-header">
                  Category{renderSortIndicator('category')}
                </th>
                <th onClick={() => requestSort('salePrice')} className="sortable-header">
                  Price{renderSortIndicator('salePrice')}
                </th>
                <th>Dimensions</th>
                <th>Pkg No</th>
                <th>Color</th>
                <th onClick={() => requestSort('stockCount')} className="sortable-header">
                  Stock{renderSortIndicator('stockCount')}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.id}>
                  
                  {/* Thumbnail */}
                  <td>
                    <div className="table-thumb-wrapper">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.name} className="table-thumbnail-img" />
                      ) : (
                        <ClockSvg model={p.modelNumber} category={p.category} color={p.color} size={40} />
                      )}
                    </div>
                  </td>

                  {/* Details */}
                  <td><strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong></td>
                  <td><code>{p.modelNumber}</code></td>
                  <td><span className="category-tag-cell">{p.category}</span></td>
                  <td>
                    <div className="table-price-stack">
                      <strong>₹{p.salePrice}</strong>
                      {p.originalPrice && <span className="strikethrough-cell">₹{p.originalPrice}</span>}
                    </div>
                  </td>
                  <td>{p.size}</td>
                  <td>{p.packageNo || '-'}</td>
                  <td>{p.color}</td>
                  <td>
                    <span className={`stock-cell ${p.stockCount <= 0 ? 'out-stock' : p.stockCount <= 5 ? 'low-stock' : ''}`}>
                      {p.stockCount} pcs
                    </span>
                  </td>

                  {/* Status Toggle Switch */}
                  <td>
                    <button 
                      onClick={() => handleToggleLive(p.id, p.isLive)} 
                      className={`status-toggle-switch ${p.isLive ? 'live-switch' : 'hidden-switch'}`}
                      aria-label="Toggle live status"
                    >
                      <span className="toggle-slider"></span>
                      <span className="toggle-label-text">{p.isLive ? 'LIVE' : 'HIDDEN'}</span>
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td>
                    <div className="table-actions-row">
                      <button 
                        onClick={() => triggerEdit(p)} 
                        className="action-icon-btn edit-btn"
                        aria-label="Edit time product"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => triggerDeleteConfirm(p.id)} 
                        className="action-icon-btn delete-btn"
                        aria-label="Delete product"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginate Controls footer */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="pagination-btn"
            >
              ◀ &nbsp; Prev
            </button>
            <span className="pagination-info">
              Page <strong>{currentPage}</strong> of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="pagination-btn"
            >
              Next &nbsp; ▶
            </button>
          </div>
        )}

      </div>

      {/* --- EDIT MODAL OVERLAY --- */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-card edit-product-modal animate-fade-in">
            <h3 className="modal-title font-heading" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Edit Product Details
            </h3>

            <form onSubmit={handleEditSubmit} className="admin-form edit-product-form">
              
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">PRODUCT NAME *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CATEGORY *</label>
                  <select 
                    className="form-input"
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid-3col">
                <div className="form-group">
                  <label className="form-label">MODEL NO *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.modelNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, modelNumber: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SIZE *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.size}
                    placeholder="e.g. 300 × 300 MM"
                    onChange={(e) => setEditForm(prev => ({ ...prev, size: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PKG NO *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.packageNo || ''}
                    placeholder="e.g. 52"
                    onChange={(e) => setEditForm(prev => ({ ...prev, packageNo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-3col">
                <div className="form-group">
                  <label className="form-label">COLOR *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editForm.color}
                    onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SALE PRICE (₹) *</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={editForm.salePrice}
                    onChange={(e) => setEditForm(prev => ({ ...prev, salePrice: Number(e.target.value) }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ORIGINAL PRICE (₹)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={editForm.originalPrice || ''}
                    placeholder="e.g. 120"
                    onChange={(e) => setEditForm(prev => ({ ...prev, originalPrice: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PIECES AVAILABLE *</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={editForm.stockCount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stockCount: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPTION</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Checkboxes */}
              <div className="form-checkboxes-row font-body">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={editForm.isOnSale}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isOnSale: e.target.checked }))}
                  />
                  <span>Show "SALE" Badge</span>
                </label>

                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={editForm.isLive}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isLive: e.target.checked }))}
                  />
                  <span>Make Product Live</span>
                </label>
              </div>

              {/* Images uploads */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">IMAGES GALLERY ({editForm.images.length})</label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  id="modal-img-upload-input" 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
                
                <div className="modal-gallery-row">
                  {editForm.images.map((img, index) => (
                    <div key={index} className="modal-gallery-thumb">
                      <img src={img} alt="preview" />
                      <button 
                        type="button" 
                        className="remove-thumb-x"
                        onClick={() => removeEditImage(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  
                  <label htmlFor="modal-img-upload-input" className="modal-add-thumb-btn">
                    <span>+ Add</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions-row" style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary modal-btn">
                  SAVE CHANGES
                </button>
                <button 
                  type="button" 
                  className="btn-secondary modal-btn"
                  onClick={() => setEditingProduct(null)}
                >
                  CANCEL
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingProductId && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '380px' }}>
            <h3 className="modal-title font-heading">Delete Product</h3>
            <p className="modal-desc font-body">Are you sure you want to delete this timepiece? This action cannot be undone.</p>
            
            <div className="modal-actions-row">
              <button onClick={handleConfirmDelete} className="btn-primary modal-btn" style={{ backgroundColor: '#EF4444' }}>
                DELETE
              </button>
              <button onClick={() => setDeletingProductId(null)} className="btn-secondary modal-btn">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-products-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .products-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stats-indicator {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Control cards style */
        .table-controls-card {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          padding: 20px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .search-control-wrapper {
          width: 100%;
        }

        .search-catalogue-input {
          height: 40px;
          font-size: 13px;
        }

        .filters-tabs-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .status-tabs-group {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 2px;
        }

        .tab-btn {
          height: 32px;
          padding: 0 16px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .active-tab {
          color: var(--accent-blue) !important;
          border-bottom: 2px solid var(--accent-blue);
          font-weight: 700;
        }

        .category-select-filter {
          height: 36px;
          font-size: 12px;
          width: 180px;
        }

        /* Table Design */
        .table-container-card {
          background-color: #ffffff;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          overflow-x: auto;
        }

        .empty-table-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .admin-table th {
          background-color: #F8FAFC;
          color: var(--text-secondary);
          padding: 16px;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.08em;
          user-select: none;
        }

        .sortable-header {
          cursor: pointer;
        }

        .sortable-header:hover {
          background-color: #F1F5F9;
        }

        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
          vertical-align: middle;
        }

        .admin-table tr:last-child td {
          border-bottom: none;
        }

        .table-thumb-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 4px;
          overflow: hidden;
          background-color: #F0F2F5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .table-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .category-tag-cell {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          background-color: var(--page-bg);
          padding: 4px 8px;
        }

        .table-price-stack {
          display: flex;
          flex-direction: column;
        }

        .strikethrough-cell {
          font-size: 11px;
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .stock-cell {
          font-weight: 600;
          color: #10B981;
        }

        .stock-cell.low-stock {
          color: #F59E0B;
        }

        .stock-cell.out-stock {
          color: #EF4444;
        }

        /* Status toggle custom switch button */
        .status-toggle-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          background: #E2E8F0;
          border-radius: 12px;
          padding: 4px 10px;
          height: 24px;
          transition: background 0.3s;
        }

        .live-switch {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .hidden-switch {
          background-color: #F1F5F9;
          color: #475569;
        }

        .toggle-slider {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
        }

        .toggle-label-text {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        /* Action buttons */
        .table-actions-row {
          display: flex;
          gap: 12px;
        }

        .action-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          background-color: #ffffff;
        }

        .action-icon-btn:hover {
          background-color: var(--page-bg);
        }

        .delete-btn:hover {
          border-color: #FCA5A5;
          background-color: #FEF2F2;
        }

        /* Pagination bar */
        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background-color: #F8FAFC;
          border-top: 1px solid var(--border-color);
        }

        .pagination-btn {
          height: 32px;
          padding: 0 16px;
          font-size: 12px;
          border: 1px solid var(--border-color);
          background-color: #ffffff;
          border-radius: 2px;
          color: var(--text-secondary);
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: var(--page-bg);
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Toast notification */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #1E293B;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 3000;
          font-size: 13px;
          animation: fadeIn 0.2s ease;
        }

        /* Edit Modal adjustments */
        .edit-product-modal {
          max-width: 680px !important;
          text-align: left;
        }

        .edit-product-form {
          margin-top: 20px;
        }

        .form-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-grid-3col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .form-grid-2col, .form-grid-3col {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }

        .form-checkboxes-row {
          display: flex;
          gap: 24px;
          margin: 12px 0;
        }

        .checkbox-container {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .checkbox-container input {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-blue);
        }

        /* Gallery Row */
        .modal-gallery-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }

        .modal-gallery-thumb {
          width: 60px;
          height: 60px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          position: relative;
          background-color: #F0F2F5;
        }

        .modal-gallery-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .remove-thumb-x {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background-color: #EF4444;
          color: #ffffff;
          font-size: 11px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .modal-add-thumb-btn {
          width: 60px;
          height: 60px;
          border: 1.5px dashed var(--border-color);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 11px;
          background-color: #F8FAFC;
        }

        .modal-add-thumb-btn:hover {
          border-color: var(--accent-blue);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;
