import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  getImage, getList,
  LIST_KEYS, collectionImageKey, posterImageKey,
} from '../lib/homepageImagesDb';

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

const DEFAULT_POSTERS = [
  { id: 'poster_0', name: 'Wholesale Showcase Banner', defaultImage: '/luxury_clock_showroom.png' },
];

const Home = () => {
  const navigate = useNavigate();
  const { settings } = useApp();
  const waNumber = (settings?.whatsappNumber || '7358349394').replace(/\D/g, '');
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hello, I am interested in placing a wholesale order for Devi Clocks. Please share the product catalogue and pricing.')}`;

  // ── Custom homepage images from IndexedDB (admin-managed) ──────────────────
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [collImgMap, setCollImgMap]   = useState({});
  const [posterList, setPosterList]   = useState(DEFAULT_POSTERS);
  const [posterImgMap, setPosterImgMap] = useState({});

  const loadHomepageImages = async () => {
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
      setPosterList(posts);
      const pMap = {};
      for (const p of posts) {
        const img = await getImage(posterImageKey(p.id));
        if (img) pMap[p.id] = img;
      }
      setPosterImgMap(pMap);
    } catch (err) {
      console.warn('[Home] Failed to load custom homepage images:', err);
    }
  };

  useEffect(() => {
    loadHomepageImages();
    // Re-load instantly when admin saves changes
    window.addEventListener('homepageImagesUpdated', loadHomepageImages);
    return () => window.removeEventListener('homepageImagesUpdated', loadHomepageImages);
  }, []);

  const handleCollectionClick = (categoryName) => {
    navigate('/collection', { state: { selectedCategory: categoryName } });
  };

  // Active poster (first in list, or null if list is empty)
  const activePoster = posterList[0] || null;
  const posterSrc = activePoster
    ? (posterImgMap[activePoster.id] || activePoster.defaultImage || null)
    : null;

  const marqueeText = Array(25).fill("WHOLESALE ONLY • ").join("");

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
            
            <div className="wholesale-badge font-body" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'rgba(238,213,155,0.08)',
              border: '1px solid rgba(238,213,155,0.25)',
              borderRadius: '20px',
              color: '#EED59B',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.04em',
              marginBottom: '16px'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#EED59B', borderRadius: '50%' }}></span>
              Wholesale Only • Retailers & Dealers Welcome
            </div>

            <span className="hero-tag-label uppercase-label">WHOLESALE CLOCK DISTRIBUTOR</span>
            <h1 className="hero-heading font-heading">
              Premium Clocks <br /> for Retail Stores <br />
              <span className="italic-accent" style={{ display: 'block', marginTop: '12px' }}>
                Exclusive Wholesale Collection
              </span>
            </h1>
            <p className="hero-description font-body" style={{ maxWidth: '440px' }}>
              Supplying quality wall clocks to retailers, dealers, distributors, gift shops, and home decor stores. Competitive wholesale pricing, bulk stock availability, and reliable service for your business growth.
            </p>
          </div>

          {/* Right: Live Animated Clock */}
          <div className="hero-right-content" style={{ flexDirection: 'column', gap: '32px' }}>
            <div className="hero-clock-frame">
              <AnimatedHeroClock />
            </div>
            <div className="hero-cta-group" style={{ justifyContent: 'center', flexDirection: 'column' }}>
              <Link to="/collection" className="btn-primary hero-cta-btn">
                VIEW WHOLESALE COLLECTION &nbsp; →
              </Link>
              <Link to="/register" className="hero-secondary-cta">
                REGISTER AS RETAILER
              </Link>
            </div>
          </div>

        </div>
      </section>


      {/* ── Shop by Collection Section ── */}
      <section className="collections-showcase-section">

        <div className="container">
          <div className="section-header-center">
            <span className="section-tag uppercase-label">CURATED TIMEPIECES</span>
            <h2 className="section-heading font-heading">Shop by Collection</h2>
            <div className="section-heading-line"></div>
          </div>
        </div>

        {/* ── Dark Band combining strips and images background ── */}
        <div className="collections-dark-band">
          {/* ── Wholesale Top Marquee Strip ── */}
          <div className="wholesale-marquee-strip top-strip">
            <div className="marquee-content">
              <span>{marqueeText}</span>
              <span>{marqueeText}</span>
            </div>
          </div>

          <div className="collections-marquee-container">
            <div className="marquee-track">
              {[...collections, ...collections].map((col, idx) => (
                <div 
                  key={`${col.id || idx}-marquee-${idx}`} 
                  className="collection-card-item animate-fade-in"
                  onClick={() => handleCollectionClick(col.name)}
                >
                  <div className="collection-card-img-wrapper">
                    <img
                      src={collImgMap[col.id] || col.defaultImage || col.image || ''}
                      alt={col.name}
                      className="collection-card-img"
                    />
                    <div className="collection-card-overlay"></div>
                  </div>
                  <div className="collection-card-content">
                    <h3 className="collection-card-title font-heading">{col.name}</h3>
                    <span className="collection-card-cta">Explore Collection &nbsp; →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Wholesale Bottom Marquee Strip ── */}
          <div className="wholesale-marquee-strip bottom-strip">
            <div className="marquee-content">
              <span>{marqueeText}</span>
              <span>{marqueeText}</span>
            </div>
          </div>
        </div>
      </section>


      {/* ── Wholesale Order Banner (Luxury Showcase Card) ── */}
      <section className="wholesale-banner-section">
        <div className="wholesale-card">
          {/* Left Side: Product Showcase Image */}
          {posterSrc && (
            <div className="wholesale-card-image-wrapper">
              <img 
                src={posterSrc}
                alt={activePoster?.name || 'Premium Wall Clock Showroom'} 
                className="wholesale-card-image"
              />
            </div>
          )}

          {/* Right Side: Content Area */}
          <div className="wholesale-card-content">
            <span className="wholesale-tag uppercase-label">WHOLESALE COLLECTION</span>

            <h2 className="wholesale-title font-heading">
              Built for Wholesale Business <br />
              <span className="italic-accent">Curated for Every Store</span>
            </h2>

            <p className="wholesale-subtitle font-body">
              Discover bestselling clock collections with competitive wholesale pricing, reliable quality, and designs your customers will love.
            </p>

            <Link to="/collection" className="explore-collection-btn font-heading">
              EXPLORE COLLECTION &nbsp; →
            </Link>
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
        /* ── Background Clock Decorations ── */
        .collections-showcase-section::before,
        .wholesale-banner-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url('/luxury_clock_pattern.png');
          background-repeat: repeat;
          background-size: 240px 240px;
          opacity: 0.38; /* Faint gold background watermark texture */
          mix-blend-mode: multiply;
          pointer-events: none;
          z-index: 0;
          transition: opacity 0.3s ease;
        }
        
        .collections-showcase-section:hover::before,
        .wholesale-banner-section:hover::before {
          opacity: 0.48;
        }

        .collections-showcase-section .container,
        .collections-showcase-section .collections-marquee-container,
        .collections-showcase-section .wholesale-marquee-strip,
        .wholesale-banner-section .wholesale-card {
          position: relative;
          z-index: 2;
        }

        /* ── Wholesale Marquee Strips ── */
        .wholesale-marquee-strip {
          width: 100%;
          overflow: hidden;
          background-color: var(--primary-dark-bg);
          border-top: 1.5px solid rgba(238, 213, 155, 0.25);
          border-bottom: 1.5px solid rgba(238, 213, 155, 0.25);
          padding: 8px 0;
          display: flex;
          white-space: nowrap;
          box-sizing: border-box;
          z-index: 10;
          position: relative;
        }
        .wholesale-marquee-strip.top-strip {
          border-top: none;
        }
        .wholesale-marquee-strip.bottom-strip {
          border-bottom: none;
        }
        .wholesale-marquee-strip .marquee-content {
          display: inline-flex;
          animation: ticker-scroll 25s linear infinite;
        }
        .wholesale-marquee-strip span {
          color: #EED59B;
          font-family: var(--body-font);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

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
          align-items: center;
          text-align: center;
          gap: 0;
          position: relative;
          z-index: 1;
          max-width: 480px;
          width: 100%;
        }

        .hero-text-blob {
          position: absolute;
          top: -85px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background-color: rgba(255, 255, 255, 0.06);
          border-radius: 50%;
          z-index: -1;
          pointer-events: none;
        }

        .hero-tag-label {
          color: var(--text-accent-on-dark);
          margin-bottom: 16px;
          display: block;
        }

        .hero-heading {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 22px;
          color: #ffffff;
          max-width: 480px;
        }

        .italic-accent {
          color: var(--text-accent-on-dark);
          font-style: italic;
        }

        .hero-description {
          font-size: 16px;
          opacity: 0.82;
          max-width: 440px;
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

        /* ── Wholesale Banner (Luxury Showcase Card) ── */
        .wholesale-banner-section {
          padding: 0;
          margin-top: 48px;
          margin-bottom: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          background: transparent;
          position: relative;
        }

        .wholesale-card {
          width: 90%;
          max-width: 880px; /* Reduced card width */
          background: linear-gradient(135deg, #FDF7EA 0%, #EED59B 100%); /* Premium light gold champagne gradient */
          border: 1.5px solid #DDD1B3; /* Subtle light gold border */
          border-radius: 24px; /* Tighter border radius */
          box-shadow: 0 20px 48px rgba(26, 35, 50, 0.1);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          transition: transform 0.3s ease;
          animation: wsBannerFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes wsBannerFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .wholesale-card-image-wrapper {
          width: 100%;
          height: 100%;
          min-height: 300px; /* Reduced image height */
          overflow: hidden;
          position: relative;
        }

        .wholesale-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .wholesale-card:hover .wholesale-card-image {
          transform: scale(1.04); /* Slight image zoom on hover */
        }

        .wholesale-card-content {
          padding: 36px 40px; /* Compact padding */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .wholesale-tag {
          color: #B68B1D; /* Deep gold-bronze for tag accent */
          letter-spacing: 0.2em;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 10px;
          display: block;
        }

        .wholesale-title {
          font-size: 28px; /* Compact font size */
          font-weight: 700;
          color: #1A2332; /* Navy text */
          line-height: 1.25;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
          display: block;
        }

        .wholesale-title .italic-accent {
          color: #B68B1D; /* Deep gold-bronze italic accent for beautiful tone harmony */
          font-style: italic;
        }

        .wholesale-subtitle {
          font-size: 13px;
          color: #2D3748; /* Slate gray for high legibility on light gold background */
          line-height: 1.55;
          margin-bottom: 22px;
          max-width: 400px;
        }

        /* Explore Collection Button */
        .explore-collection-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: #1A2332; /* Navy background button */
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 12px 24px;
          border-radius: 4px;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(26, 35, 50, 0.15);
          white-space: nowrap;
          border: 1px solid #1A2332;
        }
        .explore-collection-btn:hover {
          background-color: transparent;
          color: #1A2332;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(26, 35, 50, 0.18);
        }
        .explore-collection-btn:active {
          transform: translateY(0);
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

        /* ── Shop by Collection Showcase ── */
        .collections-showcase-section {
          padding: 80px 0;
          background-color: var(--page-bg);
          overflow: hidden;
          position: relative;
        }

        .section-header-center {
          text-align: center;
          margin-bottom: 48px;
        }

        .section-tag {
          color: var(--accent-blue);
          letter-spacing: 0.16em;
          font-size: 11px;
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }

        .section-heading {
          font-size: 38px;
          color: var(--text-primary);
          font-weight: 700;
          line-height: 1.2;
        }

        .section-heading-line {
          width: 60px;
          height: 3px;
          background-color: var(--accent-blue);
          margin: 16px auto 0 auto;
          border-radius: 2px;
        }

        .collections-dark-band {
          background-color: var(--primary-dark-bg);
          position: relative;
          z-index: 2;
        }

        /* Marquee styles */
        .collections-marquee-container {
          width: 100%;
          overflow: hidden;
          position: relative;
          padding: 32px 0; /* Breathing room padding */
          mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
        }

        .marquee-track {
          display: flex;
          gap: 28px;
          width: max-content;
          animation: marquee-scroll 35s linear infinite;
        }



        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .collection-card-item {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          width: 300px;
          height: 400px;
          flex: 0 0 300px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), 
                      box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .collection-card-item:hover {
          transform: scale(1.03);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .collection-card-item:active {
          transform: scale(0.98);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          transition: transform 0.1s ease;
        }

        .collection-card-img-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .collection-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .collection-card-item:hover .collection-card-img {
          transform: scale(1.06);
        }

        .collection-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(26, 35, 50, 0.05) 0%, rgba(26, 35, 50, 0.2) 40%, rgba(26, 35, 50, 0.85) 100%);
          transition: background 0.4s ease;
        }

        .collection-card-item:hover .collection-card-overlay {
          background: linear-gradient(to bottom, rgba(26, 35, 50, 0.1) 0%, rgba(26, 35, 50, 0.35) 40%, rgba(26, 35, 50, 0.92) 100%);
        }

        .collection-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 28px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .collection-card-title {
          color: #ffffff;
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 1.2;
          letter-spacing: 0.02em;
        }

        .collection-card-cta {
          color: rgba(255, 255, 255, 0.85);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          transition: color 0.3s ease, transform 0.3s ease;
          display: inline-flex;
          align-items: center;
        }

        .collection-card-item:hover .collection-card-cta {
          color: #ffffff;
          transform: translateX(4px);
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

          /* Collections mobile infinite marquee overrides */
          .collections-showcase-section {
            padding: 56px 0;
          }
          .collections-marquee-container {
            padding: 20px 0; /* Tighter padding on mobile */
          }
          .marquee-track {
            gap: 16px;
            animation: marquee-scroll 25s linear infinite;
          }
          .collection-card-item {
            width: 240px;
            height: 320px;
            flex: 0 0 240px;
            border-radius: 16px;
          }
          .collection-card-title {
            font-size: 18px;
          }
          .collection-card-content {
            padding: 20px;
          }

          .wholesale-banner-section {
            margin-top: 32px;
            margin-bottom: 32px;
          }
          .wholesale-card {
            grid-template-columns: 1fr;
            border-radius: 16px;
            max-width: 480px;
          }
          .wholesale-card-image-wrapper {
            min-height: 220px;
            max-height: 240px;
          }
          .wholesale-card-content {
            padding: 28px 24px;
            align-items: center;
            text-align: center;
          }
          .wholesale-title { font-size: 24px; }
          .wholesale-subtitle { font-size: 12.5px; max-width: 100%; margin-bottom: 18px; }
        }

        @media (max-width: 480px) {
          .hero-heading { font-size: 30px; }
          .brand-band-text { font-size: 28px; }
          .wholesale-title { font-size: 22px; }
          .wholesale-subtitle { font-size: 12px; margin-bottom: 14px; }
          .explore-collection-btn { font-size: 9.5px; padding: 10px 18px; }
        }
      `}</style>
    </div>
  );
};

export default Home;
