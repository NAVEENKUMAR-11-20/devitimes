import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import pb from '../lib/pocketbase';

const Register = () => {
  const { settings } = useApp();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!shopName.trim()) { setError('Please enter your Shop Name.'); return; }
    if (!ownerName.trim()) { setError('Please enter the Owner Name.'); return; }
    if (!shopAddress.trim()) { setError('Please enter your Shop Address.'); return; }
    
    const cleanedNumber = mobileNumber.replace(/[\s\-()]/g, '');
    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanedNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Format WhatsApp Message
    const message = `New Retailer Registration\nShop Name: ${shopName.trim()}\nOwner Name: ${ownerName.trim()}\nShop Address: ${shopAddress.trim()}\nMobile Number: ${cleanedNumber}`;
    
    // Admin WhatsApp Number
    let adminWhatsAppRaw = settings?.whatsappNumber || '7358349394';
    try {
      const records = await pb.collection('app_settings').getFullList();
      if (records && records.length > 0) {
        const raw = records[0].whatsapp_number;
        if (raw && raw.startsWith('[INVENTORY_V2,') && raw.endsWith(']')) {
          const parts = raw.slice(1, -1).split(',');
          adminWhatsAppRaw = parts[1] || '';
        } else if (raw && raw.startsWith('[INVENTORY_V1,') && raw.endsWith(']')) {
          const parts = raw.slice(1, -1).split(',');
          adminWhatsAppRaw = parts[1] || '';
        } else if (raw && raw.startsWith('[') && raw.endsWith(']')) {
          const parts = raw.slice(1, -1).split(',');
          adminWhatsAppRaw = parts[0] || '';
        } else {
          adminWhatsAppRaw = raw || '';
        }
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp number from PB:", err);
    }
    
    let adminWhatsApp = adminWhatsAppRaw.replace(/\D/g, '');
    if (adminWhatsApp.length === 10) {
      adminWhatsApp = '91' + adminWhatsApp;
    }

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${adminWhatsApp}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');
  };

  return (
    <div className="retailer-register-page">
      <div className="register-container animate-fade-in">
        
        {/* Logo Section */}
        <div className="logo-header">
          <svg className="register-logo-clock" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(126,179,232,0.25)" strokeWidth="1.5"/>
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
          <h1 className="register-brand-title font-logo">DEVI TIMES</h1>
        </div>

        {/* Form Card */}
        <div className="register-card">
          <div className="register-card-header">
            <h2 className="register-title font-heading">Retailer Registration</h2>
            <p className="register-subtitle font-body">Register your shop to access our wholesale clock collection</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            
            {error && (
              <div className="register-error-banner font-body">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="register-form-label font-body">SHOP NAME</label>
              <input 
                type="text" 
                className="register-form-input" 
                placeholder="Enter your registered shop name"
                value={shopName} 
                onChange={e => setShopName(e.target.value)} 
                required
              />
            </div>

            <div className="form-group">
              <label className="register-form-label font-body">OWNER NAME</label>
              <input 
                type="text" 
                className="register-form-input" 
                placeholder="Enter owner's full name"
                value={ownerName} 
                onChange={e => setOwnerName(e.target.value)} 
                required
              />
            </div>

            <div className="form-group">
              <label className="register-form-label font-body">SHOP ADDRESS</label>
              <textarea 
                className="register-form-input register-form-textarea" 
                placeholder="Enter complete shop address with city & PIN"
                value={shopAddress} 
                onChange={e => setShopAddress(e.target.value)} 
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label className="register-form-label font-body">MOBILE NUMBER</label>
              <input 
                type="tel" 
                className="register-form-input" 
                placeholder="e.g. +91 98765 43210"
                value={mobileNumber} 
                onChange={e => setMobileNumber(e.target.value)} 
                required
              />
              <span className="form-input-help font-body">Credentials will be sent to this WhatsApp number</span>
            </div>

            <button type="submit" className="btn-primary register-submit-btn font-body">
              SEND &nbsp; →
            </button>

            <div className="register-switch font-body">
              Already have credentials? &nbsp;
              <Link to="/login" className="register-switch-link">Sign In</Link>
            </div>

          </form>
        </div>
      </div>

      <style>{`
        .retailer-register-page {
          background: linear-gradient(135deg, var(--secondary-dark) 0%, var(--primary-dark-bg) 100%);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
        }

        .retailer-register-page::before {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45,93,161,0.15) 0%, transparent 70%);
          top: -200px; right: -100px;
          pointer-events: none;
        }

        .retailer-register-page::after {
          content: '';
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,127,193,0.1) 0%, transparent 70%);
          bottom: -150px; left: -100px;
          pointer-events: none;
        }

        .register-container {
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }

        .register-logo-clock {
          width: 90px;
          height: 90px;
          margin-bottom: 12px;
          filter: drop-shadow(0 8px 20px rgba(45,93,161,0.4));
        }

        .register-brand-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #ffffff;
        }

        .register-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 40px 32px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
        }

        .register-card-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .register-title {
          font-size: 26px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .register-subtitle {
          font-size: 13px;
          color: rgba(200, 216, 238, 0.7);
          line-height: 1.5;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .register-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: rgba(254, 242, 242, 0.1);
          border: 1px solid rgba(252, 165, 165, 0.3);
          color: #FCA5A5;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 13px;
        }

        .register-form-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(200, 216, 238, 0.8);
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          display: block;
        }

        .register-form-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 12px 14px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.25s ease, background-color 0.25s ease;
          box-sizing: border-box;
        }

        .register-form-input:focus {
          border-color: var(--accent-blue);
          background: rgba(255, 255, 255, 0.07);
        }

        .register-form-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-input-help {
          font-size: 11px;
          color: rgba(200, 216, 238, 0.5);
          margin-top: 6px;
          display: block;
        }

        .register-submit-btn {
          width: 100%;
          height: 48px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-top: 8px;
          cursor: pointer;
        }

        .register-switch {
          text-align: center;
          font-size: 13px;
          color: rgba(200, 216, 238, 0.6);
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .register-switch-link {
          color: var(--accent-blue);
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .register-switch-link:hover {
          color: #BDDAF5;
        }

        @media (max-width: 480px) {
          .register-card {
            padding: 30px 20px;
          }
          .register-title {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;
