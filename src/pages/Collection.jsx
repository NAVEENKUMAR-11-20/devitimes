import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ClockSvg from '../components/ClockSvg';
import { getProductImageUrl } from '../lib/productsService';

const Collection = () => {
  const { products: contextProducts, retailProducts: contextRetailProducts, currentUser, loginUser, logoutUser, addToCart } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isRetail = location.pathname === '/collection/retail';

  // Handle role-based redirects
  useEffect(() => {
    if (currentUser) {
      if (currentUser.isRetail && !isRetail) {
        navigate('/collection/retail', { replace: true });
      } else if (!currentUser.isRetail && isRetail) {
        navigate('/collection', { replace: true });
      }
    } else {
      if (isRetail) {
        navigate('/collection', { replace: true });
      }
    }
  }, [currentUser, isRetail, navigate]);

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

  const productsSource = isRetail ? contextRetailProducts : contextProducts;

  // Local state for auto-refreshing products
  const [liveProducts, setLiveProducts] = useState(Array.isArray(productsSource) ? productsSource : []);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Sync with context on load
  useEffect(() => {
    setLiveProducts(Array.isArray(productsSource) ? productsSource : []);
  }, [productsSource]);

  // Loading state timeout for first page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Success toast/feedback per product
  const [addedProductId, setAddedProductId] = useState(null);

  // Collection Protection Login States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleProtectedLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const response = await loginUser(loginUsername, loginPassword);
      if (response.success) {
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError(response.message);
      }
    } catch (err) {
      setLoginError('An unexpected error occurred. Please contact admin.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  // Filter products in real time (only keep live ones and filter by correct price field or product_type)
  const filteredProducts = useMemo(() => {
    return (liveProducts || []).filter((product) => {
      if (!product) return false;
      if (isRetail) {
        return !!product.isLive && ((product.product_type === 'retail' || product.product_type === 'RETAIL') || product.retailPrice > 0);
      }
      return !!product.isLive && ((product.product_type !== 'retail' && product.product_type !== 'RETAIL') || product.wholesalePrice > 0);
    });
  }, [liveProducts, isRetail]);

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
        <div className="container" style={{ position: 'relative' }}>
          <span className="uppercase-label" style={{color:'rgba(126,179,232,0.85)',display:'block',marginBottom:'10px'}}>DEVI TIMES</span>
          <h1 className="collection-title font-heading">{isRetail ? 'Retail Collection' : 'Our Collection'}</h1>
          <p className="collection-subtitle font-body">Discover our curated selection of premium handcrafted wall clocks</p>
        </div>
      </header>

      {!currentUser ? (
        <section className="collection-login-section animate-fade-in" style={{ padding: '60px 0', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="collection-login-card" style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
              borderRadius: '4px',
              padding: '40px 36px',
              width: '100%',
              maxWidth: '440px',
              boxSizing: 'border-box'
            }}>
              <h2 className="collection-login-title font-heading" style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
                Wholesale Portal Access
              </h2>
              <p className="collection-login-subtitle font-body" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px', textAlign: 'center', lineHeight: '1.5' }}>
                Please sign in with your User ID and Password to explore the Devi Times wholesale clocks collection.
              </p>

              <form onSubmit={handleProtectedLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loginError && (
                  <div className="auth-error-banner font-body" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FCA5A5',
                    color: '#DC2626',
                    padding: '12px 16px',
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {loginError}
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label uppercase-label" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Username / User ID</label>
                  <input 
                    type="text" 
                    id="col-userid"
                    className="form-input" 
                    placeholder="Enter your User ID"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    style={{
                      height: '44px',
                      padding: '0 14px',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '3px',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label uppercase-label" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Password</label>
                  <input 
                    type="password" 
                    id="col-password"
                    className="form-input" 
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{
                      height: '44px',
                      padding: '0 14px',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '3px',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                    required
                  />
                </div>

                <button type="submit" id="col-submit-btn" className="btn-primary collection-login-btn" style={{
                  height: '46px',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <div className="loading-spinner" style={{ 
                      width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', 
                      borderTop: '2px solid #ffffff', borderRadius: '50%', 
                      margin: '0 auto', animation: 'spin 0.6s linear infinite' 
                    }}></div>
                  ) : 'ACCESS COLLECTION'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                  Don't have an approved account? &nbsp;
                  <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>Register here →</Link>
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <>
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
                const isAdded = addedProductId === product.id;


                return (
                  <div key={product.id || Math.random()} className="card-product animate-fade-in">
                    
                    {/* Image Viewport */}
                    <div className="card-image-area">
                      {isSale && <span className="badge-sale absolute-badge">SALE</span>}
                      <img 
                        src={getProductDisplayImage(product)} 
                        alt={product?.name || 'Wall Clock'} 
                        onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* Product Details Section */}
                    <div className="card-text-area">
                      <div>
                        
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          MODEL NUMBER
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {product.modelNumber || 'N/A'}
                        </div>
                        
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {product.size}
                        </div>

                        {!isRetail && (
                          <div style={{ 
                            marginTop: '8px', 
                            fontSize: '12px', 
                            fontWeight: '700', 
                            color: product.stock <= 10 ? '#ef4444' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {product.stock <= 10 ? '⚠️' : '✓'} Stock: {product.stock !== undefined ? product.stock : 20}
                          </div>
                        )}
                      </div>

                      <div className="pricing-row" style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span className="price-bold" style={{ fontSize: '20px' }}>₹{product.salePrice}</span>
                        {product.originalPrice && (
                          <span className="price-strikethrough">₹{product.originalPrice}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="card-button-row" style={{ gridTemplateColumns: isRetail ? '1fr' : '1fr 1fr' }}>
                      <Link to={`/product/${product.id}`} className="btn-secondary btn-text" style={{ padding: '10px 0', fontSize: '11px' }}>
                        DETAILS
                      </Link>
                      {!isRetail && (
                        <button 
                          onClick={() => handleOrder(product)} 
                          className="btn-primary btn-text"
                          style={{ 
                            padding: '10px 0', 
                            fontSize: '11px',
                            backgroundColor: isAdded ? '#059669' : 'var(--button-primary-fill)' 
                          }}
                        >
                          {isAdded ? '✓ ADDED' : 'ORDER'}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
        </>
      )}

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

export default Collection;
