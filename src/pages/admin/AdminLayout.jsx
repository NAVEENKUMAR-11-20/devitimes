import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const AdminLayout = () => {
  const { isAdminAuthenticated, logoutAdmin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Page title override for admin panel
  useEffect(() => {
    document.title = 'Admin — DEVI TIMES';
    return () => {
      document.title = 'DEVI TIMES — Luxury Wall Clocks';
    };
  }, []);

  // Update clock in top header
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Protect Admin Routes - Redirect to admin login if not signed in
  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAdminAuthenticated, navigate]);

  if (!isAdminAuthenticated) {
    return null; // Return empty while redirecting
  }

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  // Helper to check active nav link based on path suffix
  const isTabActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout-root">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* 1. Left Sidebar Navigation */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Sidebar Logo */}
        <div className="sidebar-logo-block">
          <img src="/logo.png" alt="DEVI TIMES Logo" className="admin-logo-img" />
          <div>
            <h2 className="sidebar-logo-text font-logo">DEVI TIMES</h2>
            <span className="sidebar-badge-admin font-body">ADMIN</span>
          </div>
          <button 
            className="mobile-close-sidebar-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-links font-body">
          <Link 
            to="/admin/dashboard" 
            className={`nav-sidebar-item ${isTabActive('/admin/dashboard') ? 'active-sidebar-item' : ''}`}
          >
            Dashboard
          </Link>
          
          <Link 
            to="/admin/products" 
            className={`nav-sidebar-item ${isTabActive('/admin/products') ? 'active-sidebar-item' : ''}`}
          >
            Products
          </Link>
          
          <Link 
            to="/admin/add-product" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-product') ? 'active-sidebar-item' : ''}`}
          >
            Add Product
          </Link>
          
          <Link 
            to="/admin/add-via-pdf" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-via-pdf') ? 'active-sidebar-item' : ''}`}
          >
            Add via PDF
          </Link>
          
          <Link 
            to="/admin/users" 
            className={`nav-sidebar-item ${isTabActive('/admin/users') ? 'active-sidebar-item' : ''}`}
          >
            Users
          </Link>
          
          <Link 
            to="/admin/settings" 
            className={`nav-sidebar-item ${isTabActive('/admin/settings') ? 'active-sidebar-item' : ''}`}
          >
            Settings
          </Link>

          <button onClick={handleLogout} className="nav-sidebar-item sidebar-logout-btn">
            Logout
          </button>

        </nav>

      </aside>

      {/* 2. Main Content Frame */}
      <main className="admin-main-viewport">
        
        {/* Top Header Information bar */}
        <header className="admin-topbar">
          <div className="topbar-left-section" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              ☰
            </button>
            <div className="topbar-welcome font-heading">
              Welcome, <span>Admin</span>
            </div>
          </div>
          <div className="topbar-clock font-body">
            🕒 {time.toLocaleDateString()} <span className="hide-mobile">&nbsp;|&nbsp; {time.toLocaleTimeString()}</span>
          </div>
        </header>

        {/* Dynamic Nested Content container */}
        <div className="admin-content-inner">
          <Outlet />
        </div>

      </main>

      <style>{`
        .admin-layout-root {
          display: flex;
          min-height: 100vh;
          background-color: var(--page-bg);
        }

        /* Fixed Sidebar Navigation Panel */
        .admin-sidebar {
          width: 240px;
          background-color: var(--primary-dark-bg);
          color: #ffffff;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sidebar-logo-block {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .admin-logo-img {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }

        .sidebar-logo-text {
          font-size: 16px;
          letter-spacing: 0.15em;
          color: #ffffff;
        }

        .sidebar-badge-admin {
          font-size: 9px;
          background-color: var(--accent-blue);
          color: white;
          padding: 1px 4px;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .sidebar-nav-links {
          display: flex;
          flex-direction: column;
          padding: 16px 0;
          overflow-y: auto;
          flex-grow: 1;
        }

        .nav-sidebar-item {
          display: flex;
          align-items: center;
          padding: 12px 24px;
          color: #CBD5E1;
          font-size: 13px;
          font-weight: 500;
          transition: all var(--transition-speed);
          text-align: left;
          width: 100%;
        }

        .nav-sidebar-item:hover {
          background-color: rgba(255, 255, 255, 0.03);
          color: #ffffff;
        }

        .active-sidebar-item {
          background-color: var(--accent-blue) !important;
          color: #ffffff !important;
          border-left: 4px solid var(--text-accent-on-dark);
          padding-left: 20px; /* Offset the left border */
        }

        .nav-icon {
          margin-right: 12px;
          font-size: 14px;
        }

        .sidebar-logout-btn {
          margin-top: auto; /* Push to bottom of sidebar */
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #f87171;
        }

        .sidebar-logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: #f87171 !important;
        }

        /* Main Display column adjustment */
        .admin-main-viewport {
          margin-left: 240px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Prevents overflow issues */
        }

        .admin-topbar {
          height: 64px;
          background-color: #ffffff;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .topbar-welcome {
          font-size: 20px;
          color: var(--text-primary);
        }

        .topbar-welcome span {
          font-weight: bold;
          color: var(--accent-blue);
        }

        .topbar-clock {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .admin-content-inner {
          padding: 32px;
          flex-grow: 1;
          background-color: var(--page-bg);
          overflow-y: auto;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-primary);
          padding: 0;
        }

        .mobile-close-sidebar-btn {
          display: none;
          background: none;
          border: none;
          font-size: 20px;
          color: #ffffff;
          cursor: pointer;
          margin-left: auto;
          opacity: 0.7;
        }

        .admin-sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 45;
        }
        
        .hide-mobile {
          display: inline;
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block;
          }
          .hide-mobile {
            display: none;
          }
          .mobile-close-sidebar-btn {
            display: block;
          }
          .admin-sidebar-overlay {
            display: block;
          }
          
          .admin-sidebar {
            transform: translateX(-100%);
            width: 260px;
            transition: transform 0.3s ease-in-out;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3);
            border-right: none;
          }
          
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }

          .admin-main-viewport {
            margin-left: 0;
          }

          .sidebar-logo-block {
            padding: 20px 16px;
          }

          .nav-sidebar-item {
            padding: 16px 20px;
            font-size: 14px;
            white-space: nowrap;
          }

          .active-sidebar-item {
            padding-left: 16px;
          }

          .admin-topbar {
            padding: 0 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
