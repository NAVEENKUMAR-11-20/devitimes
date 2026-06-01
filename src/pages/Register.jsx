import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Register = () => {
  const { registerUser } = useApp();

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    const cleanedNumber = mobileNumber.replace(/[\s\-()]/g, '');
    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanedNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    registerUser(fullName.trim(), cleanedNumber);
    setSuccess(true);
  };

  return (
    <div className="auth-split-page">

      {/* Left — Navy Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <svg className="auth-panel-clock" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(126,179,232,0.2)" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.04)" stroke="rgba(126,179,232,0.35)" strokeWidth="2"/>
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
            <line x1="100" y1="100" x2="74" y2="70"  stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
            <line x1="100" y1="100" x2="130" y2="65" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="100" y1="112" x2="100" y2="52" stroke="#4A7FC1" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="100" cy="100" r="5" fill="#7EB3E8"/>
            <circle cx="100" cy="100" r="2.5" fill="#1A2332"/>
          </svg>

          <h1 className="auth-panel-brand font-logo">DEVI TIMES</h1>
          <p className="auth-panel-tagline font-heading">Join Our Exclusive Circle</p>

          <div className="auth-panel-divider"/>

          <p className="auth-panel-desc font-body">
            Register your interest and our team will create your personal login credentials — delivered to your WhatsApp.
          </p>

          <div className="auth-steps">
            {[
              { num: '01', label: 'Submit your details' },
              { num: '02', label: 'We verify & create credentials' },
              { num: '03', label: 'Receive login via WhatsApp' },
              { num: '04', label: 'Browse & order timepieces' },
            ].map(step => (
              <div key={step.num} className="auth-step-item">
                <span className="auth-step-num">{step.num}</span>
                <span className="auth-step-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — White Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner animate-fade-in">

          {success ? (
            /* ── Success State ── */
            <div className="success-state">
              <div className="success-icon-ring">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="font-heading" style={{fontSize:'30px',color:'var(--text-primary)',marginBottom:'12px'}}>Registration Submitted!</h2>
              <p className="font-body" style={{color:'var(--text-secondary)',fontSize:'15px',lineHeight:'1.65',marginBottom:'8px'}}>
                Your request has been received. Our admin will create your login credentials and share them with you.
              </p>
              <p className="font-body" style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'36px'}}>
                You will receive your <strong>User ID</strong> and <strong>Password</strong> via WhatsApp shortly.
              </p>
              <Link to="/" className="btn-primary" style={{width:'100%',height:'48px',fontSize:'12px'}}>
                ← Back to Home
              </Link>
              <Link to="/login" className="btn-secondary" style={{width:'100%',height:'48px',fontSize:'12px',marginTop:'12px'}}>
                Already have credentials? Sign In
              </Link>
            </div>
          ) : (
            /* ── Register Form ── */
            <>
              <div className="auth-form-header">
                <h2 className="auth-form-title font-heading">Create Account</h2>
                <p className="auth-form-subtitle font-body">Submit your details to request access</p>
              </div>

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
                  <label className="form-label">FULL NAME</label>
                  <input type="text" id="reg-fullname" className="form-input" placeholder="e.g. Arjun Sharma"
                    value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">MOBILE NUMBER</label>
                  <input type="tel" id="reg-mobile" className="form-input" placeholder="+91 XXXXX XXXXX"
                    value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                  <span style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'6px'}}>
                    Indian mobile number — credentials will be sent to this number via WhatsApp
                  </span>
                </div>

                <button type="submit" id="reg-submit-btn" className="btn-primary auth-submit-btn">
                  SUBMIT REQUEST &nbsp; →
                </button>

                <div className="auth-switch font-body">
                  Already have credentials? &nbsp;
                  <Link to="/login" className="auth-switch-link">Sign in →</Link>
                </div>

              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .auth-split-page {
          display: flex;
          min-height: calc(100vh - var(--navbar-height));
        }

        .auth-brand-panel {
          width: 44%;
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
        }

        .auth-panel-clock {
          width: 150px;
          height: 150px;
          margin-bottom: 28px;
          filter: drop-shadow(0 10px 32px rgba(45,93,161,0.45));
        }

        .auth-panel-brand {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .auth-panel-tagline {
          font-size: 17px;
          color: var(--text-accent-on-dark);
          font-style: italic;
          margin-bottom: 24px;
        }

        .auth-panel-divider {
          width: 48px; height: 1px;
          background: rgba(126,179,232,0.4);
          margin-bottom: 20px;
        }

        .auth-panel-desc {
          font-size: 13px;
          color: rgba(200,216,238,0.75);
          line-height: 1.7;
          margin-bottom: 28px;
        }

        .auth-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          text-align: left;
        }

        .auth-step-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border: 1px solid rgba(126,179,232,0.18);
          border-radius: 2px;
          background: rgba(255,255,255,0.03);
        }

        .auth-step-num {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #4A7FC1;
          flex-shrink: 0;
        }

        .auth-step-label {
          font-size: 12px;
          color: rgba(200,216,238,0.8);
          font-weight: 500;
        }

        /* ── Form Panel ── */
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

        .auth-form-header { margin-bottom: 36px; }

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
        }

        .auth-switch-link:hover { color: var(--button-primary-hover); }

        /* ── Success State ── */
        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .success-icon-ring {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: #D1FAE5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
          box-shadow: 0 0 0 8px rgba(16,185,129,0.1);
        }

        @media (max-width: 900px) {
          .auth-brand-panel { display: none; }
          .auth-form-panel { padding: 48px 32px; }
        }

        @media (max-width: 480px) {
          .auth-form-panel { padding: 40px 20px; }
          .auth-form-title { font-size: 28px; }
        }
      `}</style>
    </div>
  );
};

export default Register;
