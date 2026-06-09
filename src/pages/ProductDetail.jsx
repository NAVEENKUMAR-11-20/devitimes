import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ClockSvg from '../components/ClockSvg';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, currentUser, addToCart } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const product = products.find(p => p.id === id);

  useEffect(() => {
    setQuantity(1);
    setActiveImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (product) {
      console.log('[DEBUG] Product Details loaded:', product);
    }
  }, [product]);

  if (!product || !product.isLive) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--page-bg)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 className="font-heading" style={{fontSize:'28px', color:'var(--text-primary)', marginBottom:'12px'}}>Product Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom:'28px' }}>The product you are trying to view does not exist or has been removed.</p>
        <Link to="/collection" className="btn-primary" style={{height:'46px',padding:'0 28px',fontSize:'12px'}}>Back to Collection</Link>
      </div>
    );
  }

  const decrementQty = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const incrementQty = () => {
    setQuantity(prev => prev + 1);
  };

  const handleAddToCart = () => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      addToCart(product, quantity);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    }
  };

  const imagesList = product.images || [];

  return (
    <div className="detail-root">

      {/* Navy breadcrumb strip */}
      <div className="detail-breadcrumb-strip">
        <div className="container">
          <Link to="/collection" className="breadcrumb-link font-body">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Collection
          </Link>
          <span className="breadcrumb-separator">|</span>
          <span className="breadcrumb-current font-body">{product.name}</span>
        </div>
      </div>

      {/* 2-Column Product Layout */}
      <div className="container detail-content-wrapper animate-fade-in">
        <div className="detail-grid">
          
          {/* Left Column: Image */}
          <div className="detail-left-col">
            <div className="main-viewport-container">
              {product.isOnSale && <span className="badge-sale absolute-badge">SALE</span>}
              <div className="zoom-image-wrapper">
                {imagesList.length > 0 ? (
                  <img src={imagesList[activeImageIndex]} alt={product.name} className="viewport-img"/>
                ) : (
                  <ClockSvg model={product.modelNumber} category={product.category} color={product.color} size={300} />
                )}
              </div>
            </div>

            {imagesList.length > 1 && (
              <div className="thumbnails-row">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${idx === activeImageIndex ? 'active-thumb' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={img} alt={`${product.name} View ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="detail-right-col">
            
            {/* Spec rows */}
            <div className="detail-specs-card">
              <div className="detail-spec-row">
                <span className="detail-spec-label">MODEL NUMBER</span>
                <span className="detail-spec-value font-body">{product.modelNumber}</span>
              </div>
              <div className="detail-spec-row" style={{borderBottom:'none'}}>
                <span className="detail-spec-label">DIMENSIONS</span>
                <span className="detail-spec-value font-body">{product.size}</span>
              </div>
            </div>

            {/* Price section */}
            <div className="detail-price-panel">
              <span className="price-bold" style={{ fontSize: '28px' }}>₹{product.salePrice}</span>
              {product.originalPrice && (
                <span className="price-strikethrough" style={{ fontSize: '18px', marginLeft: '12px' }}>
                  ₹{product.originalPrice}
                </span>
              )}
              {product.isOnSale && product.originalPrice && (
                <span className="discount-badge">
                  {Math.round((1 - product.salePrice / product.originalPrice) * 100)}% OFF
                </span>
              )}
            </div>

            {/* Actions — always shown */}
            <div className="detail-actions-block">
              <div className="qty-picker-container">
                <span className="detail-spec-label" style={{ marginBottom: '8px' }}>QUANTITY</span>
                <div className="stepper-controls">
                  <button onClick={decrementQty} className="stepper-btn" disabled={quantity <= 1}>−</button>
                  <span className="stepper-value font-body">{quantity}</span>
                  <button onClick={incrementQty} className="stepper-btn">+</button>
                </div>
              </div>

              <button 
                onClick={handleAddToCart}
                className="btn-primary full-width-btn"
                style={{ 
                  height: '50px', 
                  fontSize: '13px', 
                  letterSpacing: '0.12em',
                  backgroundColor: addedFeedback ? '#059669' : 'var(--button-primary-fill)'
                }}
              >
                {addedFeedback ? '✓ ADDED TO CART' : 'ADD TO CART'}
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <Link to="/collection" className="continue-link font-body">
                ← CONTINUE SHOPPING
              </Link>
            </div>

          </div>

        </div>

        {/* Product Description */}
        {product.description && (
          <div className="detail-description-section animate-fade-in">
            <h3 className="description-title font-heading">About This Timepiece</h3>
            <p className="description-content font-body">{product.description}</p>
          </div>
        )}

      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in">
            <h3 className="modal-title font-heading">Sign In Required</h3>
            <p className="modal-desc font-body">Please sign in to your DEVI TIMES account to add items to your cart.</p>
            
            <div className="modal-actions-row" style={{ display: 'block' }}>
              <button onClick={() => { setShowAuthModal(false); navigate('/login'); }} className="btn-primary modal-btn" style={{ width: '100%' }}>Sign In</button>
            </div>
            
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)} aria-label="Close Modal">&times;</button>
          </div>
        </div>
      )}

      <style>{`
        .detail-root {
          background-color: #ffffff;
          min-height: calc(100vh - var(--navbar-height));
        }

        /* ── Navy Breadcrumb Strip ── */
        .detail-breadcrumb-strip {
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 16px 0;
        }

        .detail-breadcrumb-strip .container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .breadcrumb-link {
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          color: rgba(200,216,238,0.7);
          font-weight: 500;
          transition: color var(--transition-speed) ease;
        }

        .breadcrumb-link:hover { color: #ffffff; }

        .breadcrumb-separator {
          color: rgba(200,216,238,0.3);
          font-size: 12px;
        }

        .breadcrumb-current {
          font-size: 13px;
          color: rgba(200,216,238,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }

        .detail-content-wrapper {
          padding: 40px 24px 80px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 50% 50%;
          gap: 48px;
        }

        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        .detail-left-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .main-viewport-container {
          aspect-ratio: 1/1;
          background: linear-gradient(145deg, #F0F4F9 0%, #E8EEF6 100%);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .absolute-badge { position: absolute; top: 0; left: 0; z-index: 10; }

        .zoom-image-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .viewport-img {
          max-width: 85%;
          max-height: 85%;
          object-fit: contain;
          transition: transform 0.4s ease;
        }

        .zoom-image-wrapper:hover .viewport-img {
          transform: scale(1.12);
        }

        .thumbnails-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .thumb-btn {
          width: 56px;
          height: 56px;
          border-radius: 3px;
          border: 1.5px solid var(--border-color);
          overflow: hidden;
          background: #F0F4F9;
          padding: 2px;
          flex-shrink: 0;
          transition: border-color var(--transition-speed) ease;
        }

        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .active-thumb {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 2px rgba(45,93,161,0.18);
        }

        .detail-right-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .detail-title {
          font-size: 32px;
          color: var(--text-primary);
          margin: 6px 0 24px;
          font-weight: 700;
          line-height: 1.2;
        }

        .detail-specs-card {
          background: #F8FAFC;
          border: 1px solid var(--border-color);
          border-radius: 3px;
          padding: 4px 20px;
          margin-bottom: 24px;
        }

        .detail-spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
        }

        .detail-spec-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .detail-spec-value {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
        }

        .detail-price-panel {
          padding: 0 0 24px;
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
        }

        .discount-badge {
          font-size: 11px;
          font-weight: 700;
          color: #059669;
          background: #D1FAE5;
          padding: 3px 8px;
          border-radius: 2px;
          letter-spacing: 0.04em;
        }

        .detail-actions-block {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .qty-picker-container {
          display: flex;
          flex-direction: column;
        }

        .stepper-controls {
          display: inline-flex;
          align-items: center;
          border: 1.5px solid var(--border-color);
          border-radius: 3px;
          width: 120px;
          height: 42px;
          justify-content: space-between;
          padding: 0 6px;
        }

        .stepper-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: background-color 120ms ease, color 120ms ease;
          border-radius: 2px;
        }

        .stepper-btn:hover:not(:disabled) {
          background-color: var(--page-bg);
          color: var(--accent-blue);
        }

        .stepper-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        .stepper-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .full-width-btn {
          width: 100%;
        }

        .sold-out-banner {
          display: flex;
          align-items: center;
          background-color: #FEF2F2;
          color: #DC2626;
          padding: 16px 20px;
          border: 1px solid #FCA5A5;
          border-radius: 3px;
          font-size: 14px;
        }

        .continue-link {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          transition: color var(--transition-speed) ease;
        }

        .continue-link:hover { color: var(--accent-blue); }

        .detail-description-section {
          margin-top: 56px;
          border-top: 1px solid var(--border-color);
          padding-top: 36px;
        }

        .description-title {
          font-size: 22px;
          color: var(--text-primary);
          margin-bottom: 14px;
        }

        .description-content {
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-secondary);
          max-width: 800px;
        }

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
      `}</style>
    </div>
  );
};

export default ProductDetail;
