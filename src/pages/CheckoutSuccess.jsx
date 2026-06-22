import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [accordionOpen, setAccordionOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('lumiere_last_order');
    if (saved) {
      setOrder(JSON.parse(saved));
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!order) {
    return null;
  }

  return (
    <div className="success-page-root">

      {/* Navy top accent strip */}
      <div className="success-accent-strip">
        <div className="container" style={{textAlign:'center'}}>
          <span className="uppercase-label" style={{color:'rgba(126,179,232,0.85)', letterSpacing:'0.2em'}}>DEVI TIMES</span>
        </div>
      </div>

      <div className="container success-container animate-fade-in">
        
        {/* Animated Checkmark Badge */}
        <div className="checkmark-wrapper">
          <svg className="checkmark-svg" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h1 className="success-title font-heading">Order Sent!</h1>
        <p className="success-message font-body">
          Your order details have been sent to us via WhatsApp.
        </p>
        <p className="success-submessage font-body">
          We will review your request and confirm your order shortly.
        </p>

        {/* Order Details Accordion */}
        <div className="order-summary-accordion">
          
          <button 
            className="accordion-header-btn font-body"
            onClick={() => setAccordionOpen(!accordionOpen)}
          >
            <span>VIEW ORDER SUMMARY</span>
            <svg 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{transition:'transform 0.2s ease', transform: accordionOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {accordionOpen && (
            <div className="accordion-content font-body animate-fade-in">
              
              <div className="receipt-meta-box">
                <div>
                  <span style={{color:'var(--text-muted)',fontSize:'10px',fontWeight:'600',letterSpacing:'0.1em',textTransform:'uppercase'}}>Order ID</span>
                  <div style={{fontWeight:'700',color:'var(--text-primary)',marginTop:'2px'}}>{order.id || 'N/A'}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <span style={{color:'var(--text-muted)',fontSize:'10px',fontWeight:'600',letterSpacing:'0.1em',textTransform:'uppercase'}}>User ID</span>
                  <div style={{fontWeight:'700',color:'var(--text-primary)',marginTop:'2px'}}>{order.customer.userId}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{color:'var(--text-muted)',fontSize:'10px',fontWeight:'600',letterSpacing:'0.1em',textTransform:'uppercase'}}>Ordered At</span>
                  <div style={{color:'var(--text-secondary)',marginTop:'2px'}}>{order.timestamp}</div>
                </div>
              </div>

              {/* Items list */}
              <div className="receipt-items-list">
                {order.items.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <div className="receipt-item-info">
                      <div className="receipt-item-name font-heading">{item.productName}</div>
                      <div className="receipt-item-meta">
                        Model: {item.modelNumber} &nbsp;·&nbsp; {item.category} &nbsp;·&nbsp; {item.size}
                      </div>
                    </div>
                    <div className="receipt-item-qty-price">
                      {item.quantity} × ₹{item.unitPrice} = <strong style={{color:'var(--text-primary)'}}>₹{item.unitPrice * item.quantity}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="receipt-total-row">
                <span>Grand Total</span>
                <span className="total-highlight">₹{order.grandTotal}</span>
              </div>

            </div>
          )}

        </div>

        {/* Action buttons */}
        <div className="success-actions-row">
          <Link to="/collection" className="btn-primary success-btn">
            Continue Shopping &nbsp; →
          </Link>
          <Link to="/" className="btn-secondary success-btn">
            ← Back to Home
          </Link>
        </div>

      </div>

      <style>{`
        .success-page-root {
          background-color: var(--page-bg);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 80px;
        }

        .success-accent-strip {
          width: 100%;
          background: linear-gradient(135deg, #1A2332 0%, #243044 100%);
          padding: 16px 0;
        }

        .success-container {
          max-width: 560px !important;
          background-color: #ffffff;
          padding: 56px 40px;
          border-radius: 4px;
          box-shadow: 0 4px 20px rgba(26,35,50,0.08);
          border: 1px solid var(--border-color);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: -1px;
          border-top: 4px solid var(--accent-blue);
        }

        @media (max-width: 480px) {
          .success-container { padding: 40px 20px; }
        }

        /* Checkmark animations */
        .checkmark-wrapper {
          width: 72px;
          height: 72px;
          margin-bottom: 28px;
        }

        .checkmark-svg {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: block;
          stroke-width: 2;
          stroke: #059669;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #059669;
          animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
        }

        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #059669;
          fill: none;
          animation: stroke .6s cubic-bezier(.65,0,.45,1) forwards;
        }

        .checkmark-check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke: #059669;
          animation: stroke .3s cubic-bezier(.65,0,.45,1) .8s forwards;
        }

        @keyframes stroke {
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fill {
          100% { box-shadow: inset 0px 0px 0px 36px #D1FAE5; }
        }
        @keyframes scale {
          0%, 100% { transform: none; }
          50% { transform: scale3d(1.1, 1.1, 1); }
        }

        .success-title {
          font-size: 34px;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .success-message {
          font-size: 16px;
          color: var(--text-secondary);
          font-weight: 500;
          line-height: 1.5;
        }

        .success-submessage {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 6px;
          margin-bottom: 36px;
        }

        /* Accordion */
        .order-summary-accordion {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          margin-bottom: 32px;
          overflow: hidden;
        }

        .accordion-header-btn {
          width: 100%;
          padding: 16px 20px;
          background-color: #F8FAFC;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--text-primary);
          transition: background-color 120ms ease;
        }

        .accordion-header-btn:hover {
          background-color: #F0F4F9;
        }

        .accordion-content {
          padding: 24px 20px;
          text-align: left;
          background-color: #ffffff;
          border-top: 1px solid var(--border-color);
        }

        .receipt-meta-box {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          border-bottom: 1px dashed var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }

        .receipt-items-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .receipt-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 8px 0;
          border-bottom: 1px solid #F0F4F9;
        }

        .receipt-item-row:last-child {
          border-bottom: none;
        }

        .receipt-item-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .receipt-item-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .receipt-item-qty-price {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: right;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .receipt-total-row {
          border-top: 2px solid var(--primary-dark-bg);
          padding-top: 16px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
          font-weight: bold;
          color: var(--text-primary);
        }

        .total-highlight {
          color: var(--accent-blue);
          font-size: 20px;
          font-weight: 800;
        }

        /* Actions */
        .success-actions-row {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .success-btn {
          flex: 1;
          height: 48px;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        @media (max-width: 480px) {
          .success-actions-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default CheckoutSuccess;
