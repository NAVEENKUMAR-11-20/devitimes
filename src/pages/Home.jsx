import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ClockSvg from '../components/ClockSvg';

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
          { x: 160, y: 46 },
          { x: 272, y: 164 },
          { x: 160, y: 282 },
          { x: 48, y: 164 },
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
        x1="160" y1="160" x2="160" y2="95"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* Minute hand */}
      <line
        ref={minuteHandRef}
        x1="160" y1="160" x2="160" y2="72"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
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
  const { products } = useApp();

  const previewProducts = products.filter(p => p.isLive).slice(0, 8);

  return (
    <div className="home-root">

      {/* ── Hero Section ── */}
      <section className="hero-section">
        {/* Decorative floating orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        <div className="container hero-container">

          {/* Left: Text */}
          <div className="hero-left-content">
            <span className="hero-tag-label uppercase-label">DEVI TIMES COLLECTION</span>
            <h1 className="hero-heading font-heading">
              Timeless Elegance <br />
              <span className="italic-accent">For Every Wall</span>
            </h1>
            <p className="hero-description font-body">
              Discover premium clocks crafted with beautiful designs and perfect finishing.
              Elevate your space with our masterfully crafted timepieces.
            </p>
            <div className="hero-cta-group">
              <Link to="/collection" className="btn-primary hero-cta-btn">
                EXPLORE COLLECTION &nbsp; →
              </Link>
              <Link to="/register" className="hero-secondary-cta">
                Register Now
              </Link>
            </div>
          </div>

          {/* Right: Live Animated Clock */}
          <div className="hero-right-content">
            <div className="hero-clock-frame">
              <AnimatedHeroClock />
            </div>
          </div>

        </div>
      </section>

      {/* ── Feature Strip ── */}
      <section className="feature-strip">
        <div className="container">
          <div className="feature-strip-grid">
            {[
              { icon: '⧗', title: 'Premium Quality', desc: 'Crafted from finest materials' },
              { icon: '◈', title: 'Elegant Design', desc: 'Award-winning aesthetics' },
              { icon: '◉', title: 'Expert Finishing', desc: 'Precision crafted by artisans' },
              { icon: '◇', title: 'WhatsApp Orders', desc: 'Easy checkout in seconds' },
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="feature-icon">{f.icon}</span>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Collection Preview ── */}
      <section className="collection-preview-section">
        <div className="container">

          <div className="preview-header">
            <span className="uppercase-label preview-label">OUR COLLECTION</span>
            <h2 className="preview-title font-heading">Curated Timepieces</h2>
            <p className="preview-subtitle font-body">
              Explore our handpicked selection of premium wall clocks
            </p>
          </div>

          {previewProducts.length === 0 ? (
            <div className="empty-grid-fallback">
              <p>No products are currently live in the shop.</p>
            </div>
          ) : (
            <div className="grid-products">
              {previewProducts.map((product) => {
                const hasSale = product.isOnSale;

                return (
                  <div key={product.id} className="card-product animate-fade-in">

                    {/* Image Area */}
                    <div className="card-image-area">
                      {hasSale && <span className="badge-sale absolute-badge">SALE</span>}
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <ClockSvg
                          model={product.modelNumber}
                          category={product.category}
                          color={product.color}
                          size={150}
                        />
                      )}
                    </div>

                    {/* Text Area */}
                    <div className="card-text-area">
                      <div>
                        <span className="category-label">{product.category}</span>
                        <h3 className="product-name font-heading" style={{ marginTop: '4px' }}>
                          {product.name}
                        </h3>
                        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                          MODEL: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{product.modelNumber}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          SIZE: {product.size}
                        </div>
                      </div>

                      <div className="pricing-row">
                        <span className="price-bold">₹{product.salePrice}</span>
                        {product.originalPrice && (
                          <span className="price-strikethrough">₹{product.originalPrice}</span>
                        )}
                      </div>
                    </div>

                    {/* Button Row */}
                    <div className="card-button-row">
                      <Link to={`/product/${product.id}`} className="btn-secondary btn-text" style={{ padding: '8px 0', fontSize: '11px' }}>
                        DETAILS
                      </Link>
                      <Link to={`/product/${product.id}`} className="btn-primary btn-text" style={{ padding: '8px 0', fontSize: '11px' }}>
                        ORDER
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          <div className="view-all-wrapper">
            <Link to="/collection" className="btn-secondary view-all-btn">
              VIEW ALL PRODUCTS
            </Link>
          </div>

        </div>
      </section>

      {/* ── Brand Footer Band ── */}
      <section className="brand-band">
        <div className="container brand-band-inner">
          <p className="font-heading brand-band-text">
            Where Every Second Is <span className="italic-accent">Art</span>
          </p>
          <Link to="/register" className="btn-primary">
            GET STARTED
          </Link>
        </div>
      </section>

      <style>{`
        /* ── Hero ── */
        .hero-section {
          background-color: var(--primary-dark-bg);
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
          justify-content: flex-end;
          align-items: center;
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

        /* ── Feature Strip ── */
        .feature-strip {
          background-color: var(--secondary-dark);
          padding: 28px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .feature-strip-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 20px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .feature-item:last-child {
          border-right: none;
        }

        .feature-icon {
          font-size: 22px;
          color: var(--text-accent-on-dark);
          opacity: 0.85;
          flex-shrink: 0;
        }

        .feature-title {
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
        }

        .feature-desc {
          font-size: 11px;
          color: rgba(200,216,238,0.6);
          letter-spacing: 0.02em;
        }

        /* ── Collection Preview ── */
        .collection-preview-section {
          background-color: var(--page-bg);
          padding: 88px 0;
        }

        .preview-header {
          text-align: center;
          margin-bottom: 56px;
        }

        .preview-label {
          color: var(--accent-blue);
          display: block;
          margin-bottom: 10px;
        }

        .preview-title {
          font-size: 42px;
          color: var(--text-primary);
          margin-bottom: 10px;
          line-height: 1.15;
        }

        .preview-subtitle {
          color: var(--text-muted);
          font-size: 15px;
        }

        .pricing-row {
          margin-top: 16px;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .absolute-badge {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
        }

        .empty-grid-fallback {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        .view-all-wrapper {
          display: flex;
          justify-content: center;
          margin-top: 56px;
        }

        .view-all-btn {
          padding: 14px 40px;
          border-color: var(--text-primary);
          color: var(--text-primary);
        }
        .view-all-btn:hover {
          background-color: var(--text-primary);
          color: #ffffff;
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
          .feature-strip-grid { grid-template-columns: repeat(2, 1fr); }
          .feature-item:nth-child(2) { border-right: none; }
          .feature-item:nth-child(3) { border-right: none; border-top: 1px solid rgba(255,255,255,0.08); }
          .feature-item:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.08); }
        }

        @media (max-width: 768px) {
          .hero-container {
            flex-direction: column;
            text-align: center;
            padding-top: 20px;
          }
          .hero-left-content { align-items: center; }
          .hero-right-content { justify-content: center; }
          .hero-heading { font-size: 36px; }
          .hero-clock-frame { width: 260px; height: 260px; }
          .hero-cta-group { justify-content: center; }
          .feature-strip-grid { grid-template-columns: 1fr; }
          .feature-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .feature-item:last-child { border-bottom: none; }
        }

        @media (max-width: 480px) {
          .hero-heading { font-size: 30px; }
          .preview-title { font-size: 32px; }
          .brand-band-text { font-size: 28px; }
        }
      `}</style>
    </div>
  );
};

export default Home;
