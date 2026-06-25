import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import pb from '../../lib/pocketbase';
import * as XLSX from 'xlsx';
import { fetchAllProducts } from '../../lib/productsService';
import { fetchAllUsers } from '../../lib/usersService';
import {
  saveImage, getImage, deleteImage,
  saveList, getList,
  readFileAsBase64,
  LIST_KEYS, collectionImageKey, posterImageKey,
} from '../../lib/homepageImagesDb';

// ─── Default Collection list (mirrors Home.jsx) ────────────────────────────
const DEFAULT_COLLECTIONS = [
  { id: 'col_0', name: 'Premium Wall Clocks',    defaultImage: '/collection_images/premium wall clock.jpg' },
  { id: 'col_1', name: 'Modern Collection',       defaultImage: '/collection_images/modern wall clock.jpg' },
  { id: 'col_2', name: 'Wooden Collection',       defaultImage: '/collection_images/wooden wall clock.avif' },
  { id: 'col_3', name: 'Metal Collection',        defaultImage: '/collection_images/mettal wall clock.webp' },
  { id: 'col_4', name: 'Luxury Collection',       defaultImage: '/collection_images/luxury wall clock.jpg' },
  { id: 'col_5', name: 'Living Room Collection',  defaultImage: '/collection_images/living wall clock.webp' },
  { id: 'col_6', name: 'Vintage Collection',      defaultImage: '/collection_images/vintage clock.webp' },
  { id: 'col_7', name: 'Large Wall Clocks',       defaultImage: '/collection_images/large wall clock.jpg' },
];

// ─── Default Poster list ─────────────────────────────────────────────────────
const DEFAULT_POSTERS = [
  { id: 'poster_0', name: 'Wholesale Showcase Banner', defaultImage: '/luxury_clock_showroom.png' },
];

const AdminSettings = () => {
  const { settings, updateSettings, products, users } = useApp();

  // WhatsApp Configuration State
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold || 10);
  const [inventoryAlertEnabled, setInventoryAlertEnabled] = useState(settings.inventoryAlertEnabled !== false);
  const [bannerAlertEnabled, setBannerAlertEnabled] = useState(settings.bannerAlertEnabled !== false);

  // Admin Password resets State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback notifications
  const [toastText, setToastText] = useState('');

  // Loading state for users export
  const [isExportingUsers, setIsExportingUsers] = useState(false);

  // Retail Credentials State
  const [retailUserId, setRetailUserId] = useState(settings.retailUserId || 'work001');
  const [retailPassword, setRetailPassword] = useState(settings.retailPassword || 'naveenwork001');

  const handleSaveRetailCredentials = async (e) => {
    e.preventDefault();
    if (!retailUserId.trim() || !retailPassword.trim()) {
      alert('Retail User ID and Password cannot be empty.');
      return;
    }
    const finalId = retailUserId.trim();
    const finalPass = retailPassword.trim();

    try {
      const retailRecords = await pb.collection('retail_users').getFullList();
      if (retailRecords.length > 0) {
        await pb.collection('retail_users').update(retailRecords[0].id, {
          username: finalId,
          password: finalPass
        });
      } else {
        await pb.collection('retail_users').create({
          name: 'naveen',
          username: finalId,
          password: finalPass,
          active: true
        });
      }
    } catch (err) {
      console.error("Failed to save retail credentials to PocketBase:", err);
      alert('Failed to save to PocketBase.');
      return;
    }

    updateSettings({
      retailUserId: finalId,
      retailPassword: finalPass
    });
    triggerToast('Retail credentials saved');
  };

  // ── Homepage Image Management ──────────────────────────────────────────────
  const [collections, setCollections]   = useState(DEFAULT_COLLECTIONS);
  const [collImgMap, setCollImgMap]     = useState({});   // id → base64 or null
  const [posters, setPosters]           = useState(DEFAULT_POSTERS);
  const [posterImgMap, setPosterImgMap] = useState({});   // id → base64 or null
  const [imgLoading, setImgLoading]     = useState(false);

  // New-collection-add form
  const [newCollName, setNewCollName]   = useState('');
  const newCollImgRef                   = useRef(null);
  // New-poster-add form
  const [newPosterName, setNewPosterName] = useState('');
  const newPosterImgRef                   = useRef(null);

  const [actualAdminPassword, setActualAdminPassword] = useState('');

  // Load persisted lists + image previews from IndexedDB on mount
  // and load actual admin password from PocketBase
  useEffect(() => {
    (async () => {
      try {
        // Collections
        const storedCols = await getList(LIST_KEYS.COLLECTIONS);
        const cols = storedCols || DEFAULT_COLLECTIONS;
        setCollections(cols);
        const cMap = {};
        for (const c of cols) {
          const img = await getImage(collectionImageKey(c.id));
          if (img) cMap[c.id] = img;
        }
        setCollImgMap(cMap);

        // Posters
        const storedPosters = await getList(LIST_KEYS.POSTERS);
        const posts = storedPosters || DEFAULT_POSTERS;
        setPosters(posts);
        const pMap = {};
        for (const p of posts) {
          const img = await getImage(posterImageKey(p.id));
          if (img) pMap[p.id] = img;
        }
        setPosterImgMap(pMap);

        // Load admin password
        try {
          const adminPassRecords = await pb.collection('admin_password').getFullList();
          if (adminPassRecords && adminPassRecords.length > 0) {
            setActualAdminPassword(adminPassRecords[0].password);
          }
        } catch (pbErr) {
          console.warn('[Settings] Failed to load admin_password:', pbErr);
        }
      } catch (err) {
        console.error('[Settings] Failed to load homepage images:', err);
      }
    })();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const persistCollections = async (newList) => {
    setCollections(newList);
    await saveList(LIST_KEYS.COLLECTIONS, newList);
    window.dispatchEvent(new Event('homepageImagesUpdated'));
  };

  const persistPosters = async (newList) => {
    setPosters(newList);
    await saveList(LIST_KEYS.POSTERS, newList);
    window.dispatchEvent(new Event('homepageImagesUpdated'));
  };

  // Change / replace an image for a collection card
  const handleCollectionImageChange = async (id, file) => {
    if (!file) return;
    setImgLoading(true);
    try {
      const b64 = await readFileAsBase64(file);
      await saveImage(collectionImageKey(id), b64);
      setCollImgMap(prev => ({ ...prev, [id]: b64 }));
      window.dispatchEvent(new Event('homepageImagesUpdated'));
      triggerToast('Collection image updated');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save image');
    } finally {
      setImgLoading(false);
    }
  };

  // Remove custom image for a collection card (revert to default)
  const handleCollectionImageRemove = async (id) => {
    await deleteImage(collectionImageKey(id));
    setCollImgMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    window.dispatchEvent(new Event('homepageImagesUpdated'));
    triggerToast('Reverted to default image');
  };

  // Remove a collection card entirely
  const handleCollectionCardRemove = async (id) => {
    if (!confirm('Remove this collection card from the homepage?')) return;
    await deleteImage(collectionImageKey(id));
    const newList = collections.filter(c => c.id !== id);
    await persistCollections(newList);
    setCollImgMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    triggerToast('Collection card removed');
  };

  // Add a new collection card
  const handleAddCollection = async () => {
    if (!newCollName.trim()) { triggerToast('Enter a collection name'); return; }
    const file = newCollImgRef.current?.files?.[0];
    const id = `col_custom_${Date.now()}`;
    const newEntry = { id, name: newCollName.trim(), defaultImage: '' };
    let b64 = null;
    if (file) {
      b64 = await readFileAsBase64(file);
      await saveImage(collectionImageKey(id), b64);
    }
    const newList = [...collections, newEntry];
    await persistCollections(newList);
    if (b64) setCollImgMap(prev => ({ ...prev, [id]: b64 }));
    setNewCollName('');
    if (newCollImgRef.current) newCollImgRef.current.value = '';
    triggerToast('Collection card added');
  };

  // Change / replace a poster image
  const handlePosterImageChange = async (id, file) => {
    if (!file) return;
    setImgLoading(true);
    try {
      const b64 = await readFileAsBase64(file);
      await saveImage(posterImageKey(id), b64);
      setPosterImgMap(prev => ({ ...prev, [id]: b64 }));
      window.dispatchEvent(new Event('homepageImagesUpdated'));
      triggerToast('Banner image updated');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save image');
    } finally {
      setImgLoading(false);
    }
  };

  // Remove custom image for a poster (revert to default)
  const handlePosterImageRemove = async (id) => {
    await deleteImage(posterImageKey(id));
    setPosterImgMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    window.dispatchEvent(new Event('homepageImagesUpdated'));
    triggerToast('Reverted to default image');
  };

  // Remove a poster card entirely
  const handlePosterCardRemove = async (id) => {
    if (!confirm('Remove this poster/banner card?')) return;
    await deleteImage(posterImageKey(id));
    const newList = posters.filter(p => p.id !== id);
    await persistPosters(newList);
    setPosterImgMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    triggerToast('Poster removed');
  };

  // Add a new poster card
  const handleAddPoster = async () => {
    if (!newPosterName.trim()) { triggerToast('Enter a banner name'); return; }
    const file = newPosterImgRef.current?.files?.[0];
    const id = `poster_custom_${Date.now()}`;
    const newEntry = { id, name: newPosterName.trim(), defaultImage: '' };
    let b64 = null;
    if (file) {
      b64 = await readFileAsBase64(file);
      await saveImage(posterImageKey(id), b64);
    }
    const newList = [...posters, newEntry];
    await persistPosters(newList);
    if (b64) setPosterImgMap(prev => ({ ...prev, [id]: b64 }));
    setNewPosterName('');
    if (newPosterImgRef.current) newPosterImgRef.current.value = '';
    triggerToast('Banner card added');
  };

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 1500);
  };

  const [pbSettingsId, setPbSettingsId] = useState(null);

  useEffect(() => {
    const loadSettingsFromPB = async () => {
      console.log('Loading settings from PocketBase...');
      try {
        const records = await pb.collection('app_settings').getFullList();
        if (records.length > 0) {
          const record = records[0];
          console.log('Settings record found:', record);
          setPbSettingsId(record.id);
          
          const phoneVal = record.whatsapp_number || '';
          const thresholdVal = (record.low_stock_limt !== undefined && !isNaN(Number(record.low_stock_limt))) ? Number(record.low_stock_limt) : 10;
          const enabledVal = record.inventory_alert !== false;
          const bannerVal = record.banner_alert !== false;
          
          setWhatsappNumber(phoneVal);
          setLowStockThreshold(thresholdVal);
          setInventoryAlertEnabled(enabledVal);
          setBannerAlertEnabled(bannerVal);
          updateSettings({
            whatsappNumber: phoneVal,
            lowStockThreshold: thresholdVal,
            inventoryAlertEnabled: enabledVal,
            bannerAlertEnabled: bannerVal
          });
        } else {
          console.log('Creating settings record...');
          const newRecord = await pb.collection('app_settings').create({
            whatsapp_number: settings.whatsappNumber || "+919999999999",
            low_stock_limt: 10,
            inventory_alert: true,
            banner_alert: true,
            alert_data: {}
          });
          setPbSettingsId(newRecord.id);
          setWhatsappNumber(settings.whatsappNumber || "+919999999999");
        }

        // Fetch retail user credentials from retail_users collection
        const retailRecords = await pb.collection('retail_users').getFullList();
        if (retailRecords.length > 0) {
          const rRecord = retailRecords[0];
          setRetailUserId(rRecord.username);
          setRetailPassword(rRecord.password);
          updateSettings({
            retailUserId: rRecord.username,
            retailPassword: rRecord.password
          });
        }

        // Fetch admin password from admin_password collection
        try {
          const adminPassRecords = await pb.collection('admin_password').getFullList();
          if (adminPassRecords.length > 0) {
            updateSettings({
              adminPassword: adminPassRecords[0].password
            });
          }
        } catch (pbErr) {
          console.warn('[Settings] Failed to load admin_password (check API rules):', pbErr);
        }
      } catch (err) {
        console.error("Failed to load app_settings from PocketBase:", err);
      }
    };
    loadSettingsFromPB();
  }, []); // Run only on mount to fetch PB data

  // Section 1 Save
  const handleSaveWhatsapp = async (e) => {
    e.preventDefault();
    if (!whatsappNumber || !whatsappNumber.trim()) {
      alert('WhatsApp number cannot be empty.');
      return;
    }
    const finalNumber = whatsappNumber.trim();
    const finalThreshold = (lowStockThreshold !== undefined && !isNaN(Number(lowStockThreshold))) ? Number(lowStockThreshold) : 10;
    const finalEnabled = inventoryAlertEnabled !== false;
    const finalBanner = bannerAlertEnabled !== false;
    const alertData = settings.alertData || {};

    const payload = {
      whatsapp_number: finalNumber,
      low_stock_limt: finalThreshold,
      inventory_alert: finalEnabled,
      banner_alert: finalBanner,
      alert_data: alertData
    };

    // Optimistically update local react context instantly
    updateSettings({ 
      whatsappNumber: finalNumber,
      lowStockThreshold: finalThreshold,
      inventoryAlertEnabled: finalEnabled,
      bannerAlertEnabled: finalBanner
    });
    triggerToast('Settings updated');

    try {
      if (pbSettingsId) {
        console.log('Updating settings record...');
        await pb.collection('app_settings').update(pbSettingsId, payload);
      } else {
        console.log('Creating settings record...');
        const newRecord = await pb.collection('app_settings').create(payload);
        setPbSettingsId(newRecord.id);
      }
      
      console.log('Settings saved successfully.');
    } catch (err) {
      console.error("Failed to save to PocketBase:", err);
      alert('Failed to save settings to database. Please check your connection.');
      return;
    }
  };

  // Section 3 Save
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill out all password fields.');
      return;
    }
    if (currentPassword !== actualAdminPassword) {
      alert('Current password is incorrect.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const adminPassRecords = await pb.collection('admin_password').getFullList();
      if (adminPassRecords.length > 0) {
        await pb.collection('admin_password').update(adminPassRecords[0].id, {
          password: newPassword.trim()
        });
      } else {
        await pb.collection('admin_password').create({
          username: 'admin', // default fallback username if missing
          password: newPassword.trim()
        });
      }
    } catch (err) {
      console.error("Failed to save admin password to PocketBase:", err);
      alert('Failed to update password.');
      return;
    }

    alert('Password updated successfully.');
    setActualAdminPassword(newPassword.trim());
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    triggerToast('Password updated successfully');
  };

  // Section 4 actions — Excel export
  const handleExportProducts = async () => {
    try {
      const allProducts = await fetchAllProducts();
      if (!allProducts || allProducts.length === 0) {
        triggerToast('No products found to export.');
        return;
      }
      const rows = allProducts.map((p) => ({
        'Product ID':       p.id || '',
        'Model Number':     p.modelNumber || '',
        'Product Price':    p.salePrice ?? '',
        'Size Dimensions':  p.size || '',
        'Image URL(s)':     Array.isArray(p.images) ? p.images.join(', ') : (p.images || ''),
        'Created Date':     p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '',
        'Updated Date':     p.updated   ? new Date(p.updated).toLocaleDateString('en-IN')   : '',
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
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
      const allUsers = await fetchAllUsers();
      if (!allUsers || allUsers.length === 0) {
        triggerToast('No users found to export.');
        return;
      }
      const rows = allUsers.map((u) => ({
        'User ID':       u.userId || u.id || '',
        'Full Name':     u.name   || '',
        'Mobile Number': u.mobile || '',
        'Password':      u.password || '',
        'Created Date':  u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
        'Updated Date':  u.updated   ? new Date(u.updated).toLocaleDateString('en-IN')   : '',
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
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
      <div className="settings-page-header">
        <h1 className="dashboard-heading font-heading">Settings</h1>
        <p className="stats-indicator font-body">Manage application settings and homepage content.</p>
      </div>

      {/* ── Top Row: 3 Config Cards ── */}
      <div className="settings-top-grid">

        {/* Card 1: WhatsApp */}
        <div className="form-card-panel settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">💬</span>
            <div>
              <h3 className="panel-heading font-heading">WhatsApp Integration</h3>
              <p className="panel-subtext">Receive customer orders on WhatsApp.</p>
            </div>
          </div>
          <form onSubmit={handleSaveWhatsapp} className="admin-form settings-compact-form">
            <div className="form-group settings-form-group">
              <label className="form-label">WHATSAPP NUMBER</label>
              <input
                type="text"
                className="form-input settings-input"
                placeholder="+91XXXXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <span className="help-subtext">Include country code.</span>
            </div>
            <div className="form-group settings-form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">LOW STOCK THRESHOLD</label>
              <input
                type="number"
                className="form-input settings-input"
                placeholder="10"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
             <div className="form-checkboxes-row font-body" style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={inventoryAlertEnabled}
                  onChange={(e) => setInventoryAlertEnabled(e.target.checked)}
                />
                <span style={{ color: '#3b3a3a', marginLeft: '8px' }}>Enable WhatsApp Button</span>
              </label>
            </div>
            <div className="form-checkboxes-row font-body" style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={bannerAlertEnabled}
                  onChange={(e) => setBannerAlertEnabled(e.target.checked)}
                />
                <span style={{ color: '#393838', marginLeft: '8px' }}>Enable Floating Notification Card</span>
              </label>
            </div>
            <button type="submit" className="btn-primary settings-save-btn" style={{ marginTop: '20px' }}>
              Save Settings
            </button>
          </form>
        </div>

        {/* Card 2: Admin Password */}
        <div className="form-card-panel settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">🔒</span>
            <div>
              <h3 className="panel-heading font-heading">Admin Password</h3>
              <p className="panel-subtext">Change your admin login password.</p>
            </div>
          </div>
          <form onSubmit={handleSavePassword} className="admin-form settings-compact-form">
            <div className="form-group settings-form-group">
              <label className="form-label">CURRENT PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="form-input settings-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showCurrentPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group settings-form-group">
              <label className="form-label">NEW PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-input settings-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group settings-form-group">
              <label className="form-label">CONFIRM NEW PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input settings-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary settings-save-btn">
              Update Password
            </button>
          </form>
        </div>

        {/* Card 3: Data Management */}
        <div className="form-card-panel settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">📊</span>
            <div>
              <h3 className="panel-heading font-heading">Data Management</h3>
              <p className="panel-subtext">Export data or clear sessions.</p>
            </div>
          </div>
          <div className="data-management-actions-col">
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
            <button onClick={handleClearCarts} className="btn-secondary data-manage-btn font-body data-manage-btn--danger">
              🗑️ &nbsp; Clear All Cart Sessions
            </button>
          </div>
        </div>

        {/* Card 4: Retail Portal Credentials */}
        <div className="form-card-panel settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">🔑</span>
            <div>
              <h3 className="panel-heading font-heading">Retail Credentials</h3>
              <p className="panel-subtext">Manage User ID and password for retail users.</p>
            </div>
          </div>
          <form onSubmit={handleSaveRetailCredentials} className="admin-form settings-compact-form">
            <div className="form-group settings-form-group">
              <label className="form-label">RETAIL USER ID</label>
              <input
                type="text"
                className="form-input settings-input"
                placeholder="work001"
                value={retailUserId}
                onChange={(e) => setRetailUserId(e.target.value)}
              />
            </div>
            <div className="form-group settings-form-group">
              <label className="form-label">RETAIL PASSWORD</label>
              <input
                type="text"
                className="form-input settings-input"
                placeholder="naveenwork001"
                value={retailPassword}
                onChange={(e) => setRetailPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary settings-save-btn">
              Save Credentials
            </button>
          </form>
        </div>

      </div>

      {/* ── Homepage Image Management Section ── */}
      <div className="hpm-section-card">

        {/* Section Header */}
        <div className="hpm-section-header">
          <div>
            <h2 className="hpm-section-title font-heading">Homepage Image Management</h2>
            <p className="hpm-section-desc font-body">Manage collection cards and banners shown on the customer homepage. Changes take effect instantly.</p>
          </div>
        </div>

        {imgLoading && (
          <div className="hpm-loading-bar"><span className="hpm-loading-bar-inner" /></div>
        )}

        {/* ── Collection Images Sub-section ── */}
        <div className="hpm-subsection">
          <div className="hpm-sub-label">
            <span className="hpm-sub-dot hpm-sub-dot--blue"></span>
            <span className="hpm-sub-title font-heading">Collection Images</span>
            <span className="hpm-sub-count">{collections.length} items</span>
          </div>

          <div className="hpm-cards-grid">
            {collections.map((col) => {
              const previewSrc = collImgMap[col.id] || col.defaultImage || null;
              return (
                <div key={col.id} className="hpm-img-card">
                  <div className="hpm-img-preview-wrap">
                    {previewSrc
                      ? <img src={previewSrc} alt={col.name} className="hpm-img-preview" />
                      : <div className="hpm-img-empty">No Image</div>
                    }
                    {collImgMap[col.id] && (
                      <span className="hpm-custom-badge">Custom</span>
                    )}
                  </div>
                  <div className="hpm-card-body">
                    <p className="hpm-card-name font-heading">{col.name}</p>
                    <div className="hpm-card-actions">
                      <label className="hpm-btn hpm-btn-change">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }}
                          onChange={(e) => handleCollectionImageChange(col.id, e.target.files?.[0])}
                        />
                      </label>
                      {collImgMap[col.id] && (
                        <button className="hpm-btn hpm-btn-revert" onClick={() => handleCollectionImageRemove(col.id)}>Revert</button>
                      )}
                      <button className="hpm-btn hpm-btn-remove" onClick={() => handleCollectionCardRemove(col.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new collection card */}
            <div className="hpm-img-card hpm-add-card">
              <div className="hpm-img-preview-wrap hpm-add-preview">
                <div className="hpm-img-empty hpm-add-placeholder">
                  <span className="hpm-add-icon">＋</span>
                  <span>New Collection</span>
                </div>
              </div>
              <div className="hpm-card-body">
                <input
                  type="text"
                  className="form-input hpm-name-input"
                  placeholder="Collection name…"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                />
                <label className="hpm-btn hpm-btn-change">
                  Choose Image
                  <input type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }} ref={newCollImgRef} />
                </label>
                <button className="hpm-btn hpm-btn-add" onClick={handleAddCollection}>Add Collection</button>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hpm-divider"></div>

        {/* ── Poster / Banner Images Sub-section ── */}
        <div className="hpm-subsection">
          <div className="hpm-sub-label">
            <span className="hpm-sub-dot hpm-sub-dot--green"></span>
            <span className="hpm-sub-title font-heading">Poster / Banner Images</span>
            <span className="hpm-sub-count">{posters.length} items</span>
          </div>

          <div className="hpm-cards-grid hpm-banner-grid">
            {posters.map((poster) => {
              const previewSrc = posterImgMap[poster.id] || poster.defaultImage || null;
              return (
                <div key={poster.id} className="hpm-img-card">
                  <div className="hpm-img-preview-wrap hpm-poster-preview">
                    {previewSrc
                      ? <img src={previewSrc} alt={poster.name} className="hpm-img-preview" />
                      : <div className="hpm-img-empty">No Image</div>
                    }
                    {posterImgMap[poster.id] && (
                      <span className="hpm-custom-badge">Custom</span>
                    )}
                  </div>
                  <div className="hpm-card-body">
                    <p className="hpm-card-name font-heading">{poster.name}</p>
                    <div className="hpm-card-actions">
                      <label className="hpm-btn hpm-btn-change">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }}
                          onChange={(e) => handlePosterImageChange(poster.id, e.target.files?.[0])}
                        />
                      </label>
                      {posterImgMap[poster.id] && (
                        <button className="hpm-btn hpm-btn-revert" onClick={() => handlePosterImageRemove(poster.id)}>Revert</button>
                      )}
                      <button className="hpm-btn hpm-btn-remove" onClick={() => handlePosterCardRemove(poster.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </div>

      </div>
      {/* ── end Homepage Image Management ── */}

      <style>{`

        /* ═══════════════════════════════════════════════
           SETTINGS PAGE ROOT
        ═══════════════════════════════════════════════ */
        .admin-settings-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .settings-page-header {
          margin-bottom: 4px;
        }

        /* ═══════════════════════════════════════════════
           TOP ROW — 3 CONFIG CARDS
        ═══════════════════════════════════════════════ */
        .settings-top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .settings-top-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 700px) {
          .settings-top-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Settings Card */
        .settings-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .settings-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .settings-card-icon {
          font-size: 20px;
          line-height: 1;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .panel-heading {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px 0;
          line-height: 1.2;
        }

        .panel-subtext {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }

        /* Compact form inside settings cards */
        .settings-compact-form {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .settings-form-group {
          margin-bottom: 12px !important;
        }

        .settings-input {
          height: 40px !important;
          font-size: 13px !important;
        }

        .help-subtext {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .settings-save-btn {
          height: 38px;
          padding: 0 20px;
          font-size: 11px;
          letter-spacing: 0.08em;
          align-self: flex-start;
          margin-top: 2px;
          border-radius: 3px;
        }

        @media (max-width: 700px) {
          .settings-save-btn {
            width: 100%;
            align-self: stretch;
          }
        }

        /* Data Management buttons */
        .data-management-actions-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .data-manage-btn {
          width: 100%;
          height: 40px;
          font-size: 11px;
          justify-content: flex-start;
          padding: 0 14px;
          border-radius: 3px;
          letter-spacing: 0.05em;
        }

        .data-manage-btn--danger {
          border-color: #EF4444 !important;
          color: #EF4444 !important;
        }
        .data-manage-btn--danger:hover {
          background-color: #EF4444 !important;
          color: #ffffff !important;
        }

        @media (max-width: 700px) {
          .data-manage-btn {
            height: auto;
            min-height: 44px;
            padding: 10px 14px;
            white-space: normal;
            text-align: left;
          }
        }

        /* Toast */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #1A2332;
          color: #ffffff;
          padding: 10px 22px;
          border-radius: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          z-index: 3000;
          font-size: 13px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Export button states */
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
          opacity: 0.72;
          cursor: not-allowed;
          pointer-events: none;
        }

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

        /* ═══════════════════════════════════════════════
           HOMEPAGE IMAGE MANAGEMENT — SECTION CARD
        ═══════════════════════════════════════════════ */
        .hpm-section-card {
          background: #ffffff;
          border: 1.5px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--card-shadow);
          overflow: hidden;
        }

        .hpm-section-header {
          padding: 18px 24px 16px;
          border-bottom: 1.5px solid var(--border-color);
          background: linear-gradient(135deg, #F8FAFD 0%, #ffffff 100%);
        }

        .hpm-section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 3px 0;
          line-height: 1.2;
        }

        .hpm-section-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }

        /* Loading bar */
        .hpm-loading-bar {
          width: 100%;
          height: 3px;
          background: #EDF2F7;
          overflow: hidden;
        }
        .hpm-loading-bar-inner {
          display: block;
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, #1A2332, #4A7FC1);
          animation: hpmSlide 1s ease infinite;
        }
        @keyframes hpmSlide {
          0%   { margin-left: -40%; }
          100% { margin-left: 140%; }
        }

        /* Sub-section padding */
        .hpm-subsection {
          padding: 20px 24px;
        }

        .hpm-divider {
          height: 1px;
          background: var(--border-color);
          margin: 0 24px;
        }

        /* Sub-section label row */
        .hpm-sub-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .hpm-sub-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .hpm-sub-dot--blue  { background: #4A7FC1; }
        .hpm-sub-dot--green { background: #16A34A; }

        .hpm-sub-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.01em;
        }

        .hpm-sub-count {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: #F1F5F9;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: auto;
          letter-spacing: 0.03em;
        }

        /* Image Cards Grid */
        .hpm-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 16px;
        }

        .hpm-banner-grid {
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        @media (max-width: 768px) {
          .hpm-cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
          }
          .hpm-banner-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
          .hpm-subsection {
            padding: 16px;
          }
          .hpm-divider {
            margin: 0 16px;
          }
          .hpm-section-header {
            padding: 14px 16px 12px;
          }
        }

        /* Image Card */
        .hpm-img-card {
          background: #ffffff;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(26,35,50,0.05);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .hpm-img-card:hover {
          box-shadow: 0 5px 18px rgba(26,35,50,0.10);
          transform: translateY(-2px);
        }

        .hpm-add-card {
          border-style: dashed;
          border-color: #4A7FC1;
          background: rgba(74,127,193,0.025);
        }
        .hpm-add-card:hover {
          background: rgba(74,127,193,0.05);
          transform: none;
          box-shadow: none;
        }

        /* Image Preview Area */
        .hpm-img-preview-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4/5;
          overflow: hidden;
          background: #F7F9FC;
          flex-shrink: 0;
        }
        .hpm-poster-preview {
          aspect-ratio: 16/9;
        }
        .hpm-add-preview {
          background: rgba(74,127,193,0.04);
        }

        .hpm-img-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hpm-img-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #94A3B8;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-align: center;
          padding: 8px;
        }

        .hpm-add-placeholder {
          flex-direction: column;
          gap: 4px;
          color: #4A7FC1;
        }

        .hpm-add-icon {
          font-size: 22px;
          line-height: 1;
          font-weight: 300;
        }

        .hpm-custom-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #1A2332;
          color: #ffffff;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 8px;
        }

        /* Card Body */
        .hpm-card-body {
          padding: 10px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .hpm-card-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hpm-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        /* Action Buttons */
        .hpm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 5px 9px;
          border-radius: 3px;
          border: 1.5px solid transparent;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.18s ease;
          white-space: nowrap;
          line-height: 1;
          background: none;
        }

        .hpm-btn-change {
          border-color: #1A2332;
          color: #1A2332;
        }
        .hpm-btn-change:hover {
          background: #1A2332;
          color: #ffffff;
        }

        .hpm-btn-revert {
          border-color: #64748B;
          color: #64748B;
        }
        .hpm-btn-revert:hover {
          background: #64748B;
          color: #ffffff;
        }

        .hpm-btn-remove {
          border-color: #EF4444;
          color: #EF4444;
        }
        .hpm-btn-remove:hover {
          background: #EF4444;
          color: #ffffff;
        }

        .hpm-btn-add {
          border-color: #16A34A;
          color: #16A34A;
        }
        .hpm-btn-add:hover {
          background: #16A34A;
          color: #ffffff;
        }

        .hpm-name-input {
          height: 34px !important;
          font-size: 12px !important;
          padding: 0 10px !important;
        }

      `}</style>
    </div>
  );
};

export default AdminSettings;
