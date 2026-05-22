import React from 'react';

interface SMLogoProps {
  className?: string;
  size?: number | string;
  showBg?: boolean;
}

const SMLogo: React.FC<SMLogoProps> = ({ className = "text-white", size = "100%", showBg = false }) => {
  return (
    <svg 
      viewBox="0 0 1000 1000" 
      width={size} 
      height={size} 
      className={`${className} select-none`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {showBg && (
        <rect width="1000" height="1000" rx="200" fill="#000000" />
      )}
      
      {/* 
        This is a mathematically precise, gorgeous isometric "SM" Monogram.
        We draw the monogram using direct horizontal-vertical coordinates on a 2D grid,
        then apply a 30-degree vertical skew. This preserves uniform width, alignment, 
        and symmetric shapes without any crooked lines or separate overlapping shapes.
      */}
      <g transform="translate(255, 291) scale(0.7) skewY(-30)">
        {/* === Left "S" Glyph === */}
        {/* Column 1 (Pillar A) Upper */}
        <rect x="0" y="250" width="100" height="375" />
        
        {/* Column 1 (Pillar A) Lower */}
        <rect x="0" y="800" width="100" height="100" />
        
        {/* S Top Ribbon */}
        <rect x="100" y="250" width="100" height="100" />
        
        {/* S Middle Ribbon */}
        <rect x="100" y="525" width="100" height="100" />
        
        {/* S Bottom Ribbon */}
        <rect x="100" y="800" width="100" height="100" />
        
        {/* === Right "M" Glyph === */}
        {/* Column 2 (Pillar B, shared Left Leg of M) */}
        <rect x="200" y="100" width="100" height="800" />
        
        {/* M Top Connecting Bar */}
        <rect x="300" y="100" width="300" height="100" />
        
        {/* Column 3 (Pillar C, Middle Leg of M) */}
        <rect x="400" y="100" width="100" height="800" />
        
        {/* Column 4 (Pillar D, Right Leg of M) */}
        <rect x="600" y="100" width="100" height="800" />
      </g>
    </svg>
  );
};

export default SMLogo;
