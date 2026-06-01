import React from 'react';

const Footer = () => {
  return (
    <footer className="footer-root">
      <div className="footer-container">
        
        {/* Top Segment */}
        <div className="footer-grid">
          
          {/* Column 1: Brand Info */}
          <div className="footer-col brand-col">
            <h3 className="footer-logo font-logo">DEVI TIMES</h3>
            <p className="footer-description font-body">
              Masterfully crafted, premium analog wall clocks designed to elevate every workspace and home.
            </p>
          </div>

          {/* Column 2: Collections links */}
          <div className="footer-col">
            <h4 className="footer-title">COLLECTIONS</h4>
            <ul className="footer-links-list">
              <li><a href="#/collection">Modern Minimalist</a></li>
              <li><a href="#/collection">Contemporary</a></li>
              <li><a href="#/collection">Luxury Vintage</a></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="footer-col">
            <h4 className="footer-title">CUSTOMER SERVICES</h4>
            <ul className="footer-links-list">
              <li><a href="#/register">Request User Credentials</a></li>
              <li><a href="#/login">Client Sign In</a></li>
              <li><a href="#/cart">Shopping Cart</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Segment */}
        <div className="footer-bottom">
          <p className="copyright-text">
            © {new Date().getFullYear()} DEVI TIMES. All rights reserved.
          </p>
          <div className="footer-legal-links">
            <a href="#/">Privacy Policy</a>
            <span className="dot-divider">•</span>
            <a href="#/">Terms of Service</a>
          </div>
        </div>

      </div>

      <style>{`
        .footer-root {
          background-color: #141D2B; /* Deep navy — consistent with theme */
          color: var(--text-muted);
          padding: 64px 0 28px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: auto; /* Push to bottom of layout */
        }

        .footer-container {
          max-width: var(--max-content-width);
          margin: 0 auto;
          padding: 0 24px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }

        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        .brand-col {
          max-width: 320px;
        }

        .footer-logo {
          color: #ffffff;
          font-size: 20px;
          letter-spacing: 0.2em;
          margin-bottom: 16px;
        }

        .footer-description {
          font-size: 13px;
          line-height: 1.6;
          color: #9CA3AF;
        }

        .footer-title {
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .footer-links-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-links-list a {
          font-size: 12px;
          color: #9CA3AF;
          transition: color var(--transition-speed);
        }

        .footer-links-list a:hover {
          color: #ffffff;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .footer-bottom {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }

        .copyright-text {
          color: #6B7280;
        }

        .footer-legal-links {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6B7280;
        }

        .footer-legal-links a:hover {
          color: #ffffff;
        }

        .dot-divider {
          color: rgba(255,255,255,0.1);
        }
      `}</style>
    </footer>
  );
};

export default Footer;
