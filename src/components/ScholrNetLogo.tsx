import React from 'react';

interface LogoProps {
  className?: string;
  isSpinning?: boolean;
}

export default function ScholrNetLogo({ className = "w-10 h-10", isSpinning = false }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${isSpinning ? 'animate-spin' : ''} transition-transform duration-300 hover:scale-105`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="scholrnet-svg-logo"
    >
      {/* Dynamic Background Circle with Brand Gradients */}
      <circle cx="50" cy="50" r="48" fill="url(#logo-grad-primary)" />
      
      {/* Fine Border Ring */}
      <circle cx="50" cy="50" r="44" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

      {/* Networking grid nodes inside the badge backgrounds */}
      <circle cx="30" cy="68" r="4" fill="#38BDF8" />
      <circle cx="70" cy="68" r="4" fill="#38BDF8" />
      <circle cx="50" cy="54" r="5" fill="#38BDF8" />
      
      {/* Network link paths */}
      <path 
        d="M30 68 L50 54 L70 68" 
        stroke="#38BDF8" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeDasharray="1.5 1.5"
      />

      {/* Graduation mortarboard cap symbolizing scholarship */}
      <path 
        d="M50 24 L84 38 L50 52 L16 38 Z" 
        fill="#FFFFFF" 
        className="drop-shadow-sm"
      />
      
      {/* Cap Skull Under-bowl */}
      <path 
        d="M32 44.5 V59 C32 66 68 66 68 59 V44.5" 
        stroke="#FFFFFF" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
      
      {/* Hanging Tassel */}
      <path 
        d="M84 38 V56" 
        stroke="#F1F5F9" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      <circle cx="84" cy="57" r="3" fill="#38BDF8" />

      {/* Visual Accent - Small Sparkle */}
      <polygon points="53,14 55,18 59,19 55,20 53,24 51,20 47,19 51,18" fill="#FCD34D" />

      <defs>
        <linearGradient id="logo-grad-primary" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a66c2" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
