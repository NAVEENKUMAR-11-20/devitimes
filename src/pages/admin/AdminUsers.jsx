import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import pb from '../../lib/pocketbase';

const AdminUsers = ({ initialTab = 'USERS' }) => {
  const { 
    users, 
    pendingRegistrations, 
    createUser, 
    updateUserStatus, 
    deleteUser, 
    approveRegistration, 
    deleteRegistrationRequest,
    refreshUsers,
    settings 
  } = useApp();

  // Navigation Subtabs: 'USERS' (Active clients), 'PENDING' (Self registrations)
  const [activeSubtab, setActiveSubtab] = useState(initialTab);

  // Sync active tab whenever routing prop shifts
  React.useEffect(() => {
    setActiveSubtab(initialTab);
  }, [initialTab]);

  // Reveal password list tracker
  const [revealedPasswords, setRevealedPasswords] = useState({}); // userId -> boolean

  // Create/Edit User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalForm, setModalForm] = useState({
    userType: 'Wholesale', // 'Wholesale' or 'Retail'
    userId: '',
    name: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    status: 'active' // 'active' or 'suspended'
  });
  
  // Track if this is creating credentials from a pending registration request
  const [pendingRegIdToApprove, setPendingRegIdToApprove] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Retail users state
  const [retailUsers, setRetailUsers] = useState([]);
  const [loadingRetail, setLoadingRetail] = useState(false);

  // Fetch retail users
  const fetchRetailUsers = async () => {
    try {
      const records = await pb.collection('retail_users').getFullList({ sort: '-created' });
      return records.map(r => {
        const nameStr = r.name || '';
        const parts = nameStr.split(' | ');
        const name = parts[0] || '';
        const mobile = parts[1] || '';
        
        return {
          id: r.id,
          pbId: r.id,
          userId: r.username,
          name: name,
          mobile: mobile,
          password: r.password || '',
          status: r.active ? 'active' : 'suspended',
          createdAt: r.created,
          userType: 'Retail'
        };
      });
    } catch (err) {
      console.error('[AdminUsers] Failed to fetch retail users:', err);
      return [];
    }
  };

  // Load Wholesale & Retail data
  const loadAllData = React.useCallback(async () => {
    setLoadingRetail(true);
    try {
      await refreshUsers();
      const ru = await fetchRetailUsers();
      setRetailUsers(ru);
    } catch (err) {
      console.error('[AdminUsers] Failed to load data:', err);
    } finally {
      setLoadingRetail(false);
    }
  }, [refreshUsers]);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Combine Wholesale & Retail
  const mappedWholesaleUsers = useMemo(() => {
    return users.map(u => ({
      ...u,
      userType: 'Wholesale'
    }));
  }, [users]);

  const allUsers = useMemo(() => {
    return [...mappedWholesaleUsers, ...retailUsers];
  }, [mappedWholesaleUsers, retailUsers]);

  // Filter combined list
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      return u.name.toLowerCase().includes(q) || 
             u.userId.toLowerCase().includes(q) || 
             u.mobile.includes(q) ||
             u.userType.toLowerCase().includes(q);
    });
  }, [allUsers, searchQuery]);

  const togglePasswordReveal = (userId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Status toggle switch (unified)
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (user.userType === 'Retail') {
      try {
        await pb.collection('retail_users').update(user.pbId, {
          active: newStatus === 'active'
        });
        await loadAllData();
      } catch (err) {
        console.error('[AdminUsers] Failed to update retail status:', err);
        alert('Failed to update status in PocketBase');
      }
    } else {
      await updateUserStatus(user.userId, newStatus);
      await loadAllData();
    }
  };

  // Delete user (unified)
  const handleDeleteUser = async (user) => {
    if (confirm(`Delete account for ${user.name}? This will remove their history.`)) {
      if (user.userType === 'Retail') {
        try {
          await pb.collection('retail_users').delete(user.pbId);
          await loadAllData();
        } catch (err) {
          console.error('[AdminUsers] Failed to delete retail user:', err);
          alert('Failed to delete user in PocketBase');
        }
      } else {
        await deleteUser(user.userId);
        await loadAllData();
      }
    }
  };

  // Generate 8-character random password helper
  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setModalForm(prev => ({
      ...prev,
      password: pass,
      confirmPassword: pass
    }));
  };

  // Handle open user creation modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setPendingRegIdToApprove(null);
    
    // Auto suggest User ID (LUM- + sequential number)
    const nextSeq = allUsers.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    
    setModalForm({
      userType: 'Wholesale',
      userId: `LUM-${padded}`,
      name: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      status: 'active'
    });
    setShowUserModal(true);
  };

  // Handle open credentials creation for pending user
  const handleApprovePendingClick = (reg) => {
    setIsEditing(false);
    setPendingRegIdToApprove(reg.id);

    const nextSeq = allUsers.length + 1;
    const padded = String(nextSeq).padStart(3, '0');

    setModalForm({
      userType: 'Wholesale',
      userId: `LUM-${padded}`,
      name: reg.name,
      mobile: reg.mobile,
      password: '',
      confirmPassword: '',
      status: 'active'
    });
    setShowUserModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();

    const userIdVal = modalForm.userId.trim();
    const nameVal = modalForm.name.trim();
    const mobileVal = modalForm.mobile.replace(/[\s-()]/g, '');
    const passwordVal = modalForm.password;
    const confirmVal = modalForm.confirmPassword;
    const typeVal = modalForm.userType;
    const statusVal = modalForm.status;

    if (!userIdVal || !nameVal || !mobileVal || !passwordVal || !confirmVal) {
      alert('All fields are required.');
      return;
    }

    if (passwordVal !== confirmVal) {
      alert('Passwords do not match.');
      return;
    }

    // Indian Mobile regex
    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(mobileVal)) {
      alert('Please enter a valid Indian mobile number.');
      return;
    }

    // Check if User ID already exists (case-insensitive)
    const userIdExists = allUsers.some(u => u.userId.toLowerCase() === userIdVal.toLowerCase());
    if (userIdExists) {
      alert(`User ID "${userIdVal}" already exists. Please choose a unique User ID.`);
      return;
    }

    // Check if Mobile Number already exists
    const mobileExists = allUsers.some(u => u.mobile.replace(/[\s-()]/g, '') === mobileVal);
    if (mobileExists) {
      alert(`Mobile number "${mobileVal}" is already registered. Please use a unique mobile number.`);
      return;
    }

    try {
      if (pendingRegIdToApprove) {
        // Approve from self registration request
        await approveRegistration(pendingRegIdToApprove, userIdVal, passwordVal);
      } else {
        if (typeVal === 'Retail') {
          // Save to retail_users collection in PB
          await pb.collection('retail_users').create({
            username: userIdVal,
            name: `${nameVal} | ${mobileVal}`,
            password: passwordVal,
            active: statusVal === 'active'
          });
        } else {
          // Manual create Wholesale
          await createUser({
            userId: userIdVal,
            name: nameVal,
            mobile: mobileVal,
            password: passwordVal,
            status: statusVal
          });
        }
      }

      await loadAllData();
      setShowUserModal(false);
      alert('Client account created successfully!');
    } catch (err) {
      console.error('[AdminUsers] Failed to submit form:', err);
      alert('Failed to save user. Please check if fields are valid.');
    }
  };

  // WhatsApp Share builder
  const handleShareCredentials = (user) => {
    const cleanPhone = user.mobile.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Mobile number is not available.');
      return;
    }
    const message = `Welcome to ${settings.storeName}! Your login credentials:
User ID: ${user.userId}
Password: ${user.password}
Login at: ${settings.websiteUrl}/#/${user.userType === 'Retail' ? 'retail-login' : 'login'}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const newWindow = window.open(url, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = url;
    }
  };

  // Listen to Escape key to close modal & prevent background scroll
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUserModal(false);
      }
    };
    if (showUserModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showUserModal]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      setShowUserModal(false);
    }
  };

  return (
    <div className="admin-users-root font-body">
      
      {/* Header bar */}
      <div className="products-header-row" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="dashboard-heading font-heading">User Management</h1>
          <p className="stats-indicator font-body">
            Manage clients, generate sign-in passwords, and approve incoming registrations.
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '12px' }}>
          ➕ &nbsp; CREATE NEW USER
        </button>
      </div>

      {/* Tabs list (Registered users & Pending) */}
      <div className="users-tabs-bar">
        
        <div className="subtabs-group">
          <span 
            className={`subtab-btn uppercase-label ${activeSubtab === 'USERS' ? 'active-subtab' : ''}`}
            onClick={() => setActiveSubtab('USERS')}
            style={{ cursor: 'pointer' }}
          >
            Registered Users ({allUsers.length})
          </span>
          <span 
            className={`subtab-btn uppercase-label ${activeSubtab === 'PENDING' ? 'active-subtab' : ''}`}
            onClick={() => setActiveSubtab('PENDING')}
            style={{ cursor: 'pointer' }}
          >
            Pending Registrations ({pendingRegistrations.length})
            {pendingRegistrations.length > 0 && (
              <span className="pending-badge-count">{pendingRegistrations.length}</span>
            )}
          </span>
        </div>

        {/* Search bar */}
        {activeSubtab === 'USERS' && (
          <div className="search-users-wrapper">
            <input 
              type="text" 
              placeholder="Search by name, ID or mobile..." 
              className="form-input search-users-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

      </div>

      {/* SUBTAB 1: REGISTERED USER GRID LIST */}
      {activeSubtab === 'USERS' && (
        <div className="table-container-card">
          {filteredUsers.length === 0 ? (
            <div className="empty-table-state font-body">
              No registered users found.
            </div>
          ) : (
            <table className="admin-table registered-users-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>User Type</th>
                  <th>Full Name</th>
                  <th>Mobile Number</th>
                  <th>Password</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const showPass = revealedPasswords[u.userId] || false;
                  
                  return (
                    <tr key={u.userId || u.id}>
                      <td><code>{u.userId}</code></td>
                      <td>
                        <span className={`user-type-tag ${u.userType.toLowerCase()}`}>
                          {u.userType}
                        </span>
                      </td>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong></td>
                      <td>{u.mobile || '-'}</td>
                      <td>
                        <div className="password-cell-wrapper">
                          <span>{showPass ? u.password : '••••••••'}</span>
                          <button 
                            onClick={() => togglePasswordReveal(u.userId)}
                            className="reveal-pass-btn"
                            title="Reveal Password"
                          >
                            {showPass ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        {/* Account Status Switch */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`status-toggle-switch ${u.status === 'active' ? 'live-switch' : 'hidden-switch'}`}
                        >
                          <span className="toggle-slider"></span>
                          <span className="toggle-label-text">
                            {u.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions-row">
                          <button 
                            onClick={() => handleShareCredentials(u)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '10px', height: '28px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Share via WA 📱
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u)}
                            className="action-icon-btn delete-btn"
                            style={{ width: '28px', height: '28px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SUBTAB 2: PENDING REGISTRATION LIST */}
      {activeSubtab === 'PENDING' && (
        <div className="table-container-card">
          {pendingRegistrations.length === 0 ? (
            <div className="empty-table-state font-body">
              No pending registrations found.
            </div>
          ) : (
            <table className="admin-table pending-regs-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Mobile Number</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.map(reg => (
                  <tr key={reg.id}>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{reg.name}</strong></td>
                    <td>{reg.mobile}</td>
                    <td>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                    <td>
                      <span className="pending-badge">Pending</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-row">
                        <button 
                          onClick={() => handleApprovePendingClick(reg)}
                          className="btn-primary"
                          style={{ padding: '4px 8px', fontSize: '10px', height: '28px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        >
                          Approve ✅
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Reject/Delete registration request for ${reg.name}?`)) {
                              await deleteRegistrationRequest(reg.id);
                            }
                          }}
                          className="action-icon-btn delete-btn"
                          style={{ width: '28px', height: '28px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- CREATE USER MODAL OVERLAY --- */}
      {showUserModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-card animate-fade-in" style={{ maxWidth: '440px' }}>
            <button className="modal-close-btn" onClick={() => setShowUserModal(false)}>×</button>
            
            <h3 className="modal-title font-heading" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', textAlign: 'left' }}>
              Create Login Credentials
            </h3>

            <form onSubmit={handleModalSubmit} className="admin-form" style={{ marginTop: '20px', textAlign: 'left' }}>
              
              {/* User Type */}
              <div className="form-group">
                <label className="form-label">USER TYPE *</label>
                <select 
                  className="form-input"
                  value={modalForm.userType}
                  onChange={(e) => setModalForm(prev => ({ ...prev, userType: e.target.value }))}
                  disabled={!!pendingRegIdToApprove}
                >
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>

              {/* User ID */}
              <div className="form-group">
                <label className="form-label">USER ID *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={modalForm.userId}
                  onChange={(e) => setModalForm(prev => ({ ...prev, userId: e.target.value }))}
                />
                <span className="help-subtext font-body">Common User ID format LUM-XXX</span>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">FULL NAME *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={modalForm.name}
                  onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!!pendingRegIdToApprove}
                />
              </div>

              {/* Mobile */}
              <div className="form-group">
                <label className="form-label">MOBILE NUMBER *</label>
                <input 
                  type="tel" 
                  className="form-input"
                  value={modalForm.mobile}
                  onChange={(e) => setModalForm(prev => ({ ...prev, mobile: e.target.value }))}
                  disabled={!!pendingRegIdToApprove}
                />
              </div>

              {/* Password Generator group */}
              <div className="form-group">
                <label className="form-label">PASSWORD *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input"
                    value={modalForm.password}
                    onChange={(e) => setModalForm(prev => ({ ...prev, password: e.target.value, confirmPassword: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={handleGeneratePassword} 
                    className="btn-secondary"
                    style={{ height: '44px', fontSize: '11px', padding: '0 12px', flexShrink: 0 }}
                  >
                    Auto-Gen
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">CONFIRM PASSWORD *</label>
                <input 
                  type="password" 
                  className="form-input"
                  value={modalForm.confirmPassword}
                  onChange={(e) => setModalForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">STATUS *</label>
                <select 
                  className="form-input"
                  value={modalForm.status}
                  onChange={(e) => setModalForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Inactive</option>
                </select>
              </div>

              {/* Notice */}
              <p className="auth-helper-disclaimer font-body" style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '16px 0', textAlign: 'center' }}>
                💡 Share these credentials with the user via WhatsApp or call.
              </p>

              {/* Actions */}
              <div className="modal-actions-row">
                <button type="submit" className="btn-primary modal-btn">
                  CREATE USER
                </button>
                <button 
                  type="button" 
                  className="btn-secondary modal-btn"
                  onClick={() => setShowUserModal(false)}
                >
                  CANCEL
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      <style>{`
        .admin-users-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Tabs list styling */
        .users-tabs-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .subtabs-group {
          display: flex;
          gap: 24px;
        }

        .subtab-btn {
          height: 36px;
          font-size: 12px;
          color: var(--text-muted);
          position: relative;
          padding: 0 4px;
        }

        .subtab-btn:hover {
          color: var(--text-primary);
        }

        .active-subtab {
          color: var(--accent-blue) !important;
          border-bottom: 2px solid var(--accent-blue);
          font-weight: 700;
        }

        .pending-badge-count {
          position: absolute;
          top: -8px;
          right: -16px;
          background-color: #EF4444;
          color: white;
          font-size: 9px;
          font-weight: bold;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-users-input {
          height: 36px;
          font-size: 12px;
          width: 240px;
        }

        /* User Type tag styles */
        .user-type-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .user-type-tag.wholesale {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
        .user-type-tag.retail {
          background-color: #fdf2f8;
          color: #9d174d;
          border: 1px solid #fbcfe8;
        }

        /* --- Updated Professional Table Styles --- */
        .table-container-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--card-shadow);
          overflow-x: auto;
          margin-top: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .registered-users-table {
          min-width: 1000px;
        }

        .pending-regs-table {
          min-width: 800px;
        }

        .admin-table th {
          background-color: #f8fafc;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 16px 20px;
          border-bottom: 2px solid var(--border-color);
          vertical-align: middle;
        }

        .admin-table td {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 13px;
          vertical-align: middle;
          height: 60px;
          box-sizing: border-box;
        }

        /* Alternating row backgrounds and subtle hover effect */
        .admin-table tbody tr {
          transition: background-color 0.2s ease;
        }

        .admin-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .admin-table tbody tr:hover {
          background-color: #f1f5f9 !important;
        }

        /* Password cell consistent width */
        .password-cell-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 140px;
          min-width: 140px;
          max-width: 140px;
          justify-content: space-between;
        }

        .password-cell-wrapper span {
          font-family: monospace;
          font-size: 13px;
          letter-spacing: 0.05em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reveal-pass-btn {
          font-size: 14px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .reveal-pass-btn:hover {
          color: var(--text-primary);
        }

        /* Status switches and badges styled cleanly */
        .status-toggle-switch {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          border: none;
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          transition: all 0.2s ease;
        }

        .live-switch {
          background-color: #d1fae5;
          color: #065f46;
        }

        .hidden-switch {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .toggle-slider {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;
        }

        .toggle-label-text {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .pending-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: #92400e;
          background-color: #fef3c7;
          padding: 6px 12px;
          border-radius: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

         /* Actions layout alignment */
        .table-actions-row {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
          white-space: nowrap;
          flex-wrap: nowrap;
        }

        .table-actions-row button {
          touch-action: manipulation;
          cursor: pointer;
        }

        /* Modal popup dialog styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-card {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          max-width: 440px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: #F1F5F9;
          color: #64748B;
          border-radius: 50%;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .modal-close-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        @media (max-width: 768px) {
          .products-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .products-header-row button {
            width: 100%;
          }
          .users-tabs-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          .subtabs-group {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
            gap: 16px;
          }
          .search-users-wrapper, .search-users-input {
            width: 100%;
          }
          .table-container-card {
            overflow-x: auto;
            width: 100%;
          }
          .admin-table {
            white-space: nowrap;
          }
          .admin-table th, .admin-table td {
            padding: 12px 16px;
          }
          
          /* Enforce 44px touch targets on mobile actions column */
          .table-actions-row {
            gap: 12px !important;
          }
          
          .table-actions-row button,
          .table-actions-row .btn-secondary,
          .table-actions-row .action-icon-btn.delete-btn {
            height: 44px !important;
            min-height: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            touch-action: manipulation !important;
            cursor: pointer !important;
            box-sizing: border-box !important;
          }
          
          .table-actions-row .btn-secondary {
            padding: 0 16px !important;
            font-size: 11px !important;
          }
          
          .table-actions-row .action-icon-btn.delete-btn {
            width: 44px !important;
            min-width: 44px !important;
            font-size: 16px !important;
          }

          .modal-card {
            width: 95vw !important;
            padding: 20px;
          }
          .form-group input, .form-group .form-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;
