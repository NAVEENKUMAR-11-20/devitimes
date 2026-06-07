import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Login = () => {
  const { loginUser } = useApp();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId.trim()) { setError('Please enter your User ID.'); return; }
    if (!password)      { setError('Please enter your password.'); return; }
    try {
      const response = await loginUser(userId.trim(), password);
      if (response.success) navigate('/collection');
      else setError(response.message);
    } catch (err) {
      setError('An unexpected error occurred. Please contact admin.');
    }
  };

  return (
    <div className="auth-split-page">

      {/* Left — Navy Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          {/* Clock SVG */}
          <svg className="auth-panel-clock" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(126,179,232,0.2)" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.04)" stroke="rgba(126,179,232,0.35)" strokeWidth="2"/>
            {/* hour markers */}
            {Array.from({length:12}).map((_,i) => {
              const a = (i*30*Math.PI)/180;
              const isQ = i%3===0;
              return <line key={i}
                x1={100+(isQ?58:65)*Math.sin(a)} y1={100-(isQ?58:65)*Math.cos(a)}
                x2={100+73*Math.sin(a)}           y2={100-73*Math.cos(a)}
                stroke={isQ?"#7EB3E8":"rgba(126,179,232,0.5)"}
                strokeWidth={isQ?"2.5":"1.2"} strokeLinecap="round"/>;
            })}
            <text x="100" y="55" textAnchor="middle" fill="#7EB3E8" fontSize="5.5" fontFamily="Playfair Display,serif" letterSpacing="1.5" opacity="0.9">DEVI TIMES</text>
            {/* Hands at 10:10 */}
            <line x1="100" y1="100" x2="74" y2="70"  stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
            <line x1="100" y1="100" x2="130" y2="65" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="100" y1="112" x2="100" y2="52" stroke="#4A7FC1" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="100" cy="100" r="5" fill="#7EB3E8"/>
            <circle cx="100" cy="100" r="2.5" fill="#1A2332"/>
          </svg>

          <h1 className="auth-panel-brand font-logo">DEVI TIMES</h1>
          <p className="auth-panel-tagline font-heading">Where Every Second Is Art</p>

          <div className="auth-panel-divider"/>

          <p className="auth-panel-desc font-body">
            Sign in to browse our exclusive collection of premium wall clocks and manage your orders.
          </p>

          <div className="auth-panel-badges">
            <span className="auth-badge">✦ Premium Quality</span>
            <span className="auth-badge">✦ Artisan Crafted</span>
            <span className="auth-badge">✦ WhatsApp Checkout</span>
          </div>
        </div>
      </div>

      {/* Right — White Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner animate-fade-in">

          {/* Header */}
          <div className="auth-form-header">
            <h2 className="auth-form-title font-heading">Welcome Back</h2>
            <p className="auth-form-subtitle font-body">Sign in to your DEVI TIMES account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">

            {error && (
              <div className="auth-error-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">USER ID</label>
              <input type="text" className="form-input" id="login-userid" placeholder="Enter your User ID"
                value={userId} onChange={e => setUserId(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">PASSWORD</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  id="login-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" className="btn-primary auth-submit-btn">
              SIGN IN &nbsp; →
            </button>

            <div className="auth-switch font-body">
              Don't have an account? &nbsp;
              <Link to="/register" className="auth-switch-link">Register here →</Link>
            </div>

          </form>
        </div>
      </div>

      <style>{`
        .auth-split-page {
          display: flex;
          min-height: calc(100vh - var(--navbar-height));
        }

        /* ── Navy Brand Panel ── */
        .auth-brand-panel {
          width: 42%;
          background: linear-gradient(160deg, #1E2C42 0%, #1A2332 50%, #162030 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          position: relative;
          overflow: hidden;
        }

        .auth-brand-panel::before {
          content: '';
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45,93,161,0.18) 0%, transparent 70%);
          top: -100px; right: -80px;
          pointer-events: none;
        }

        .auth-brand-panel::after {
          content: '';
          position: absolute;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,127,193,0.12) 0%, transparent 70%);
          bottom: -60px; left: -50px;
          pointer-events: none;
        }

        .auth-brand-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 340px;
          gap: 0;
        }

        .auth-panel-clock {
          width: 160px;
          height: 160px;
          margin-bottom: 28px;
          filter: drop-shadow(0 10px 32px rgba(45,93,161,0.45));
        }

        .auth-panel-brand {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .auth-panel-tagline {
          font-size: 18px;
          color: var(--text-accent-on-dark);
          font-style: italic;
          margin-bottom: 28px;
        }

        .auth-panel-divider {
          width: 48px;
          height: 1px;
          background: rgba(126,179,232,0.4);
          margin-bottom: 24px;
        }

        .auth-panel-desc {
          font-size: 13px;
          color: rgba(200,216,238,0.75);
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .auth-panel-badges {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .auth-badge {
          font-size: 11px;
          color: rgba(126,179,232,0.8);
          letter-spacing: 0.08em;
          font-weight: 600;
          padding: 8px 16px;
          border: 1px solid rgba(126,179,232,0.2);
          border-radius: 2px;
          background: rgba(255,255,255,0.03);
        }

        /* ── White Form Panel ── */
        .auth-form-panel {
          flex: 1;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
        }

        .auth-form-inner {
          width: 100%;
          max-width: 400px;
        }

        .auth-form-header {
          margin-bottom: 40px;
        }

        .auth-form-title {
          font-size: 34px;
          color: var(--text-primary);
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .auth-form-subtitle {
          font-size: 14px;
          color: var(--text-muted);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #DC2626;
          padding: 12px 16px;
          border-radius: 3px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .password-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-wrapper .form-input {
          padding-right: 48px;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: color var(--transition-speed) ease;
        }

        .password-toggle:hover { color: var(--text-primary); }

        .auth-submit-btn {
          height: 48px;
          font-size: 12px;
          margin-top: 10px;
          width: 100%;
        }

        .auth-switch {
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color);
        }

        .auth-switch-link {
          color: var(--accent-blue);
          font-weight: 700;
          transition: color var(--transition-speed) ease;
        }

        .auth-switch-link:hover { color: var(--button-primary-hover); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .auth-brand-panel { display: none; }
          .auth-form-panel { padding: 48px 32px; }
        }

        @media (max-width: 480px) {
          .auth-split-page { min-height: calc(100vh - var(--navbar-height)); }
          .auth-form-panel { padding: 40px 20px; }
          .auth-form-title { font-size: 28px; }
        }
      `}</style>
    </div>
  );
};

export default Login;
