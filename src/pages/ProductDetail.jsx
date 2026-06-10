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

      {/* Premium Breadcrumb Strip */}
      <div className="detail-breadcrumb-strip">
        <div className="container">
          <Link to="/" className="breadcrumb-link font-body">Home</Link>
          <span className="breadcrumb-separator">&gt;</span>
          <Link to="/collection" className="breadcrumb-link font-body">Collection</Link>
          <span className="breadcrumb-separator">&gt;</span>
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
            <h1 className="detail-title font-heading">{product.name}</h1>
            
            {/* Premium Specifications Card */}
            <div className="detail-specs-card">
              <div className="detail-spec-row">
                <div className="spec-label-group">
                  <svg className="spec-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  <span className="detail-spec-label">MODEL NUMBER</span>
                </div>
                <span className="detail-spec-value font-body">{product.modelNumber}</span>
              </div>
              <div className="detail-spec-row" style={{borderBottom:'none'}}>
                <div className="spec-label-group">
                  <svg className="spec-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect>
                    <line x1="6" y1="7" x2="6" y2="12"></line>
                    <line x1="10" y1="7" x2="10" y2="12"></line>
                    <line x1="14" y1="7" x2="14" y2="12"></line>
                    <line x1="18" y1="7" x2="18" y2="12"></line>
                  </svg>
                  <span className="detail-spec-label">DIMENSIONS</span>
                </div>
                <span className="detail-spec-value font-body">{product.size}</span>
              </div>
            </div>

            {/* Price Section */}
            <div className="detail-price-panel">
              <span className="wholesale-label font-body">WHOLESALE PRICE</span>
              <div className="price-row">
                <span className="price-bold" style={{ fontSize: '34px' }}>₹{product.salePrice}</span>
                {product.originalPrice && (
                  <span className="price-strikethrough" style={{ fontSize: '20px', marginLeft: '12px' }}>
                    ₹{product.originalPrice}
                  </span>
                )}
                {product.isOnSale && product.originalPrice && (
                  <span className="discount-badge">
                    {Math.round((1 - product.salePrice / product.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Actions Block */}
            <div className="detail-actions-block">
              <div className="qty-picker-container">
                <span className="qty-label-text font-body">QUANTITY</span>
                <div className="stepper-controls">
                  <button onClick={decrementQty} className="stepper-btn" disabled={quantity <= 1}>−</button>
                  <span className="stepper-value font-body">{quantity}</span>
                  <button onClick={incrementQty} className="stepper-btn">+</button>
                </div>
              </div>

              <button 
                onClick={handleAddToCart}
                className="btn-primary full-width-btn premium-cart-btn"
                style={{ 
                  height: '52px', 
                  fontSize: '12px', 
                  letterSpacing: '0.14em',
                  background: addedFeedback 
                    ? '#059669' 
                    : 'linear-gradient(135deg, #1A2332 0%, #2D5DA1 100%)',
                  border: 'none'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'10px', verticalAlign:'middle'}}>
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span style={{verticalAlign:'middle'}}>{addedFeedback ? '✓ ADDED TO CART' : 'ADD TO CART'}</span>
              </button>
            </div>

            {/* Trust Section */}
            <div className="detail-trust-grid font-body">
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span className="trust-text">Wholesale Orders Only</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span className="trust-text">Direct Supplier Pricing</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span className="trust-text">Secure Ordering Process</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span className="trust-text">Quality Assured Products</span>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
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
          background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
          min-height: calc(100vh - var(--navbar-height));
          padding-bottom: 80px;
        }

        /* ── Premium Breadcrumb Strip ── */
        .detail-breadcrumb-strip {
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 14px 0;
          border-bottom: 2px solid #D4AF37; /* subtle gold bottom accent */
        }

        .detail-breadcrumb-strip .container {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .breadcrumb-link {
          font-size: 12px;
          color: rgba(200, 216, 238, 0.7);
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .breadcrumb-link:hover {
          color: #D4AF37; /* hover gold */
        }

        .breadcrumb-separator {
          color: rgba(200, 216, 238, 0.4);
          font-size: 11px;
          user-select: none;
        }

        .breadcrumb-current {
          font-size: 12px;
          color: #ffffff;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .detail-content-wrapper {
          padding: 56px 24px 80px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: start;
        }

        @media (max-width: 868px) {
          .detail-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .detail-content-wrapper {
            padding: 32px 16px 56px;
          }
        }

        .detail-left-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .main-viewport-container {
          aspect-ratio: 1/1;
          background: #ffffff;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 30px rgba(26, 35, 50, 0.04);
          transition: box-shadow 0.3s ease;
        }

        .main-viewport-container:hover {
          box-shadow: 0 15px 45px rgba(26, 35, 50, 0.08);
        }

        .absolute-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 10;
          border-radius: 2px;
          padding: 4px 10px;
          font-size: 10px;
          background-color: #D4AF37; /* gold sale badge */
        }

        .zoom-image-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .viewport-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .zoom-image-wrapper:hover .viewport-img {
          transform: scale(1.08);
        }

        .thumbnails-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 10px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .thumbnails-row::-webkit-scrollbar {
          height: 4px;
        }
        .thumbnails-row::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 2px;
        }
        .thumbnails-row::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 2px;
        }
        .thumbnails-row::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }

        .thumb-btn {
          width: 70px;
          height: 70px;
          border-radius: 6px;
          border: 1.5px solid var(--border-color);
          overflow: hidden;
          background: #ffffff;
          padding: 4px;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .thumb-btn:hover {
          border-color: #2D5DA1;
          transform: translateY(-2px);
        }

        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .active-thumb {
          border-color: #1A2332 !important; /* navy blue active border */
          box-shadow: 0 0 0 2px rgba(26, 35, 50, 0.15);
          transform: translateY(-2px);
        }

        .detail-right-col {
          display: flex;
          flex-direction: column;
        }

        .detail-title {
          font-size: 28px;
          color: var(--text-primary);
          margin-bottom: 20px;
          font-weight: 700;
          line-height: 1.25;
        }

        /* ── Premium Specs Card ── */
        .detail-specs-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(26, 35, 50, 0.02);
        }

        .detail-spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13px;
        }

        .spec-label-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spec-svg-icon {
          color: #2D5DA1;
        }

        .detail-spec-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
        }

        .detail-spec-value {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
        }


        /* ── Price Section with dividers ── */
        .detail-price-panel {
          padding: 20px 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .wholesale-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #2D5DA1;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 12px;
        }

        .discount-badge {
          font-size: 11px;
          font-weight: 700;
          color: #059669;
          background: #D1FAE5;
          padding: 4px 8px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }

        /* ── Actions & Stepper ── */
        .detail-actions-block {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 24px;
        }

        .qty-picker-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .qty-label-text {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--text-muted);
        }

        .stepper-controls {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          justify-content: flex-start;
        }

        .stepper-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: #1A2332;
          background-color: #ffffff;
          border: 1.5px solid var(--border-color);
          border-radius: 50%;
          transition: all 0.2s ease;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }

        .stepper-btn:hover:not(:disabled) {
          background-color: #1A2332;
          color: #ffffff;
          border-color: #1A2332;
          transform: scale(1.05);
        }

        .stepper-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .stepper-value {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 20px;
          text-align: center;
        }

        /* ── Premium Add to Cart Button ── */
        .premium-cart-btn {
          border-radius: 6px;
          box-shadow: 0 4px 15px rgba(26, 35, 50, 0.15);
          transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.25s ease, opacity 0.25s ease;
        }

        .premium-cart-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(26, 35, 50, 0.25);
        }

        .premium-cart-btn:active {
          transform: translateY(-1px);
        }

        /* ── Trust Grid ── */
        .detail-trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
          padding-top: 20px;
          border-top: 1px dashed var(--border-color);
        }

        @media (max-width: 480px) {
          .detail-trust-grid {
            grid-template-columns: 1fr;
          }
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trust-icon {
          color: #D4AF37; /* gold check icon */
          font-weight: bold;
          font-size: 14px;
        }

        .trust-text {
          font-size: 12.5px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .continue-link {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .continue-link:hover {
          color: #D4AF37;
        }

        /* About / Description section */
        .detail-description-section {
          margin-top: 64px;
          border-top: 1px solid var(--border-color);
          padding-top: 40px;
        }

        .description-title {
          font-size: 20px;
          color: #1A2332;
          margin-bottom: 16px;
          font-weight: 700;
        }

        .description-content {
          font-size: 14.5px;
          line-height: 1.8;
          color: var(--text-secondary);
          max-width: 900px;
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
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          position: relative;
          text-align: center;
          border-top: 4px solid #1A2332;
        }

        .modal-title {
          font-size: 24px;
          color: #1A2332;
          margin-bottom: 12px;
          font-weight: 700;
        }
        
        .modal-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 28px;
          line-height: 1.6;
        }

        .modal-btn {
          height: 46px;
          font-size: 11px;
          letter-spacing: 0.1em;
          border-radius: 4px;
        }

        .modal-close-btn {
          position: absolute;
          top: 14px;
          right: 16px;
          font-size: 22px;
          color: var(--text-muted);
          line-height: 1;
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;
