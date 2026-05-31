import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const AdminLogin = () => {
  const { loginAdmin, isAdminAuthenticated } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // If already authenticated, bypass login gate
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAdminAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in both fields.');
      return;
    }

    const success = loginAdmin(username.trim(), password);
    if (success) {
      navigate('/admin/dashboard');
    } else {
      setError('Invalid Admin credentials. Access Denied.');
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card animate-fade-in">
        
        {/* Header indicator */}
        <div className="admin-login-header">
          <span className="admin-badge uppercase-label">ADMIN PANEL</span>
          <h1 className="admin-brand font-logo">LUMIÈRE</h1>
          <p className="admin-sub font-body">Sign in to control shop inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          
          {error && (
            <div className="admin-error-banner font-body">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="form-group">
            <label className="form-label font-body">USERNAME</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label font-body">PASSWORD</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary full-width-btn admin-submit-btn">
            ACCESS DASHBOARD
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="#/" className="admin-back-shop-link font-body">
              ← &nbsp; Return to Client Shop
            </a>
          </div>

        </form>

      </div>

      <style>{`
        .admin-login-wrapper {
          min-height: 100vh;
          background-color: #0F172A; /* Deep dark slate background */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
        }

        .admin-login-card {
          background-color: #1E293B; /* Slightly lighter admin card */
          max-width: 440px;
          width: 100%;
          padding: 48px;
          border-radius: 4px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          border: 1px solid #334155;
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .admin-badge {
          background-color: var(--accent-blue);
          color: #ffffff;
          font-size: 9px;
          padding: 3px 8px;
          letter-spacing: 0.15em;
          border-radius: 0;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .admin-brand {
          font-size: 26px;
          letter-spacing: 0.2em;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .admin-sub {
          font-size: 13px;
          color: #94A3B8;
        }

        .admin-error-banner {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 2px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: left;
        }

        /* Overwrite standard inputs for dark theme admin panel */
        .admin-form .form-label {
          color: #94A3B8;
        }

        .admin-form .form-input {
          background-color: #0F172A;
          border-color: #334155;
          color: #ffffff;
        }

        .admin-form .form-input:focus {
          border-color: var(--accent-blue);
        }

        .admin-submit-btn {
          height: 46px;
          font-size: 12px;
          letter-spacing: 0.12em;
          margin-top: 10px;
          background-color: var(--accent-blue);
        }

        .admin-submit-btn:hover {
          background-color: var(--button-primary-hover);
        }

        .admin-back-shop-link {
          font-size: 12px;
          color: #94A3B8;
          text-decoration: underline;
        }

        .admin-back-shop-link:hover {
          color: #ffffff;
        }

        .full-width-btn {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
