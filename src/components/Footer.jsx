import React from 'react';
import { useApp } from '../context/AppContext';

const Footer = () => {
  const { settings } = useApp();
  const rawNumber = settings?.whatsappNumber || '7358349394';
  const cleanNumber = rawNumber.replace(/\D/g, '');
  const displayVal = rawNumber.includes('+') ? rawNumber : `+91 ${rawNumber.slice(0, 5)} ${rawNumber.slice(5)}`;

  return (
    <footer className="footer-root">
      <div className="footer-container">
        
        {/* Top Segment */}
        <div className="footer-grid">
          
          {/* Column 1: Brand */}
          <div className="footer-col brand-col">
            <h3 className="footer-logo font-logo">DEVI TIMES</h3>
            <p className="footer-description font-body">
              Masterfully crafted, premium analog wall clocks designed to elevate every workspace and home.
            </p>
            <div style={{ marginTop: '16px' }}>
              <a href="https://www.instagram.com/namma_devitimes" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '8px', verticalAlign: 'middle' }}>@namma_devitimes</span>
              </a>
            </div>
          </div>

          {/* Column 2: Customer Services */}
          <div className="footer-col">
            <h4 className="footer-title">CUSTOMER SERVICES</h4>
            <ul className="footer-links-list">
              <li><a href="#/login">Client Sign In</a></li>
              <li><a href="#/cart">Shopping Cart</a></li>
            </ul>
          </div>

          {/* Column 3: Contact & Social */}
          <div className="footer-col contact-col">
            <h4 className="footer-title">CONTACT & SOCIAL</h4>
            <ul className="footer-links-list contact-links">
              <li>
                <span className="contact-label">Mobile Number</span>
                <a href="tel:+917418956115" className="contact-value">+917418956115</a>
              </li>

              <li>
                <span className="contact-label">Location</span>
                <span className="contact-value" style={{ color: '#9CA3AF' }}>Bus Stand, Kanchipuram - 631502</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Segment */}
        <div className="footer-bottom">
          <p className="copyright-text">
            © {new Date().getFullYear()} DEVI TIMES. All rights reserved.
          </p>
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
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 64px;
          margin-bottom: 48px;
          align-items: start;
        }

        .contact-links li {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-label {
          font-size: 9px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        .contact-value {
          font-size: 13px;
          color: #9CA3AF !important;
          transition: color var(--transition-speed);
          text-decoration: none;
        }

        .contact-value:hover {
          color: #ffffff !important;
        }

        .social-icon-link {
          display: inline-flex;
          align-items: center;
          color: #9CA3AF;
          transition: color var(--transition-speed);
          text-decoration: none;
        }

        .social-icon-link:hover {
          color: #ffffff;
        }

        @media (max-width: 991px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .brand-col {
            grid-column: span 2;
            max-width: 100%;
          }
          .footer-title {
            margin-top: 0;
          }
        }

        @media (max-width: 768px) {
          .footer-root {
            text-align: center;
            padding: 40px 16px 24px;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
          }
          .footer-container {
            padding: 0;
            width: 100%;
            box-sizing: border-box;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            justify-items: center;
            width: 100%;
          }
          .brand-col {
            grid-column: span 1;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-col {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer-links-list {
            align-items: center;
            width: 100%;
          }
          .contact-links li {
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
          }
          .social-icon-link {
            justify-content: center;
          }
        }

        .brand-col {
          max-width: 300px;
        }

        .footer-logo {
          color: #ffffff;
          font-size: 20px;
          letter-spacing: 0.15em;
          margin-top: 0;
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .footer-description {
          font-size: 13px;
          line-height: 1.6;
          color: #9CA3AF;
          margin: 0;
        }

        .footer-title {
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 8px; /* Visual baseline alignment with logo */
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .footer-links-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footer-links-list a {
          font-size: 12.5px;
          color: #9CA3AF;
          transition: color var(--transition-speed);
          text-decoration: none;
        }

        .footer-links-list a:hover {
          color: #ffffff;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 24px;
          margin-top: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 12px;
        }

        .copyright-text {
          color: #6B7280;
          margin: 0;
          letter-spacing: 0.02em;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
