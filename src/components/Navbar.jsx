import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { currentUser, logoutUser, cart, currentRetailUser, logoutRetailUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleRetailLogout = () => {
    logoutRetailUser();
    navigate('/retail-login');
  };


  return (
    <nav className="navbar-root">
      <div className="navbar-container">
        
        {/* Left Side: Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo.png" alt="DEVI TIMES Logo" className="logo-img" />
          <span className="logo-text font-logo">DEVI TIMES</span>
        </Link>

        {/* Center: Navigation Links (Desktop) */}
        <div className="nav-center-links">
          <Link 
            to="/" 
            className={`nav-link-item ${location.pathname === '/' ? 'active-link' : ''}`}
          >
            HOME
          </Link>
          {currentRetailUser ? (
            <Link 
              to="/retail-catalog" 
              className={`nav-link-item ${location.pathname === '/retail-catalog' ? 'active-link' : ''}`}
            >
              RETAIL CATALOG
            </Link>
          ) : (
            <Link 
              to="/collection" 
              className={`nav-link-item ${(location.pathname === '/collection' || location.pathname === '/collection/retail') ? 'active-link' : ''}`}
            >
              COLLECTION
            </Link>
          )}
        </div>

        {/* Right Side: Actions (User Session, Search, Cart, Hamburger) */}
        <div className="nav-right-actions">
          
          {/* User Session status */}
          <div className="nav-user-section">
            {currentRetailUser ? (
              <div className="user-session-pill">
                <span className="user-session-name" style={{ color: '#FCD34D' }}>Retail</span>
                <button onClick={handleRetailLogout} className="logout-nav-btn" style={{ borderLeftColor: 'rgba(252, 211, 77, 0.3)', color: '#FCA5A5' }}>
                  RETAIL LOGOUT
                </button>
              </div>
            ) : currentUser ? (
              <div className="user-session-pill">
                <span className="user-session-name">Hi, {currentUser.name.split(' ')[0]}</span>
                <button onClick={handleLogout} className="logout-nav-btn">
                  LOGOUT
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className={`nav-link-item ${location.pathname === '/login' || location.pathname === '/register' ? 'active-link' : ''}`}
              >
                SIGN IN
              </Link>
            )}
          </div>

          {/* Subtle Vertical Divider */}
          <span className="nav-divider"></span>

          {/* Search & Cart Icons */}
          <div className="nav-icons-group">
            {/* Cart Icon & Count Badge (Hidden for retail users) */}
            {!currentRetailUser && (
              <Link 
                to="/cart" 
                className={`nav-icon-link cart-icon-btn ${location.pathname === '/cart' ? 'active-link' : ''}`}
                aria-label="Shopping Cart"
              >
                <div className="cart-badge-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  {cartCount > 0 && (
                    <span className="cart-badge-count">{cartCount}</span>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button 
            className="mobile-hamburger" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <span className={`bar ${mobileMenuOpen ? 'change' : ''}`}></span>
            <span className={`bar ${mobileMenuOpen ? 'change' : ''}`}></span>
            <span className={`bar ${mobileMenuOpen ? 'change' : ''}`}></span>
          </button>

        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-nav-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Navigation Menu */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-drawer-links">
          <Link 
            to="/" 
            className={`mobile-nav-link-item ${location.pathname === '/' ? 'active-link' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            HOME
          </Link>
          {currentRetailUser ? (
            <Link 
              to="/retail-catalog" 
              className={`mobile-nav-link-item ${location.pathname === '/retail-catalog' ? 'active-link' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              RETAIL CATALOG
            </Link>
          ) : (
            <Link 
              to="/collection" 
              className={`mobile-nav-link-item ${(location.pathname === '/collection' || location.pathname === '/collection/retail') ? 'active-link' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              COLLECTION
            </Link>
          )}
          
          {currentRetailUser ? (
            <div className="mobile-user-session">
              <span className="mobile-user-name" style={{ color: '#FCD34D' }}>Retail</span>
              <button 
                onClick={() => { handleRetailLogout(); setMobileMenuOpen(false); }} 
                className="logout-nav-btn"
                style={{ borderLeftColor: 'rgba(252, 211, 77, 0.3)', color: '#FCA5A5' }}
              >
                RETAIL LOGOUT
              </button>
            </div>
          ) : currentUser ? (
            <div className="mobile-user-session">
              <span className="mobile-user-name">Hi, {currentUser.name.split(' ')[0]}</span>
              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }} 
                className="logout-nav-btn"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className={`mobile-nav-link-item ${location.pathname === '/login' || location.pathname === '/register' ? 'active-link' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>

      {/* Styles local to Navbar rendering, configured with root design theme */}
      <style>{`
        .navbar-root {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background-color: var(--primary-dark-bg);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          height: 64px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
          color: #ffffff;
        }

        .navbar-container {
          max-width: var(--max-content-width);
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          height: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: inherit;
          flex-shrink: 0;
        }

        .logo-img {
          height: 44px;
          width: auto;
          object-fit: contain;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .nav-center-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .nav-right-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-user-section {
          display: flex;
          align-items: center;
        }

        .nav-divider {
          width: 1px;
          height: 18px;
          background-color: rgba(255, 255, 255, 0.15);
        }

        .nav-icons-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-link-item {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: inherit;
          position: relative;
          padding: 8px 12px;
          transition: color 0.25s ease, opacity 0.25s ease, transform 0.25s ease;
          display: inline-flex;
          align-items: center;
        }

        .nav-link-item::after {
          content: '';
          position: absolute;
          bottom: 0px;
          left: 12px;
          right: 12px;
          height: 2px;
          background-color: currentColor;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-item:hover {
          opacity: 1;
        }

        .nav-link-item:hover::after {
          transform: scaleX(1);
        }

        .active-link {
          color: var(--text-accent-on-dark) !important;
        }

        .active-link::after {
          transform: scaleX(1) !important;
          background-color: var(--text-accent-on-dark);
        }

        .nav-icon-link {
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          transition: background-color 0.25s ease, transform 0.25s ease;
        }

        .nav-icon-link:hover {
          background-color: rgba(255, 255, 255, 0.08);
          transform: scale(1.05);
        }

        .cart-badge-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cart-badge-count {
          position: absolute;
          top: -8px;
          right: -8px;
          background-color: var(--text-accent-on-dark);
          color: var(--primary-dark-bg);
          font-size: 9px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 1px solid var(--primary-dark-bg);
          box-sizing: border-box;
        }

        .user-session-pill {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-session-name {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-sub-on-dark);
        }

        .logout-nav-btn {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ef4444;
          padding: 4px 8px;
          border: 1px solid #ef4444;
          border-radius: 2px;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          height: 24px;
          transition: all 0.2s ease;
        }

        .logout-nav-btn:hover {
          background-color: #ef4444;
          color: white;
        }

        .mobile-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          z-index: 1001;
          color: inherit;
          padding: 6px;
          cursor: pointer;
        }

        .mobile-hamburger .bar {
          width: 22px;
          height: 2px;
          background-color: currentColor;
          transition: 0.3s;
        }

        /* Hamburger Animation */
        .mobile-hamburger .bar.change:nth-child(1) {
          transform: translateY(7px) rotate(-45deg);
        }
        .mobile-hamburger .bar.change:nth-child(2) {
          opacity: 0;
        }
        .mobile-hamburger .bar.change:nth-child(3) {
          transform: translateY(-7px) rotate(45deg);
        }

        .mobile-nav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 998;
        }

        .mobile-nav-drawer {
          position: fixed;
          top: 0;
          right: -100%;
          height: 100vh;
          width: 280px;
          background-color: var(--primary-dark-bg);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          padding: 80px 24px 24px 24px;
          gap: 24px;
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 999;
          box-sizing: border-box;
        }

        .mobile-nav-drawer.active {
          right: 0;
        }

        .mobile-drawer-links {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .mobile-nav-link-item {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: var(--text-on-dark);
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: block;
        }

        .mobile-user-session {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          margin-top: 12px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-sub-on-dark);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .navbar-container {
            padding: 0 20px;
          }
          .nav-center-links {
            gap: 20px;
          }
          .nav-right-actions {
            gap: 16px;
          }
          .nav-icons-group {
            gap: 12px;
          }
          .user-session-pill {
            gap: 8px;
          }
          .logo-text {
            font-size: 16px;
          }
        }

        @media (max-width: 850px) {
          .logo-text {
            font-size: 15px;
            letter-spacing: 0.1em;
          }
          .nav-center-links {
            gap: 12px;
          }
          .nav-right-actions {
            gap: 12px;
          }
          .nav-divider {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .nav-center-links {
            display: none;
          }
          .nav-user-section {
            display: none;
          }
          .nav-divider {
            display: none;
          }
          .mobile-hamburger {
            display: flex;
          }
          .nav-right-actions {
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .logo-text {
            font-size: 14px;
            letter-spacing: 0.08em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 120px;
          }
          .logo-img {
            height: 38px;
            flex-shrink: 0;
          }
          .navbar-container {
            padding: 0 12px;
          }
          .nav-icons-group {
            gap: 6px;
          }
          .nav-icon-link {
            width: 34px;
            height: 34px;
          }
          .nav-right-actions {
            flex-shrink: 0;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
