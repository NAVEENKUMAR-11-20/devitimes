import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// ─── Animated Hero Clock (pure SVG, no images) ───────────────────────────────
const AnimatedHeroClock = () => {
  const secondHandRef = useRef(null);
  const minuteHandRef = useRef(null);
  const hourHandRef   = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const s = now.getSeconds();
      const m = now.getMinutes();
      const h = now.getHours() % 12;

      const sDeg = s * 6;
      const mDeg = m * 6 + s * 0.1;
      const hDeg = h * 30 + m * 0.5;

      if (secondHandRef.current) {
        secondHandRef.current.setAttribute('transform', `rotate(${sDeg}, 160, 160)`);
      }
      if (minuteHandRef.current) {
        minuteHandRef.current.setAttribute('transform', `rotate(${mDeg}, 160, 160)`);
      }
      if (hourHandRef.current) {
        hourHandRef.current.setAttribute('transform', `rotate(${hDeg}, 160, 160)`);
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Hour markers
  const markers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const isQuarter = i % 3 === 0;
    const innerR = isQuarter ? 118 : 126;
    const outerR = 136;
    return {
      x1: 160 + innerR * Math.sin(angle),
      y1: 160 - innerR * Math.cos(angle),
      x2: 160 + outerR * Math.sin(angle),
      y2: 160 - outerR * Math.cos(angle),
      isQuarter,
    };
  });

  // Minute markers
  const minuteMarkers = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null;
    const angle = (i * 6 * Math.PI) / 180;
    return {
      x1: 160 + 131 * Math.sin(angle),
      y1: 160 - 131 * Math.cos(angle),
      x2: 160 + 136 * Math.sin(angle),
      y2: 160 - 136 * Math.cos(angle),
    };
  });

  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      className="hero-animated-clock"
    >
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="dialGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#243044" />
          <stop offset="100%" stopColor="#1A2332" />
        </radialGradient>
      </defs>

      {/* Outer bezel ring */}
      <circle cx="160" cy="160" r="155" fill="none" stroke="#7EB3E8" strokeWidth="1.5" opacity="0.3" />
      <circle cx="160" cy="160" r="148" fill="none" stroke="#4A7FC1" strokeWidth="2" opacity="0.5" />

      {/* Dial face */}
      <circle cx="160" cy="160" r="142" fill="url(#dialGrad)" />

      {/* Inner track ring */}
      <circle cx="160" cy="160" r="138" fill="none" stroke="rgba(126,179,232,0.12)" strokeWidth="1" />

      {/* Minute markers */}
      {minuteMarkers.map((m, i) =>
        m ? (
          <line
            key={`mm-${i}`}
            x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
            stroke="rgba(126,179,232,0.35)"
            strokeWidth="1"
          />
        ) : null
      )}

      {/* Hour markers */}
      {markers.map((mk, i) => (
        <line
          key={`hm-${i}`}
          x1={mk.x1} y1={mk.y1} x2={mk.x2} y2={mk.y2}
          stroke={mk.isQuarter ? '#7EB3E8' : 'rgba(126,179,232,0.6)'}
          strokeWidth={mk.isQuarter ? '3' : '1.5'}
          strokeLinecap="round"
        />
      ))}

      {/* Dial numerals */}
      {[12, 3, 6, 9].map((num, i) => {
        const positions = [
          { x: 160, y: 58 },
          { x: 260, y: 162 },
          { x: 160, y: 262 },
          { x: 60, y: 162 },
        ];
        return (
          <text
            key={num}
            x={positions[i].x}
            y={positions[i].y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#B8D4EF"
            fontSize="16"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontWeight="600"
            letterSpacing="1"
          >
            {num}
          </text>
        );
      })}

      {/* Brand text */}
      <text
        x="160" y="108"
        textAnchor="middle"
        fill="#7EB3E8"
        fontSize="7.5"
        fontFamily="Playfair Display, Georgia, serif"
        letterSpacing="2.5"
        opacity="0.9"
      >
        DEVI TIMES
      </text>

      {/* Sub-dial decoration line */}
      <line x1="140" y1="114" x2="180" y2="114" stroke="rgba(126,179,232,0.3)" strokeWidth="0.5" />

      {/* Hour hand */}
      <line
        ref={hourHandRef}
        x1="160" y1="160" x2="160" y2="100"
        stroke="#7EB3E8"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        ref={minuteHandRef}
        x1="160" y1="160" x2="160" y2="70"
        stroke="#7EB3E8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Second hand */}
      <line
        ref={secondHandRef}
        x1="160" y1="185" x2="160" y2="65"
        stroke="#4A7FC1"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Center cap */}
      <circle cx="160" cy="160" r="7" fill="#7EB3E8" />
      <circle cx="160" cy="160" r="3" fill="#1A2332" />
    </svg>
  );
};

// ─── Main Home Component ──────────────────────────────────────────────────────
const Home = () => {
  const { settings } = useApp();
  const waNumber = (settings?.whatsappNumber || '7358349394').replace(/\D/g, '');
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hello, I am interested in placing a wholesale order for Devi Clocks. Please share the product catalogue and pricing.')}`;

  return (
    <div className="home-root">

      {/* ── Hero Section ── */}
      <section className="hero-section">
        {/* Decorative floating orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        {/* Decorative Plants & Vases */}
        <img src="/left_leaf.png" className="hero-decorative-leaf" alt="" aria-hidden="true" />
        <img src="/vase_books.png" className="hero-decorative-vase" alt="" aria-hidden="true" />

        <div className="container hero-container">

          {/* Left: Text */}
          <div className="hero-left-content">
            <div className="hero-text-blob" aria-hidden="true" />
            <span className="hero-tag-label uppercase-label">DEVI TIMES COLLECTION</span>
            <h1 className="hero-heading font-heading">
              Timeless Elegance <br />
              <span className="italic-accent">For Every Wall</span>
            </h1>
            <p className="hero-description font-body">
              Discover premium clocks crafted with beautiful designs and perfect finishing.
              Elevate your space with our masterfully crafted timepieces.
            </p>
          </div>

          {/* Right: Live Animated Clock */}
          <div className="hero-right-content" style={{ flexDirection: 'column', gap: '32px' }}>
            <div className="hero-clock-frame">
              <AnimatedHeroClock />
            </div>
            <div className="hero-cta-group" style={{ justifyContent: 'center', flexDirection: 'column' }}>
              <Link to="/collection" className="btn-primary hero-cta-btn">
                EXPLORE COLLECTION &nbsp; →
              </Link>
              <Link to="/register" className="hero-secondary-cta">
                Register Now
              </Link>
            </div>
          </div>

        </div>
      </section>


      {/* ── Wholesale Order Banner ── */}
      <section className="wholesale-banner-section">

        <div className="container wholesale-banner-inner">
          {/* Left content */}
          <div className="wholesale-left">
            <span className="wholesale-tag uppercase-label">WHOLESALE ONLY</span>

            <h2 className="wholesale-title font-heading">
              Devi Clocks
              <span className="wholesale-title-sub">Wholesale Orders</span>
            </h2>

            <p className="wholesale-subtitle font-body">
              We supply clocks only for wholesale and bulk orders.
              <br />
              Single clock purchase is not available.
            </p>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="wholesale-cta-btn"
            >
              <span className="wholesale-cta-icon">&#128222;</span>
              Contact for Wholesale Order
            </a>
          </div>

          {/* Right: ONE premium clock only */}
          <div className="wholesale-right">
            {/* Outer luxury ring */}
            <div className="ws-clock-ring ws-clock-ring-outer" aria-hidden="true" />
            {/* Inner glow ring */}
            <div className="ws-clock-ring ws-clock-ring-inner" aria-hidden="true" />
            {/* Radial glow behind clock */}
            <div className="ws-clock-glow" aria-hidden="true" />
            {/* The single animated clock */}
            <div className="ws-clock-frame">
              <AnimatedHeroClock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand Footer Band ── */}
      <section className="brand-band">
        <div className="container brand-band-inner">
          <p className="font-heading brand-band-text">
            Your Trusted Wholesale Clock <span className="italic-accent">Partner</span>
          </p>
          <Link to="/register" className="btn-primary">
            GET STARTED
          </Link>
        </div>
      </section>

      <style>{`
        /* ── Hero ── */
        .hero-section {
          background: linear-gradient(135deg, var(--secondary-dark) 0%, var(--primary-dark-bg) 100%);
          color: var(--text-on-dark);
          min-height: 540px;
          display: flex;
          align-items: center;
          padding: 72px 0;
          overflow: hidden;
          position: relative;
        }

        /* Floating decorative orbs */
        .hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .hero-orb-1 {
          width: 420px; height: 420px;
          right: -80px; top: -120px;
          background: radial-gradient(circle, rgba(45,93,161,0.18) 0%, transparent 70%);
        }
        .hero-orb-2 {
          width: 280px; height: 280px;
          left: 10%; bottom: -100px;
          background: radial-gradient(circle, rgba(74,127,193,0.12) 0%, transparent 70%);
        }

        /* Decorative Images */
        .hero-decorative-leaf {
          position: absolute;
          left: -4%;
          bottom: -10%;
          height: 90%;
          max-height: 500px;
          object-fit: contain;
          opacity: 0.85;
          z-index: 0;
          pointer-events: none;
          filter: brightness(0.85);
        }

        .hero-decorative-vase {
          position: absolute;
          right: 2%;
          bottom: -5%;
          height: 65%;
          max-height: 380px;
          object-fit: contain;
          opacity: 0.95;
          z-index: 0;
          pointer-events: none;
        }

        .hero-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .hero-left-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
          position: relative;
          z-index: 1;
        }

        .hero-text-blob {
          position: absolute;
          top: -40px;
          left: -40px;
          width: 500px;
          height: 360px;
          background-color: rgba(255, 255, 255, 0.07);
          border-radius: 46% 54% 43% 57% / 51% 45% 55% 49%;
          z-index: -1;
          pointer-events: none;
          transform: rotate(-3deg);
        }

        .hero-tag-label {
          color: var(--text-accent-on-dark);
          margin-bottom: 16px;
          display: block;
        }

        .hero-heading {
          font-size: 58px;
          font-weight: 700;
          line-height: 1.12;
          margin-bottom: 22px;
          color: #ffffff;
        }

        .italic-accent {
          color: var(--text-accent-on-dark);
          font-style: italic;
        }

        .hero-description {
          font-size: 16px;
          opacity: 0.82;
          max-width: 400px;
          line-height: 1.65;
          margin-bottom: 36px;
          color: #C8D8EE;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .hero-cta-btn {
          padding: 14px 28px;
          font-size: 12px;
          letter-spacing: 0.12em;
        }

        .hero-secondary-cta {
          font-size: 13px;
          color: var(--text-accent-on-dark);
          font-weight: 600;
          letter-spacing: 0.06em;
          border-bottom: 1px solid rgba(126,179,232,0.45);
          padding-bottom: 2px;
          transition: color 200ms ease, border-color 200ms ease;
        }
        .hero-secondary-cta:hover {
          color: #BDDAF5;
          border-color: rgba(189,218,245,0.7);
        }

        /* Right clock display */
        .hero-right-content {
          flex: 0 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-right: 140px;
        }

        .hero-clock-frame {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 340px;
          height: 340px;
        }

        .hero-animated-clock {
          filter: drop-shadow(0 20px 48px rgba(45,93,161,0.55));
        }

        /* ── Wholesale Banner ── */
        .wholesale-banner-section {
          position: relative;
          background: linear-gradient(135deg, #111827 0%, #1A2332 50%, #0F1C2E 100%);
          overflow: hidden;
          padding: 80px 0;
          animation: wsBannerFadeIn 0.6s ease both;
        }
        @keyframes wsBannerFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Subtle radial overlay only — NO background image */
        .wholesale-banner-section::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 70% 50%, rgba(201,168,76,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Two-column desktop layout ── */
        .wholesale-banner-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
          width: 100%;
        }

        .wholesale-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
          max-width: 520px;
        }

        .wholesale-tag {
          color: #C9A84C;
          letter-spacing: 0.18em;
          font-size: 11px;
          margin-bottom: 20px;
          display: block;
        }

        /* Right clock column */
        .wholesale-right {
          flex: 0 0 auto;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 360px;
          height: 360px;
        }

        /* Outer luxury ring — thin gold border circle */
        .ws-clock-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .ws-clock-ring-outer {
          width: 360px;
          height: 360px;
          border: 1px solid rgba(201,168,76,0.22);
          box-shadow:
            0 0 0 1px rgba(201,168,76,0.06),
            0 0 40px rgba(201,168,76,0.08);
        }
        .ws-clock-ring-inner {
          width: 310px;
          height: 310px;
          border: 1px solid rgba(126,179,232,0.12);
        }

        /* Radial glow behind clock */
        .ws-clock-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(201,168,76,0.10) 0%,
            rgba(45,93,161,0.08) 40%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* Clock frame — centers the SVG */
        .ws-clock-frame {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Override the hero-animated-clock filter for the wholesale clock */
        .wholesale-right .hero-animated-clock {
          filter:
            drop-shadow(0 20px 48px rgba(45,93,161,0.6))
            drop-shadow(0 0 24px rgba(201,168,76,0.12));
          width: 300px;
          height: 300px;
        }

        .wholesale-title {
          font-size: 52px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .wholesale-title-sub {
          font-size: 32px;
          color: #C9A84C;
          font-style: italic;
          font-weight: 600;
        }

        .wholesale-subtitle {
          font-size: 16px;
          color: rgba(200,216,238,0.78);
          line-height: 1.7;
          margin: 24px 0 36px;
          max-width: 440px;
        }

        /* WhatsApp CTA Button */
        .wholesale-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%);
          color: #1A2332;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px 28px;
          border-radius: 3px;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 4px 20px rgba(201,168,76,0.35);
          white-space: nowrap;
        }
        .wholesale-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(201,168,76,0.5);
        }
        .wholesale-cta-btn:active {
          transform: translateY(0);
        }
        .wholesale-cta-icon { font-size: 16px; flex-shrink: 0; }

        /* Right: clock */
        .wholesale-right {
          flex: 0 0 auto;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wholesale-clock-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Brand Band ── */
        .brand-band {
          background-color: var(--primary-dark-bg);
          padding: 64px 0;
          text-align: center;
        }
        .brand-band-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }
        .brand-band-text {
          font-size: 38px;
          color: #FFFFFF;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .hero-heading { font-size: 44px; }
        }

        @media (max-width: 768px) {
          .hero-section {
            min-height: 100vh;
            padding: 100px 16px 60px 16px;
          }

          .hero-section::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 50% 90%, rgba(26,35,50,0.6) 0%, transparent 70%);
            z-index: 0;
            pointer-events: none;
          }

          .hero-container {
            flex-direction: column;
            text-align: center;
            padding-top: 0;
            gap: 40px;
          }
          .hero-left-content { align-items: center; }

          .hero-text-blob {
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120vw;
            height: 120vw;
            border-radius: 50%;
            opacity: 0.15;
          }

          .hero-right-content { justify-content: center; margin-right: 0; width: 100%; }
          .hero-heading { font-size: 38px; line-height: 1.2; margin-bottom: 16px; }
          .hero-description { font-size: 15px; max-width: 100%; margin-bottom: 0; }
          .hero-clock-frame { width: 280px; height: 280px; margin: 0 auto; }
          .hero-cta-group { justify-content: center; align-items: center; }

          .hero-decorative-leaf {
            bottom: -5%;
            left: -20%;
            height: 35%;
            max-height: 300px;
            opacity: 0.25;
            object-fit: contain;
          }

          .hero-decorative-vase {
            bottom: 0;
            right: -15%;
            height: 30%;
            max-height: 250px;
            opacity: 0.35;
            object-fit: contain;
          }

          .wholesale-banner-section { padding: 48px 0; }
          .wholesale-banner-inner {
            flex-direction: column;
            text-align: center;
            align-items: center;
            gap: 36px;
          }
          .wholesale-left {
            align-items: center;
            max-width: 100%;
          }
          .wholesale-subtitle { max-width: 100%; }
          /* Show clock below text on mobile, smaller size */
          .wholesale-right {
            display: flex;
            width: 260px;
            height: 260px;
          }
          .ws-clock-ring-outer { width: 260px; height: 260px; }
          .ws-clock-ring-inner { width: 220px; height: 220px; }
          .ws-clock-glow { width: 210px; height: 210px; }
          .wholesale-right .hero-animated-clock { width: 220px; height: 220px; }
          .wholesale-title { font-size: 36px; align-items: center; }
          .wholesale-title-sub { font-size: 24px; }
        }

        @media (max-width: 480px) {
          .hero-heading { font-size: 30px; }
          .brand-band-text { font-size: 28px; }
          .wholesale-title { font-size: 30px; }
          .wholesale-title-sub { font-size: 20px; }
          .wholesale-subtitle { font-size: 14px; margin: 16px 0 24px; }
          .wholesale-cta-btn { font-size: 11px; padding: 13px 20px; }
        }
      `}</style>
    </div>
  );
};

export default Home;
