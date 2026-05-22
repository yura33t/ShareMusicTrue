import React, { useState } from 'react';
import logoSrc from '../assets/images/logo_1779456215814.png';

interface SMLogoProps {
  className?: string;
  size?: number | string;
  showBg?: boolean;
}

const SMLogo: React.FC<SMLogoProps> = ({ className = "text-white", size, showBg = false }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Only apply inline style if a size is explicitly passed, allowing Tailwind class widths/heights to work by default
  const style = size ? { width: size, height: size } : undefined;

  // If the image file exists and hasn't failed, we load it directly
  if (!imgFailed) {
    return (
      <div 
        style={style} 
        className={`flex items-center justify-center select-none shrink-0 overflow-hidden ${className}`}
      >
        <img 
          src={logoSrc} 
          alt="SM Logo" 
          className="max-w-full max-h-full object-contain"
          onError={() => setImgFailed(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Pure vector fallback representing the exact, mathematically perfect isometric "SM" Monogram from the photo
  return (
    <svg 
      viewBox="0 0 1000 1000" 
      style={style}
      className={`${className} select-none shrink-0`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {showBg && (
        <rect width="1000" height="1000" rx="200" fill="#000000" />
      )}
      
      <g>
        {/* Piece 1: Pillar 4 (M Right Pillar) */}
        <polygon points="704,183 778,140 778,480 704,523" />
         
        {/* Piece 2: Pillar 3 (M Middle Pillar) */}
        <polygon points="556,268 630,225 630,565 556,608" />
         
        {/* Piece 3: Column 2 (M Left / S Inner Pillar) */}
        <polygon points="408,353 482,310 482,772 408,815" />
         
        {/* Piece 4: Column 1 Upper-Middle (S Left Pillar) */}
        <polygon points="260,500 334,457 334,707 260,750" />
         
        {/* Piece 5: Column 1 Lower (S Bottom Left Leg) */}
        <polygon points="260,800 334,757 334,857 260,900" />
         
        {/* Piece 6: S Top Ribbon */}
        <polygon points="334,457 408,415 408,515 334,557" />
         
        {/* Piece 7: S Middle Ribbon */}
        <polygon points="334,607 408,565 408,665 334,707" />
         
        {/* Piece 8: S Bottom Ribbon */}
        <polygon points="334,757 408,715 408,815 334,857" />
      </g>
    </svg>
  );
};

export default SMLogo;
