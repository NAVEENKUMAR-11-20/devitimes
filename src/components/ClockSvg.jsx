import React from 'react';

const ClockSvg = ({ model = "1221", category = "Modern Minimalist", color = "Black", size = 200 }) => {
  // Determine styles based on parameters
  const isDark = color.toLowerCase().includes('black') || color.toLowerCase().includes('dark') || color.toLowerCase().includes('navy');
  const isVintage = category.toLowerCase().includes('vintage');
  const isContemporary = category.toLowerCase().includes('contemporary');
  
  // Color configuration
  let bgFill = "#FFFFFF";
  let borderStroke = "#1A2332";
  let dialLines = "#1A2332";
  let handsColor = "#1A2332";
  let accentHand = "#2D5DA1";
  let fontStyle = "sans-serif";
  let fontColor = "#1A2332";

  if (isDark) {
    if (color.toLowerCase().includes('navy')) {
      bgFill = "#1A2332";
      borderStroke = "#7EB3E8";
      dialLines = "#7EB3E8";
      handsColor = "#FFFFFF";
      fontColor = "#FFFFFF";
    } else {
      bgFill = "#1E293B";
      borderStroke = "#475569";
      dialLines = "#94A3B8";
      handsColor = "#F1F5F9";
      fontColor = "#F1F5F9";
    }
  }

  if (color.toLowerCase().includes('gold') || isVintage) {
    borderStroke = "#D97706"; // Amber-600 gold color
    dialLines = "#F59E0B";
    if (!isDark) {
      bgFill = "#FFFBEB"; // Warm vintage background
    }
  }

  if (isContemporary) {
    fontStyle = "Inter, sans-serif";
  } else if (isVintage) {
    fontStyle = "Georgia, serif";
  }

  // Dial numbers mapping
  const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {/* Outer Dial Shadow */}
      <circle cx="100" cy="100" r="95" fill={bgFill} stroke={borderStroke} strokeWidth="6" />
      <circle cx="100" cy="100" r="90" fill="none" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"} strokeWidth="2" />

      {/* Brand logo in center top */}
      <text 
        x="100" 
        y="65" 
        textAnchor="middle" 
        fill={fontColor} 
        fontSize="6.5" 
        fontFamily="Playfair Display, Georgia, serif" 
        letterSpacing="1.5"
        opacity="0.75"
      >
        DEVI TIMES
      </text>

      {/* Model number */}
      <text 
        x="100" 
        y="140" 
        textAnchor="middle" 
        fill={fontColor} 
        fontSize="7" 
        fontFamily="Inter, sans-serif" 
        letterSpacing="1"
        opacity="0.5"
      >
        {model}
      </text>

      {/* Dial ticks or numbers */}
      {isVintage ? (
        // Vintage numbers
        numbers.map((num, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = 100 + 68 * Math.sin(angle);
          const y = 100 - 68 * Math.cos(angle) + 3; // minor adjustment for vertical text centering
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              fill={fontColor}
              fontSize="12"
              fontFamily={fontStyle}
              fontWeight="normal"
            >
              {num}
            </text>
          );
        })
      ) : isContemporary ? (
        // Minimal contemporary ticks and key numbers (12, 3, 6, 9)
        <>
          {/* Main Numbers */}
          <text x="100" y="32" textAnchor="middle" fill={fontColor} fontSize="13" fontFamily={fontStyle} fontWeight="bold">12</text>
          <text x="172" y="104" textAnchor="middle" fill={fontColor} fontSize="13" fontFamily={fontStyle} fontWeight="bold">3</text>
          <text x="100" y="177" textAnchor="middle" fill={fontColor} fontSize="13" fontFamily={fontStyle} fontWeight="bold">6</text>
          <text x="28" y="104" textAnchor="middle" fill={fontColor} fontSize="13" fontFamily={fontStyle} fontWeight="bold">9</text>
          {/* Accent ticks */}
          {Array.from({ length: 12 }).map((_, i) => {
            if (i % 3 === 0) return null;
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 100 + 75 * Math.sin(angle);
            const y1 = 100 - 75 * Math.cos(angle);
            const x2 = 100 + 82 * Math.sin(angle);
            const y2 = 100 - 82 * Math.cos(angle);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dialLines} strokeWidth="1.5" opacity="0.6" />
            );
          })}
        </>
      ) : (
        // Modern Minimalist style - clean ticks all around, high precision
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const isQuarter = i % 3 === 0;
            const x1 = 100 + (isQuarter ? 72 : 78) * Math.sin(angle);
            const y1 = 100 - (isQuarter ? 72 : 78) * Math.cos(angle);
            const x2 = 100 + 84 * Math.sin(angle);
            const y2 = 100 - 84 * Math.cos(angle);
            return (
              <line 
                key={i} 
                x1={x1} 
                y1={y1} 
                x2={x2} 
                y2={y2} 
                stroke={dialLines} 
                strokeWidth={isQuarter ? "2.5" : "1"} 
                opacity={isQuarter ? "0.9" : "0.5"} 
              />
            );
          })}
        </>
      )}

      {/* Clock Hands - Fixed static high-end aesthetic (e.g. 10:10 position) */}
      
      {/* Hour Hand */}
      <line 
        x1="100" 
        y1="100" 
        x2="65" 
        y2="78" 
        stroke={handsColor} 
        strokeWidth="4" 
        strokeLinecap="round" 
      />

      {/* Minute Hand */}
      <line 
        x1="100" 
        y1="100" 
        x2="140" 
        y2="72" 
        stroke={handsColor} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />

      {/* Center cap */}
      <circle cx="100" cy="100" r="5.5" fill={handsColor} />

      {/* Second Hand (thin colored sweeping line) */}
      <line 
        x1="100" 
        y1="100" 
        x2="85" 
        y2="145" 
        stroke={accentHand} 
        strokeWidth="1" 
        strokeLinecap="round" 
      />
      <circle cx="100" cy="100" r="2.5" fill={accentHand} />
    </svg>
  );
};

export default ClockSvg;
