import React from 'react';

interface BrandLogoProps {
  size?: number | string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size,
  className = ''
}) => {
  const hasWidthOrHeightClass = className.includes('w-') || className.includes('h-');
  const defaultPixelSize = size ? (typeof size === 'number' ? `${size}px` : size) : '40px';
  const styleObj = !hasWidthOrHeightClass ? { width: defaultPixelSize, height: defaultPixelSize } : {};

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-md ${className}`}
      style={styleObj}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full p-1"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="laptopBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          <linearGradient id="screenBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>

          <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>

          {/* Soft Drop Shadow Filter */}
          <filter id="elementShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Laptop Computer */}
        <g filter="url(#elementShadow)">
          {/* Outer Display Bezel */}
          <rect x="13" y="11" width="74" height="50" rx="7" fill="url(#laptopBezelGrad)" stroke="#475569" strokeWidth="1.2" />
          {/* Inner Display Screen */}
          <rect x="17" y="15" width="66" height="42" rx="4.5" fill="url(#screenBgGrad)" />

          {/* Screen Traffic Light Status Dots */}
          <circle cx="23" cy="21" r="2" fill="#EF4444" />
          <circle cx="28.5" cy="21" r="2" fill="#F59E0B" />
          <circle cx="34" cy="21" r="2" fill="#10B981" />

          {/* Diagnostic Pulse Grid Line */}
          <path
            d="M 20 46 L 27 46 L 31 39 L 35 52 L 39 43 L 42 46 L 47 46"
            stroke="#1E293B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Laptop Keyboard Base */}
          <path
            d="M 6 61 L 94 61 C 95.5 61 96.5 62.8 95.2 64.2 L 89.5 68 C 88 69 86.5 69.5 84.5 69.5 L 15.5 69.5 C 13.5 69.5 12 69 10.5 68 L 4.8 64.2 C 3.5 62.8 4.5 61 6 61 Z"
            fill="#334155"
          />
          {/* Laptop Opening Groove */}
          <rect x="44" y="61" width="12" height="2" rx="1" fill="#64748B" />
        </g>

        {/* 2. IT Settings / Maintenance GEAR (Prominent on Screen) */}
        <g transform="translate(62, 34)" filter="url(#elementShadow)">
          {/* 8-Tooth Gear Outline */}
          <g fill="url(#gearGrad)">
            <rect x="-3.5" y="-14" width="7" height="28" rx="2" />
            <rect x="-3.5" y="-14" width="7" height="28" rx="2" transform="rotate(45)" />
            <rect x="-3.5" y="-14" width="7" height="28" rx="2" transform="rotate(90)" />
            <rect x="-3.5" y="-14" width="7" height="28" rx="2" transform="rotate(135)" />
            <circle cx="0" cy="0" r="11" />
          </g>
          {/* Gear Center Cutout */}
          <circle cx="0" cy="0" r="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.8" />
        </g>

        {/* 3. Helpdesk Support TICKET Icon (Foreground Center-Left) */}
        <g transform="translate(38, 58) rotate(-10)" filter="url(#elementShadow)">
          {/* Ticket Body with Cutout Notches (Width: 30, Height: 40) */}
          <path
            d="
              M -15 -20 
              L 15 -20 
              A 3.5 3.5 0 0 1 18.5 -16.5 
              L 18.5 -4.5 
              A 4 4 0 0 0 18.5 4.5 
              L 18.5 16.5 
              A 3.5 3.5 0 0 1 15 20 
              L -15 20 
              A 3.5 3.5 0 0 1 -18.5 16.5 
              L -18.5 4.5 
              A 4 4 0 0 0 -18.5 -4.5 
              L -18.5 -16.5 
              A 3.5 3.5 0 0 1 -15 -20 
              Z
            "
            fill="url(#ticketGrad)"
            stroke="#A5B4FC"
            strokeWidth="1.4"
          />
          {/* Perforation Line Across Ticket */}
          <line
            x1="-14"
            y1="0"
            x2="14"
            y2="0"
            stroke="#E0E7FF"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
          {/* Top Badge: Verified Checkmark Circle */}
          <circle cx="0" cy="-10" r="4.2" fill="#E0E7FF" />
          <path d="M -2.2 -10 L -0.6 -8.4 L 2.4 -11.6" stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bottom Bar Details (No text/letters) */}
          <rect x="-10" y="6" width="20" height="2.5" rx="1.25" fill="#C7D2FE" opacity="0.9" />
          <rect x="-10" y="11.5" width="13" height="2.5" rx="1.25" fill="#C7D2FE" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};

export default BrandLogo;
