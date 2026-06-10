import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

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

  // Refresh/refetch users when opening Users page
  React.useEffect(() => {
    refreshUsers().catch(err => console.error('[AdminUsers] Failed to refresh users:', err));
  }, [refreshUsers]);

  // Reveal password list tracker
  const [revealedPasswords, setRevealedPasswords] = useState({}); // userId -> boolean

  // Create/Edit User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalForm, setModalForm] = useState({
    userId: '', name: '', mobile: '', password: '', confirmPassword: ''
  });
  
  // Track if this is creating credentials from a pending registration request
  const [pendingRegIdToApprove, setPendingRegIdToApprove] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const togglePasswordReveal = (userId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Status toggle switch
  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await updateUserStatus(userId, newStatus);
    await refreshUsers();
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
    const nextSeq = users.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    
    setModalForm({
      userId: `LUM-${padded}`,
      name: '',
      mobile: '',
      password: '',
      confirmPassword: ''
    });
    setShowUserModal(true);
  };

  // Handle open credentials creation for pending user
  const handleApprovePendingClick = (reg) => {
    setIsEditing(false);
    setPendingRegIdToApprove(reg.id);

    const nextSeq = users.length + 1;
    const padded = String(nextSeq).padStart(3, '0');

    setModalForm({
      userId: `LUM-${padded}`,
      name: reg.name,
      mobile: reg.mobile,
      password: '',
      confirmPassword: ''
    });
    setShowUserModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();

    if (!modalForm.userId.trim() || !modalForm.name.trim() || !modalForm.mobile.trim() || !modalForm.password) {
      alert('All fields are required.');
      return;
    }

    if (modalForm.password !== modalForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // Indian Mobile regex
    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(modalForm.mobile.replace(/[\s-()]/g, ''))) {
      alert('Please enter a valid Indian mobile number.');
      return;
    }

    // Check if user ID already exists
    const userIdExists = users.some(u => u.userId.toLowerCase() === modalForm.userId.trim().toLowerCase());
    if (userIdExists && !isEditing) {
      alert(`User ID ${modalForm.userId} already exists in database. Try overriding.`);
      return;
    }

    if (pendingRegIdToApprove) {
      // Approve from self registration request
      await approveRegistration(pendingRegIdToApprove, modalForm.userId.trim(), modalForm.password);
    } else {
      // Manual create
      await createUser({
        userId: modalForm.userId.trim(),
        name: modalForm.name.trim(),
        mobile: modalForm.mobile.replace(/[\s-()]/g, ''),
        password: modalForm.password,
        status: 'active'
      });
    }

    await refreshUsers();

    setShowUserModal(false);
    alert('Client account created successfully!');
  };

  // WhatsApp Share builder
  const handleShareCredentials = (user) => {
    const cleanPhone = user.mobile.replace(/[^0-9]/g, '');
    const message = `Welcome to ${settings.storeName}! Your login credentials:
User ID: ${user.userId}
Password: ${user.password}
Login at: ${settings.websiteUrl}/#/login`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const newWindow = window.open(url, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = url;
    }
  };

  // Filter Active list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      return u.name.toLowerCase().includes(q) || 
             u.userId.toLowerCase().includes(q) || 
             u.mobile.includes(q);
    });
  }, [users, searchQuery]);

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

      {/* Tabs list (Registered users vs Self registrations requests) */}
      <div className="users-tabs-bar">
        
        <div className="subtabs-group">
          <button 
            className={`subtab-btn uppercase-label ${activeSubtab === 'USERS' ? 'active-subtab' : ''}`}
            onClick={() => setActiveSubtab('USERS')}
          >
            Registered Users ({users.length})
          </button>
          <button 
            className={`subtab-btn uppercase-label ${activeSubtab === 'PENDING' ? 'active-subtab' : ''}`}
            onClick={() => setActiveSubtab('PENDING')}
            style={{ position: 'relative' }}
          >
            Pending Registrations ({pendingRegistrations.length})
            {pendingRegistrations.length > 0 && (
              <span className="pending-badge-count">{pendingRegistrations.length}</span>
            )}
          </button>
        </div>

        {/* Search bar - only shown for active user lists */}
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
                    <tr key={u.userId}>
                      <td><code>{u.userId}</code></td>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong></td>
                      <td>{u.mobile}</td>
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
                          onClick={() => handleToggleStatus(u.userId, u.status)}
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
                            onClick={async () => {
                              if (confirm(`Delete account for ${u.name}? This will remove their cart history.`)) {
                                await deleteUser(u.userId);
                                await refreshUsers();
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SUBTAB 2: PENDING SELF REGISTRATIONS */}
      {activeSubtab === 'PENDING' && (
        <div className="table-container-card">
          {pendingRegistrations.length === 0 ? (
            <div className="empty-table-state font-body">
              No pending registration requests.
            </div>
          ) : (
            <table className="admin-table pending-regs-table">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Full Name</th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.map(reg => (
                  <tr key={reg.id}>
                    <td>{new Date(reg.registeredAt).toLocaleString()}</td>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{reg.name}</strong></td>
                    <td>{reg.mobile}</td>
                    <td>
                      <span className="pending-badge font-body">PENDING CREDENTIALS</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-row">
                        <button 
                          onClick={() => handleApprovePendingClick(reg)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '11px', height: '32px' }}
                        >
                          Create Credentials
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Delete registration request from ${reg.name}?`)) {
                              await deleteRegistrationRequest(reg.id);
                              await refreshUsers();
                            }
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px', height: '32px', borderColor: '#EF4444', color: '#EF4444' }}
                        >
                          Delete Request
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
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in" style={{ maxWidth: '440px' }}>
            
            <h3 className="modal-title font-heading" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', textAlign: 'left' }}>
              Create Login Credentials
            </h3>

            <form onSubmit={handleModalSubmit} className="admin-form" style={{ marginTop: '20px', textAlign: 'left' }}>
              
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
