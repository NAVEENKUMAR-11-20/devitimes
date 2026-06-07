import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import { fetchAllProducts } from '../../lib/productsService';
import { fetchAllUsers } from '../../lib/usersService';

const AdminSettings = () => {
  const { settings, updateSettings, products, users } = useApp();

  // WhatsApp Configuration State
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  

  // Admin Password resets State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback notifications
  const [toastText, setToastText] = useState('');

  // Loading state for users export
  const [isExportingUsers, setIsExportingUsers] = useState(false);

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 1500);
  };

  // Section 1 Save
  const handleSaveWhatsapp = (e) => {
    e.preventDefault();
    if (!whatsappNumber.trim()) return;
    updateSettings({ whatsappNumber: whatsappNumber.trim() });
    triggerToast('WhatsApp number saved');
  };


  // Section 3 Save
  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill out all password fields.');
      return;
    }

    if (currentPassword !== settings.adminPassword) {
      alert('Current admin password does not match.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match.');
      return;
    }

    updateSettings({ adminPassword: newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    triggerToast('Admin password updated successfully');
  };

  // Section 4 actions — Excel export
  const handleExportProducts = async () => {
    try {
      // Fetch fresh product list directly from PocketBase
      const allProducts = await fetchAllProducts();

      if (!allProducts || allProducts.length === 0) {
        triggerToast('No products found to export.');
        return;
      }

      // Map records to the required Excel columns
      const rows = allProducts.map((p) => ({
        'Product ID':       p.id || '',
        'Model Number':     p.modelNumber || '',
        'Product Price':    p.salePrice ?? '',
        'Size Dimensions':  p.size || '',
        'Image URL(s)':     Array.isArray(p.images) ? p.images.join(', ') : (p.images || ''),
        'Created Date':     p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '',
        'Updated Date':     p.updated   ? new Date(p.updated).toLocaleDateString('en-IN')   : '',
      }));

      // Build workbook
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // File name: Products_Export_YYYY-MM-DD.xlsx
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Products_Export_${today}.xlsx`);

      triggerToast(`✓ Exported ${allProducts.length} products to Excel`);
    } catch (err) {
      console.error('[Export] Excel export error:', err);
      triggerToast('Export failed. Please try again.');
    }
  };

  // Users Excel export
  const handleExportUsers = async () => {
    if (isExportingUsers) return;
    setIsExportingUsers(true);
    try {
      // Fetch fresh user list directly from PocketBase
      const allUsers = await fetchAllUsers();

      if (!allUsers || allUsers.length === 0) {
        triggerToast('No users found to export.');
        return;
      }

      // Map records to required Excel columns
      const rows = allUsers.map((u) => ({
        'User ID':       u.userId || u.id || '',
        'Full Name':     u.name   || '',
        'Mobile Number': u.mobile || '',
        'Password':      u.password || '',
        'Created Date':  u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
        'Updated Date':  u.updated   ? new Date(u.updated).toLocaleDateString('en-IN')   : '',
      }));

      // Build workbook
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      // File name: Users_Export_YYYY-MM-DD.xlsx
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Users_Export_${today}.xlsx`);

      triggerToast(`✓ Exported ${allUsers.length} users to Excel`);
    } catch (err) {
      console.error('[Export] Users Excel export error:', err);
      triggerToast('Export failed. Please try again.');
    } finally {
      setIsExportingUsers(false);
    }
  };

  const handleClearCarts = () => {
    if (confirm('Are you sure you want to clear all carts inside localStorage? This removes temporary shopping sessions.')) {
      // Loop over localStorage keys and delete cart keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lumiere_cart_')) {
          localStorage.removeItem(key);
        }
      }
      triggerToast('All cart sessions cleared');
    }
  };

  return (
    <div className="admin-settings-root font-body">
      
      {toastText && (
        <div className="toast-notification">
          {toastText}
        </div>
      )}

      {/* Page Title */}
      <div className="add-product-title-row" style={{ marginBottom: '16px' }}>
        <h1 className="dashboard-heading font-heading">Settings</h1>
        <p className="stats-indicator font-body">Manage application settings.</p>
      </div>

      <div className="settings-grid">
        
        {/* Card 1: WhatsApp checkout */}
        <div className="form-card-panel settings-card">
          <h3 className="panel-heading font-heading">WhatsApp Integration</h3>
          <p className="panel-subtext">Receive customer orders on WhatsApp.</p>
          
          <form onSubmit={handleSaveWhatsapp} className="admin-form">
            <div className="form-group">
              <label className="form-label">WHATSAPP NUMBER</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="+91XXXXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <span className="help-subtext">Include country code.</span>
            </div>
            <button type="submit" className="btn-primary settings-save-btn">
              Save
            </button>
          </form>
        </div>


        {/* Card 3: Admin Security Passwords */}
        <div className="form-card-panel settings-card">
          <h3 className="panel-heading font-heading">Admin Password</h3>
          <p className="panel-subtext">Change your admin password.</p>

          <form onSubmit={handleSavePassword} className="admin-form">
            
            <div className="form-group">
              <label className="form-label">CURRENT PASSWORD</label>
              <input 
                type="password" 
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">NEW PASSWORD</label>
              <input 
                type="password" 
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CONFIRM NEW PASSWORD</label>
              <input 
                type="password" 
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary settings-save-btn">
              Update Password
            </button>
          </form>
        </div>

        {/* Card 4: Backup exports */}
        <div className="form-card-panel settings-card">
          <h3 className="panel-heading font-heading">Data Management</h3>
          <p className="panel-subtext">Export data or clear sessions.</p>
          
          <div className="data-management-actions-row">
            <button onClick={handleExportProducts} className="btn-secondary data-manage-btn font-body">
              📊 &nbsp; Export All Products (Excel)
            </button>
            <button
              onClick={handleExportUsers}
              className={`btn-secondary data-manage-btn font-body users-export-btn ${isExportingUsers ? 'users-export-btn--loading' : ''}`}
              disabled={isExportingUsers}
            >
              {isExportingUsers ? (
                <><span className="export-spinner" aria-hidden="true"></span>&nbsp; Generating Excel...</>
              ) : (
                <>📊 &nbsp; Export All Users (Excel)</>
              )}
            </button>
            <button onClick={handleClearCarts} className="btn-secondary data-manage-btn font-body" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
              🗑️ &nbsp; Clear All Cart Sessions
            </button>
          </div>
        </div>

      </div>

      <style>{`
        .admin-settings-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        .data-management-actions-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .data-manage-btn {
          width: 100%;
          height: 42px;
          font-size: 12px;
          justify-content: flex-start;
          padding: 0 14px;
        }

        /* Compact settings card */
        .settings-card {
          padding: 20px 24px;
        }

        /* Short save button */
        .settings-save-btn {
          height: 36px;
          padding: 0 20px;
          font-size: 11px;
          letter-spacing: 0.08em;
          margin-top: 4px;
        }

        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #1E293B;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 3000;
          font-size: 13px;
          animation: fadeIn 0.2s ease;
        }

        @media (max-width: 768px) {
          .add-product-title-row {
            margin-bottom: 12px !important;
          }
          .admin-form .btn-primary,
          .settings-save-btn {
            width: 100%;
          }
          .settings-card {
            padding: 16px;
          }
          .data-manage-btn {
            height: auto;
            min-height: 48px;
            padding: 12px 14px;
            font-size: 12px;
            white-space: normal;
            text-align: left;
          }
          .form-group {
            margin-bottom: 14px;
          }
        }

        /* Users export button — loading & hover states */
        .users-export-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          will-change: transform;
        }
        .users-export-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
        .users-export-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }
        .users-export-btn--loading {
          opacity: 0.75;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Lightweight CSS spinner */
        .export-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 4px;
          flex-shrink: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminSettings;
