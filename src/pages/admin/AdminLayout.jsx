import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const AdminLayout = () => {
  const { isAdminAuthenticated, logoutAdmin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  // Page title override for admin panel
  useEffect(() => {
    document.title = 'Admin — LUMIÈRE';
    return () => {
      document.title = 'LUMIÈRE — Luxury Wall Clocks';
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
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="admin-sidebar">
        
        {/* Sidebar Logo */}
        <div className="sidebar-logo-block">
          <svg className="admin-svg-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="6" />
            <line x1="50" y1="50" x2="50" y2="26" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="50" x2="70" y2="50" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div>
            <h2 className="sidebar-logo-text font-logo">LUMIÈRE</h2>
            <span className="sidebar-badge-admin font-body">ADMIN</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-links font-body">
          
          <Link 
            to="/admin/dashboard" 
            className={`nav-sidebar-item ${isTabActive('/admin/dashboard') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">📊</span> Dashboard
          </Link>
          
          <Link 
            to="/admin/products" 
            className={`nav-sidebar-item ${isTabActive('/admin/products') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">📦</span> Products
          </Link>
          
          <Link 
            to="/admin/add-product" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-product') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">➕</span> Add Product
          </Link>
          
          <Link 
            to="/admin/add-via-pdf" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-via-pdf') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">📄</span> Add via PDF
          </Link>
          
          <Link 
            to="/admin/users" 
            className={`nav-sidebar-item ${isTabActive('/admin/users') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">👥</span> Users
          </Link>
          
          <Link 
            to="/admin/registrations" 
            className={`nav-sidebar-item ${isTabActive('/admin/registrations') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">📋</span> Registrations
          </Link>
          
          <Link 
            to="/admin/settings" 
            className={`nav-sidebar-item ${isTabActive('/admin/settings') ? 'active-sidebar-item' : ''}`}
          >
            <span className="nav-icon">⚙️</span> Settings
          </Link>

          <button onClick={handleLogout} className="nav-sidebar-item sidebar-logout-btn">
            <span className="nav-icon">🚪</span> Logout
          </button>

        </nav>

      </aside>

      {/* 2. Main Content Frame */}
      <main className="admin-main-viewport">
        
        {/* Top Header Information bar */}
        <header className="admin-topbar">
          <div className="topbar-welcome font-heading">
            Welcome, <span>Admin</span>
          </div>
          <div className="topbar-clock font-body">
            🕒 {time.toLocaleDateString()} &nbsp;|&nbsp; {time.toLocaleTimeString()}
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

        .admin-svg-logo {
          width: 32px;
          height: 32px;
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

        @media (max-width: 1024px) {
          .admin-sidebar {
            width: 72px;
          }
          .sidebar-logo-block div, 
          .nav-sidebar-item text,
          .sidebar-logo-text, 
          .sidebar-badge-admin {
            display: none;
          }
          .admin-sidebar span {
            display: none;
          }
          .admin-main-viewport {
            margin-left: 72px;
          }
          .nav-sidebar-item {
            justify-content: center;
            padding: 16px 0;
          }
          .active-sidebar-item {
            border-left: none;
            border-bottom: 3px solid var(--text-accent-on-dark);
          }
          .nav-icon {
            margin-right: 0;
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
