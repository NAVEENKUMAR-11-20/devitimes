import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ClockSvg from '../components/ClockSvg';
import { fetchAllProducts } from '../lib/productsService';

const Collection = () => {
  const { products: contextProducts, currentUser, addToCart } = useApp();
  const navigate = useNavigate();

  // Local state for auto-refreshing products
  const [liveProducts, setLiveProducts] = useState(Array.isArray(contextProducts) ? contextProducts : []);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Sync with context on load
  useEffect(() => {
    setLiveProducts(Array.isArray(contextProducts) ? contextProducts : []);
  }, [contextProducts]);

  // Loading state timeout for first page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Poll PocketBase for updates every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const pbProducts = await fetchAllProducts();
        setLiveProducts(Array.isArray(pbProducts) ? pbProducts : []);
      } catch (err) {
        console.error('Collection page fetch error:', err);
        setLiveProducts([]);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Success toast/feedback per product
  const [addedProductId, setAddedProductId] = useState(null);

  // Categories list
  const categories = ['ALL', 'MODERN MINIMALIST', 'CONTEMPORARY', 'LUXURY VINTAGE'];

  // Filter products in real time
  const filteredProducts = useMemo(() => {
    return (liveProducts || []).filter(p => {
      // Only show live products to customers
      if (!p.isLive) return false;

      // Category check
      const safeCat = (p.category || '').toUpperCase();
      const matchesCategory = 
        activeCategory === 'ALL' || 
        safeCat === activeCategory;

      // Search query check
      const query = searchQuery.toLowerCase().trim();
      const safeName = (p.name || '').toLowerCase();
      const safeModel = (p.modelNumber || '').toString().toLowerCase();
      const matchesSearch = 
        safeName.includes(query) || 
        safeModel.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [liveProducts, activeCategory, searchQuery]);

  // Handle click on "ORDER" button
  const handleOrder = (product) => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      addToCart(product, 1);
      setAddedProductId(product.id);
      setTimeout(() => {
        setAddedProductId(null);
      }, 1500); // clear feedback toast after 1.5s
    }
  };

  return (
    <div className="collection-root">
      
      {/* 1. Page Header */}
      <header className="collection-header animate-fade-in">
        <div className="container">
          <span className="uppercase-label" style={{color:'rgba(126,179,232,0.85)',display:'block',marginBottom:'10px'}}>DEVI TIMES</span>
          <h1 className="collection-title font-heading">Our Collection</h1>
          <p className="collection-subtitle font-body">Discover our curated selection of premium handcrafted wall clocks</p>
        </div>
      </header>

      {/* 2. Search & Filters Bar */}
      <section className="filters-bar-section">
        <div className="container filters-container">
          
          {/* Search Box */}
          <div className="search-box-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A9BB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="search-input"
              placeholder="Search by name or model number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')} aria-label="Clear Search">
                &times;
              </button>
            )}
          </div>

          {/* Category Filter Buttons */}
          <div className="category-filters-wrapper">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn uppercase-label ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* 3. Product Count Label */}
      <section className="count-label-section">
        <div className="container">
          <div className="count-label uppercase-label">
            SHOWING {filteredProducts.length} PRODUCTS
          </div>
        </div>
      </section>

      {/* 4. Product Grid */}
      <section className="products-grid-section">
        <div className="container">
          {isInitialLoad ? (
            <div className="empty-results-box font-body" style={{ border: 'none', background: 'transparent' }}>
              <div className="loading-spinner" style={{ 
                width: '40px', height: '40px', border: '3px solid #E2E8F0', 
                borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', 
                margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' 
              }}></div>
              <p>Loading latest collection...</p>
            </div>
          ) : !Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
            <div className="empty-results-box font-body">
              <p>No products match your search or filter criteria.</p>
              <button 
                className="btn-secondary" 
                onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
                style={{ marginTop: '16px' }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid-products">
              {(Array.isArray(filteredProducts) ? filteredProducts : []).map((product) => {
                if (!product) return null;
                const isSale = product.isOnSale;
                const isAdded = addedProductId === product.id;

                return (
                  <div key={product.id || Math.random()} className="card-product animate-fade-in">
                    
                    {/* Image Viewport */}
                    <div className="card-image-area">
                      {isSale && <span className="badge-sale absolute-badge">SALE</span>}
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name || 'Product'} />
                      ) : (
                        <ClockSvg model={product.modelNumber || ''} category={product.category || ''} color={product.color || ''} size={160} />
                      )}
                    </div>

                    {/* Product Details Section */}
                    <div className="card-text-area">
                      <div>
                        <span className="category-label">{product.category || 'Uncategorized'}</span>
                        <h2 className="product-name font-heading" style={{ marginTop: '4px', fontSize: '17px' }}>{product.name || 'Unnamed Product'}</h2>
                        
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          MODEL NUMBER
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {product.modelNumber || 'N/A'}
                        </div>
                        
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {product.size}
                        </div>
                      </div>

                      <div className="pricing-row" style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span className="price-bold" style={{ fontSize: '20px' }}>₹{product.salePrice}</span>
                        {product.originalPrice && (
                          <span className="price-strikethrough">₹{product.originalPrice}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="card-button-row">
                      <Link to={`/product/${product.id}`} className="btn-secondary btn-text" style={{ padding: '10px 0', fontSize: '11px' }}>
                        DETAILS
                      </Link>
                      <button 
                        onClick={() => handleOrder(product)} 
                        className="btn-primary btn-text"
                        style={{ 
                          padding: '10px 0', 
                          fontSize: '11px',
                          backgroundColor: isAdded ? '#059669' : 'var(--button-primary-fill)' 
                        }}
                        disabled={product.stockCount <= 0}
                      >
                        {product.stockCount <= 0 ? 'OUT OF STOCK' : isAdded ? '✓ ADDED' : 'ORDER'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Authentication Required Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in">
            <h3 className="modal-title font-heading">Sign In Required</h3>
            <p className="modal-desc font-body">Please sign in to your DEVI TIMES account to add items to your cart.</p>
            
            <div className="modal-actions-row">
              <button 
                onClick={() => { setShowAuthModal(false); navigate('/login'); }}
                className="btn-primary modal-btn"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setShowAuthModal(false); navigate('/register'); }}
                className="btn-secondary modal-btn"
              >
                Register
              </button>
            </div>
            
            <button 
              className="modal-close-btn" 
              onClick={() => setShowAuthModal(false)}
              aria-label="Close Modal"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <style>{`
        .collection-root {
          padding-bottom: 80px;
          background-color: var(--page-bg);
        }

        /* ── Navy Page Header ── */
        .collection-header {
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 64px 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .collection-header::before {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45,93,161,0.18) 0%, transparent 70%);
          top: -200px; right: -100px;
          pointer-events: none;
        }

        .collection-header::after {
          content: '';
          position: absolute;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,127,193,0.12) 0%, transparent 70%);
          bottom: -80px; left: -50px;
          pointer-events: none;
        }

        .collection-header .container { position: relative; z-index: 1; }

        .collection-title {
          font-size: 46px;
          color: #ffffff;
          margin-bottom: 12px;
          letter-spacing: 0.02em;
          line-height: 1.1;
        }

        .collection-subtitle {
          color: rgba(200,216,238,0.72);
          font-size: 15px;
        }

        /* ── Filters Bar ── */
        .filters-bar-section {
          padding: 18px 0;
          background-color: #ffffff;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: var(--navbar-height);
          z-index: 100;
          box-shadow: 0 2px 8px rgba(26,35,50,0.06);
        }

        .filters-container {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .filters-container { flex-direction: column; align-items: stretch; gap: 12px; }
        }

        .search-box-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon { position: absolute; left: 14px; pointer-events: none; }

        .search-input {
          width: 100%;
          height: 42px;
          padding: 0 42px;
          border: 1.5px solid var(--border-color);
          border-radius: 3px;
          outline: none;
          color: var(--text-primary);
          background: #fff;
          font-size: 13px;
          transition: border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
        }

        .search-input::placeholder { color: var(--text-muted); }

        .search-input:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(45,93,161,0.10);
        }

        .clear-search-btn {
          position: absolute;
          right: 14px;
          font-size: 20px;
          color: var(--text-muted);
          line-height: 1;
        }

        .clear-search-btn:hover { color: var(--text-primary); }

        .category-filters-wrapper {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 2px;
          flex-shrink: 0;
        }

        .filter-btn {
          height: 40px;
          padding: 0 16px;
          border: 1.5px solid var(--border-color);
          border-radius: 3px;
          background-color: #ffffff;
          color: var(--text-secondary);
          transition: all var(--transition-speed) ease;
          flex-shrink: 0;
          font-size: 10px;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .filter-btn:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

        .filter-btn.active {
          background-color: var(--primary-dark-bg);
          border-color: var(--primary-dark-bg);
          color: #ffffff;
        }

        .count-label-section { padding: 16px 0; background: var(--page-bg); }

        .count-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.12em; }

        .products-grid-section { padding-bottom: 40px; }

        .empty-results-box {
          text-align: center;
          padding: 80px 20px;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-muted);
          font-size: 15px;
        }

        .absolute-badge { position: absolute; top: 0; left: 0; z-index: 10; }

        /* ── Auth Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(26,35,50,0.65);
          backdrop-filter: blur(5px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background-color: #ffffff;
          max-width: 400px;
          width: 100%;
          padding: 40px 36px;
          border-radius: 4px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          position: relative;
          text-align: center;
          border-top: 4px solid var(--accent-blue);
        }

        .modal-title { font-size: 26px; color: var(--text-primary); margin-bottom: 12px; }

        .modal-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.6; }

        .modal-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .modal-btn { height: 44px; font-size: 11px; letter-spacing: 0.1em; }

        .modal-close-btn {
          position: absolute;
          top: 14px; right: 16px;
          font-size: 22px;
          color: var(--text-muted);
          line-height: 1;
          transition: color var(--transition-speed) ease;
        }

        .modal-close-btn:hover { color: var(--text-primary); }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Collection;
