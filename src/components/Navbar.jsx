import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { currentUser, logoutUser, cart, currentRetailUser, logoutRetailUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleRetailLogout = () => {
    logoutRetailUser();
    navigate('/');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileDropdownOpen]);

  const user = currentUser || currentRetailUser;
  const isRetail = !!currentRetailUser || !!currentUser?.isRetail;
  const userInitial = isRetail ? 'R' : (currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U');
  const userDisplayName = isRetail ? 'Retailer' : (currentUser?.name || 'User');


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
              to="/retail" 
              className={`nav-link-item ${location.pathname === '/retail' ? 'active-link' : ''}`}
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
          <div className="nav-user-section" ref={profileRef}>
            {user ? (
              <div className="nav-profile-container">
                <button 
                  className="nav-profile-btn" 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-label="User Profile Menu"
                >
                  <div className={`avatar-circle ${isRetail ? 'retail' : 'wholesale'}`}>
                    {userInitial}
                  </div>
                  <svg 
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    className={`chevron-icon ${profileDropdownOpen ? 'open' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">{userDisplayName}</div>
                      <div className="dropdown-user-role">{isRetail ? 'Retail Partner' : 'Wholesale Client'}</div>
                    </div>
                    <div className="dropdown-divider" />
                    {!isRetail && (
                      <Link 
                        to="/history" 
                        className="dropdown-item"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Order History
                      </Link>
                    )}
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (isRetail) handleRetailLogout();
                        else handleLogout();
                      }} 
                      className="dropdown-item logout-item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
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
              to="/retail" 
              className={`mobile-nav-link-item ${location.pathname === '/retail' ? 'active-link' : ''}`}
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
          
          {user ? (
            <div className="mobile-user-session">
              <div className="mobile-profile-header">
                <div className={`avatar-circle ${isRetail ? 'retail' : 'wholesale'}`}>
                  {userInitial}
                </div>
                <div>
                  <div className="mobile-profile-name">{userDisplayName}</div>
                  <div className="mobile-profile-role">{isRetail ? 'Retail Partner' : 'Wholesale Client'}</div>
                </div>
              </div>
              {!isRetail && (
                <Link 
                  to="/history" 
                  className="mobile-nav-link-item"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ width: '100%' }}
                >
                  ORDER HISTORY
                </Link>
              )}
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isRetail) handleRetailLogout();
                  else handleLogout();
                }} 
                className="logout-nav-btn"
                style={{ width: '100%', marginTop: '12px' }}
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

        .nav-profile-container {
          position: relative;
          display: inline-block;
        }

        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          color: #ffffff;
        }

        .nav-profile-btn:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }

        .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .avatar-circle.wholesale {
          background: linear-gradient(135deg, var(--accent-blue) 0%, #1D4ED8 100%);
        }

        .avatar-circle.retail {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .chevron-icon {
          transition: transform 0.25s ease;
          opacity: 0.7;
        }

        .chevron-icon.open {
          transform: rotate(180deg);
          opacity: 1;
        }

        .profile-dropdown-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          background-color: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          width: 200px;
          padding: 8px 0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          transform-origin: top right;
          animation: dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .dropdown-user-info {
          padding: 10px 16px 12px 16px;
        }

        .dropdown-user-name {
          font-weight: 700;
          font-size: 13px;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-user-role {
          font-size: 10px;
          font-weight: 500;
          color: #9CA3AF;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dropdown-divider {
          height: 1px;
          background-color: rgba(255, 255, 255, 0.06);
          margin: 4px 0;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: #D1D5DB;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
          box-sizing: border-box;
          text-decoration: none;
        }

        .dropdown-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .dropdown-item.logout-item {
          color: #FCA5A5;
        }

        .dropdown-item.logout-item:hover {
          background-color: rgba(239, 68, 68, 0.1);
          color: #EF4444;
        }

        .mobile-profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          width: 100%;
        }

        .mobile-profile-name {
          font-weight: 700;
          font-size: 14px;
          color: #ffffff;
        }

        .mobile-profile-role {
          font-size: 10px;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 1px;
        }

        .logout-nav-btn {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ef4444;
          padding: 6px 12px;
          border: 1px solid #ef4444;
          border-radius: 2px;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          height: 28px;
          transition: all 0.2s ease;
          box-sizing: border-box;
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
            /* Keep profile button visible, hide Sign In link in header on mobile */
          }
          .nav-user-section > a {
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
