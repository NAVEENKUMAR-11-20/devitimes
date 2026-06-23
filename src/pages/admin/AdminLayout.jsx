import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import pb from '../../lib/pocketbase';

const AdminLayout = () => {
  const { isAdminAuthenticated, logoutAdmin, settings, updateSettings, saveSettingsToPB, products } = useApp();

  // Clear any regular wholesale user session synchronously to prevent API rules policy mismatch in child routes
  if (pb.authStore.isValid && !pb.authStore.isAdmin) {
    console.log('[AdminLayout] Synchronously clearing regular user session');
    pb.authStore.clear();
  }

  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(window.innerWidth <= 768);
  const isFirstRender = useRef(true);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);

  const dismissAlert = (id) => {
    setDismissedAlertIds(prev => [...prev, id]);
  };

  const handleWhatsAppClick = (alert) => {
    const adminWhatsAppRaw = settings.whatsappNumber || '7358349394';
    let adminWhatsApp = adminWhatsAppRaw.replace(/\D/g, '');
    if (adminWhatsApp.length === 10) {
      adminWhatsApp = '91' + adminWhatsApp;
    }
    const message = `⚠️ DeviTimes Low Stock Alert\n\nModel No: ${alert.modelNumber}\n\nCurrent Stock: ${alert.stock}\n\nThreshold: ${alert.threshold}\n\nPlease restock the product immediately.`;
    const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Calculate which wholesale products are low-stock and not dismissed in this session
  const activeStockAlerts = useMemo(() => {
    if (settings.bannerAlertEnabled === false) return [];
    if (!products || products.length === 0) return [];
    
    const threshold = settings.lowStockThreshold || 10;
    const wholesaleProducts = products.filter(p => p.product_type !== 'retail' && p.product_type !== 'RETAIL');
    return wholesaleProducts
      .filter(p => {
        const prodStock = p.stock !== undefined ? p.stock : 20;
        return prodStock <= threshold && !dismissedAlertIds.includes(p.id);
      })
      .map(p => {
        const rawTime = settings.alertData?.[p.id]?.lastAlertSentAt;
        const timeObj = rawTime ? new Date(rawTime) : new Date();
        const alertTimeStr = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + timeObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        return {
          id: p.id,
          modelNumber: p.modelNumber || p.id,
          stock: p.stock !== undefined ? p.stock : 20,
          threshold: threshold,
          image: p.images && p.images.length > 0 ? p.images[0] : null,
          alertTime: alertTimeStr
        };
      });
  }, [products, dismissedAlertIds, settings.lowStockThreshold, settings.bannerAlertEnabled, settings.alertData]);

  // Close sidebar on route change for mobile, except on initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
            <span className="mobile-nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          
          <Link 
            to="/admin/products" 
            className={`nav-sidebar-item ${isTabActive('/admin/products') ? 'active-sidebar-item' : ''}`}
          >
            <span className="mobile-nav-icon">📦</span>
            <span className="nav-text">Products</span>
          </Link>
          
          <Link 
            to="/admin/add-product" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-product') ? 'active-sidebar-item' : ''}`}
          >
            <span className="mobile-nav-icon">➕</span>
            <span className="nav-text">Add Product</span>
          </Link>
          
          <Link 
            to="/admin/add-via-pdf" 
            className={`nav-sidebar-item ${isTabActive('/admin/add-via-pdf') ? 'active-sidebar-item' : ''}`}
          >
            <span className="mobile-nav-icon">📄</span>
            <span className="nav-text">Add via PDF</span>
          </Link>
          
          <Link 
            to="/admin/users" 
            className={`nav-sidebar-item ${isTabActive('/admin/users') ? 'active-sidebar-item' : ''}`}
          >
            <span className="mobile-nav-icon">👥</span>
            <span className="nav-text">Users</span>
          </Link>
          
          <Link 
            to="/admin/settings" 
            className={`nav-sidebar-item ${isTabActive('/admin/settings') ? 'active-sidebar-item' : ''}`}
          >
            <span className="mobile-nav-icon">⚙</span>
            <span className="nav-text">Settings</span>
          </Link>

          <button onClick={handleLogout} className="nav-sidebar-item sidebar-logout-btn">
            <span className="mobile-nav-icon">🚪</span>
            <span className="nav-text">Logout</span>
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

      {/* Floating Low Stock Alerts Container */}
      {activeStockAlerts.length > 0 && (
        <div className="admin-stock-alerts-floating-container">
          {activeStockAlerts.map(alert => (
            <div key={alert.id} className="stock-alert-card animate-slide-in">
              <div className="stock-alert-card-header">
                <span className="alert-icon">⚠️</span>
                <strong style={{ fontWeight: 600 }}>Low Stock Alert</strong>
                <button className="close-alert-btn" onClick={() => dismissAlert(alert.id)}>×</button>
              </div>
              <div className="stock-alert-card-body" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div className="alert-card-thumb" style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#ffffff', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #334155' }}>
                  {alert.image ? (
                    <img src={alert.image} alt={alert.modelNumber} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.svg"; }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>⏰</span>
                  )}
                </div>
                <div style={{ flexGrow: 1, fontSize: '12px', lineHeight: '1.4' }}>
                  <p style={{ margin: '2px 0' }}>Model: <strong style={{ color: '#ffffff' }}>{alert.modelNumber}</strong></p>
                  <p style={{ margin: '2px 0' }}>Stock: <strong style={{ color: '#ef4444', fontWeight: '700' }}>{alert.stock}</strong></p>
                  <p style={{ margin: '2px 0' }}>Threshold: <strong style={{ color: '#ffffff' }}>{alert.threshold}</strong></p>
                  <p style={{ margin: '2px 0' }}>Alert Time: <span style={{ color: '#94a3b8' }}>{alert.alertTime}</span></p>
                </div>
              </div>
              {settings.inventoryAlertEnabled !== false && (
                <div className="stock-alert-card-footer">
                  <button className="btn-primary open-wa-btn" onClick={() => handleWhatsAppClick(alert)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 12px', fontSize: '13px', borderRadius: '4px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.202-1.362a9.92 9.92 0 004.808 1.258h.005c5.507 0 9.99-4.478 9.99-9.986 0-2.669-1.037-5.176-2.923-7.062A9.914 9.914 0 0012.012 2zM12.01 20.393h-.004a8.31 8.31 0 01-4.238-1.161l-.304-.18-3.149.826.84-3.072-.198-.314a8.31 8.31 0 01-1.275-4.51c.002-4.587 3.73-8.311 8.324-8.311a8.27 8.27 0 015.88 2.438 8.27 8.27 0 012.44 5.88c-.002 4.59-3.73 8.313-8.325 8.313zm4.557-6.223c-.25-.124-1.477-.727-1.705-.81-.228-.083-.393-.124-.558.124-.165.25-.639.81-.784.975-.145.165-.29.185-.54.062-.25-.125-1.05-.388-2.001-1.236-.74-.66-1.24-1.473-1.385-1.722-.145-.25-.015-.385.11-.509.112-.112.25-.29.375-.436.125-.145.166-.25.25-.416.083-.166.042-.31-.02-.435-.063-.125-.558-1.348-.764-1.848-.2-.5-.401-.429-.558-.429h-.475c-.165 0-.435.063-.663.312-.228.25-.87.852-.87 2.077 0 1.226.89 2.41 1.015 2.577.124.166 1.752 2.675 4.246 3.75.593.256 1.057.409 1.417.524.597.19 1.14.163 1.57.099.479-.072 1.477-.601 1.683-1.18.207-.58.207-1.08.145-1.18-.062-.101-.228-.182-.478-.306z"/>
                    </svg>
                    WhatsApp Alert
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

        .mobile-nav-icon {
          display: none;
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
            background: rgba(255, 255, 255, 0.1);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .admin-sidebar-overlay {
            display: block;
            backdrop-filter: blur(8px);
          }
          
          /* Dashboard Mobile Navigation Styles */
          .admin-sidebar {
            transform: translateY(100%);
            width: 100%;
            border-right: none;
            background: linear-gradient(135deg, #0F172A 0%, #1e293b 100%);
            border-radius: 0;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-shadow: none;
            bottom: 0;
            top: 0;
            height: 100vh;
            z-index: 60;
          }
          
          .admin-sidebar.mobile-open {
            transform: translateY(0);
          }

          .admin-main-viewport {
            margin-left: 0;
          }

          .sidebar-logo-block {
            padding: 24px 24px 16px;
            border-bottom: none;
          }
          
          .sidebar-logo-text {
            font-size: 18px;
            font-weight: 700;
          }

          /* Grid for Mobile Navigation Cards */
          .sidebar-nav-links {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 16px 24px 32px;
            overflow-y: auto;
            align-content: start;
          }

          .nav-sidebar-item {
            background-color: #ffffff;
            color: #0F172A;
            border-radius: 16px;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            white-space: normal;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: none;
          }

          .nav-sidebar-item:hover {
            background-color: #f8fafc;
            color: var(--accent-blue);
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          }

          .active-sidebar-item {
            background-color: #f1f5f9 !important;
            color: var(--accent-blue) !important;
            border-left: none;
            border-bottom: 4px solid var(--accent-blue);
            padding-left: 16px; /* Reset the active offset from desktop */
          }
          
          .mobile-nav-icon {
            display: block;
            font-size: 28px;
            margin-bottom: 4px;
          }

          .sidebar-logout-btn {
            border-top: none;
            margin-top: 0;
            color: #ef4444;
            background-color: #fef2f2;
          }
          
          .sidebar-logout-btn:hover {
            background-color: #fee2e2 !important;
            color: #dc2626 !important;
          }

          .admin-topbar {
            padding: 0 20px;
          }
        }

        .admin-stock-alerts-floating-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 320px;
          width: 100%;
        }

        .stock-alert-card {
          background-color: #1e293b;
          border-left: 4px solid #ef4444;
          border-radius: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
          padding: 16px;
          color: #ffffff;
        }

        .stock-alert-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          margin-bottom: 8px;
          position: relative;
        }

        .alert-icon {
          font-size: 16px;
        }

        .close-alert-btn {
          position: absolute;
          right: 0;
          top: 0;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }

        .close-alert-btn:hover {
          color: #ffffff;
        }

        .stock-alert-card-body {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 12px;
          line-height: 1.5;
          text-align: left;
        }

        .stock-alert-card-body p {
          margin: 4px 0;
        }

        .stock-alert-card-body strong {
          color: #ffffff;
        }

        .stock-alert-card-footer {
          display: flex;
          justify-content: flex-end;
        }

        .open-wa-btn {
          width: 100%;
          font-size: 11px;
          padding: 8px 12px;
          background-color: #25d366; /* WhatsApp Green */
          border-color: #25d366;
          color: white;
          border-radius: 2px;
          cursor: pointer;
          font-weight: 600;
          border: 1px solid transparent;
        }

        .open-wa-btn:hover {
          background-color: #20ba5a;
          border-color: #20ba5a;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
