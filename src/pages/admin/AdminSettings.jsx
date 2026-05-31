import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const AdminSettings = () => {
  const { settings, updateSettings, products, users } = useApp();

  // WhatsApp Configuration State
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  
  // Store Settings State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [currency, setCurrency] = useState(settings.currency);
  const [websiteUrl, setWebsiteUrl] = useState(settings.websiteUrl);

  // Admin Password resets State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback notifications
  const [toastText, setToastText] = useState('');

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

  // Section 2 Save
  const handleSaveStore = (e) => {
    e.preventDefault();
    if (!storeName.trim() || !currency.trim() || !websiteUrl.trim()) {
      alert('All store settings are required.');
      return;
    }
    updateSettings({
      storeName: storeName.trim(),
      currency: currency.trim(),
      websiteUrl: websiteUrl.trim()
    });
    triggerToast('Store settings updated');
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

  // Section 4 actions
  const handleExportProducts = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `lumiere_products_export_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleExportUsers = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `lumiere_users_export_${Date.now()}.json`);
    dlAnchorElem.click();
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
      <div className="add-product-title-row" style={{ marginBottom: '24px' }}>
        <h1 className="dashboard-heading font-heading">Settings</h1>
        <p className="stats-indicator font-body">Configure system triggers, admin access passwords, and manage backups.</p>
      </div>

      <div className="settings-grid">
        
        {/* Card 1: WhatsApp checkout */}
        <div className="form-card-panel">
          <h3 className="panel-heading font-heading">WhatsApp Integration</h3>
          <p className="panel-subtext">Configure the primary phone number where client order payloads are delivered.</p>
          
          <form onSubmit={handleSaveWhatsapp} className="admin-form">
            <div className="form-group">
              <label className="form-label">ADMIN WHATSAPP NUMBER</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="+91XXXXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <span className="help-subtext">Enter country code followed by number (e.g. +919999999999)</span>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '11px', height: '36px' }}>
              Save Configuration
            </button>
          </form>
        </div>

        {/* Card 2: Branding Settings */}
        <div className="form-card-panel">
          <h3 className="panel-heading font-heading">Store Preferences</h3>
          <p className="panel-subtext">Branding and client links parameters.</p>

          <form onSubmit={handleSaveStore} className="admin-form">
            
            <div className="form-group">
              <label className="form-label">STORE NAME</label>
              <input 
                type="text" 
                className="form-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CURRENCY SYMBOL</label>
              <input 
                type="text" 
                className="form-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">WEBSITE HOST URL</label>
              <input 
                type="text" 
                className="form-input"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <span className="help-subtext">Used to format WhatsApp credential sharing invitations.</span>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '11px', height: '36px' }}>
              Save Store Preferences
            </button>
          </form>
        </div>

        {/* Card 3: Admin Security Passwords */}
        <div className="form-card-panel">
          <h3 className="panel-heading font-heading">Admin Password</h3>
          <p className="panel-subtext">Update the entry authorization key required to login at /admin.</p>

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

            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '11px', height: '36px' }}>
              Update Security Password
            </button>
          </form>
        </div>

        {/* Card 4: Backup exports */}
        <div className="form-card-panel">
          <h3 className="panel-heading font-heading">Data Management</h3>
          <p className="panel-subtext">Export catalog spreadsheets or wipe active sessions.</p>
          
          <div className="data-management-actions-row">
            <button onClick={handleExportProducts} className="btn-secondary data-manage-btn font-body">
              📥 &nbsp; Export All Products (JSON)
            </button>
            <button onClick={handleExportUsers} className="btn-secondary data-manage-btn font-body">
              📥 &nbsp; Export All Users (JSON)
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
          gap: 16px;
        }

        .data-manage-btn {
          width: 100%;
          height: 44px;
          font-size: 12px;
          justify-content: flex-start;
          padding: 0 16px;
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
      `}</style>
    </div>
  );
};

export default AdminSettings;
