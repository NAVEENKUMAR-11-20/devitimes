import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { currentUser, logoutUser, cart } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  return (
    <nav className="navbar-root">
      <div className="navbar-container">
        
        {/* Left Side: Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo.png" alt="DEVI TIMES Logo" className="logo-img" />
          <span className="logo-text font-logo">DEVI TIMES</span>
        </Link>

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

        {/* Center/Right Nav Links (Desktop) */}
        <div className={`nav-menu-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link-item ${location.pathname === '/' ? 'active-link' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            HOME
          </Link>
          <Link 
            to="/collection" 
            className={`nav-link-item ${location.pathname === '/collection' ? 'active-link' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            COLLECTION
          </Link>
          
          {/* User Session status */}
          {currentUser ? (
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
              onClick={() => setMobileMenuOpen(false)}
            >
              SIGN IN
            </Link>
          )}

          {/* Search trigger (navigates to collection) */}
          <Link 
            to="/collection" 
            className="nav-icon-link search-icon-btn" 
            aria-label="Search Collection"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </Link>

          {/* Cart Icon & Count Badge */}
          <Link 
            to="/cart" 
            className={`nav-icon-link cart-icon-btn ${location.pathname === '/cart' ? 'active-link' : ''}`}
            aria-label="Shopping Cart"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="cart-badge-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {cartCount > 0 && (
                <span className="cart-badge-count">{cartCount}</span>
              )}
            </div>
          </Link>
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
        }

        .logo-img {
          height: 48px;
          width: auto;
          object-fit: contain;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .nav-menu-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .nav-link-item {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: inherit;
          position: relative;
          padding: 6px 0;
          transition: color 0.25s ease, opacity 0.25s ease, transform 0.25s ease;
        }

        .nav-link-item::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: currentColor;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-item:hover {
          opacity: 1;
          transform: translateY(-1px);
        }

        .nav-link-item:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }

        .active-link {
          color: var(--text-accent-on-dark) !important;
        }

        .active-link::after {
          transform: scaleX(1) !important;
          transform-origin: left !important;
          background-color: var(--text-accent-on-dark);
        }

        .nav-icon-link {
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.25s ease;
        }

        .nav-icon-link:hover {
          transform: scale(1.08);
        }

        .cart-badge-wrapper {
          position: relative;
          display: inline-block;
        }

        .cart-badge-count {
          position: absolute;
          top: -6px;
          right: -8px;
          background-color: var(--text-accent-on-dark);
          color: var(--primary-dark-bg);
          font-size: 9px;
          font-weight: 700;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-session-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.15);
          padding-left: 16px;
        }

        .user-session-name {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.08em;
        }

        .logout-nav-btn {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ef4444;
          padding: 2px 6px;
          border: 1px solid #ef4444;
          border-radius: 2px;
          background: transparent;
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

        @media (max-width: 768px) {
          .mobile-hamburger {
            display: flex;
          }

          .nav-menu-links {
            position: fixed;
            top: 0;
            right: -100%;
            height: 100vh;
            width: 70%;
            background-color: rgba(26, 35, 50, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            color: #ffffff;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 40px;
            transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -10px 0 30px rgba(0,0,0,0.25);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
          }

          .nav-menu-links.active {
            right: 0;
          }

          .nav-link-item {
            font-size: 16px;
          }

          .user-session-pill {
            flex-direction: column;
            border-left: none;
            padding-left: 0;
            gap: 16px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
