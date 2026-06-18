import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ClockSvg from '../components/ClockSvg';
import { getProductImageUrl, fetchRetailProducts } from '../lib/productsService';

const RetailCatalog = () => {
  const { currentRetailUser, logoutRetailUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentRetailUser) {
      navigate('/retail-login', { replace: true });
    }
  }, [currentRetailUser, navigate]);

  const getProductDisplayImage = (product) => {
    if (product?.images && product.images.length > 0) {
      return product.images[0];
    }
    const imageUrl = getProductImageUrl(product);
    if (imageUrl && !imageUrl.toLowerCase().split('?')[0].endsWith('.json')) {
      return imageUrl;
    }
    return "/placeholder.svg";
  };

  const [liveProducts, setLiveProducts] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch directly from retail_products
  useEffect(() => {
    const loadRetailProducts = async () => {
      const data = await fetchRetailProducts();
      setLiveProducts(data);
      setIsInitialLoad(false);
    };
    loadRetailProducts();
  }, []);

  // Filter products (they are all retail natively)
  const filteredProducts = useMemo(() => {
    return (liveProducts || []).filter((product) => !!product.isLive);
  }, [liveProducts]);

  const handleLogout = () => {
    logoutRetailUser();
    navigate('/retail-login');
  };

  return (
    <div className="collection-root">
      
      {/* 1. Page Header */}
      <header className="collection-header animate-fade-in">
        <div className="container" style={{ position: 'relative' }}>
          <span className="uppercase-label" style={{color:'rgba(126,179,232,0.85)',display:'block',marginBottom:'10px'}}>DEVI TIMES</span>
          <h1 className="collection-title font-heading">Retail Collection</h1>
          <p className="collection-subtitle font-body">Explore our exclusive retail catalog</p>
        </div>
      </header>
      
      

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
              <p>No products available in the collection.</p>
            </div>
          ) : (
            <div className="grid-products">
              {(Array.isArray(filteredProducts) ? filteredProducts : []).map((product) => {
                if (!product) return null;
                const isSale = product.isOnSale;


                return (
                  <div key={product.id || Math.random()} className="card-product animate-fade-in">
                    
                    {/* Image Viewport */}
                    <div className="card-image-area">
                      {isSale && <span className="badge-sale absolute-badge">SALE</span>}
                      <img 
                        src={getProductDisplayImage(product)} 
                        alt={product?.name || 'Wall Clock'} 
                        onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }}
                      />
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
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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

        /* ── Unified Control Panel Removed ── */

        .products-grid-section { padding: 48px 0 40px 0; }

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

export default RetailCatalog;
