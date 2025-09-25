'use client';

import { useState } from 'react';
import Image from 'next/image';
import DrawerMenu from './DrawerMenu';

interface TopBarProps {
  nightness: number; // 0 = full day, 1 = full night
}

export default function TopBar({ nightness }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleMenuClick = () => {
    setIsMenuOpen(true);
  };

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-6">
        {/* Logo */}
        <div className="relative w-12 h-12">
          {/* Dark logo - visible during day */}
          <Image
            src="/logo-dark.svg"
            alt="Logo"
            width={48}
            height={48}
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: 1 - nightness }}
          />
          {/* Light logo - visible during night */}
          <Image
            src="/logo-light.svg"
            alt="Logo"
            width={48}
            height={48}
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: nightness }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => scrollToSection('about')}
            className="transition-all duration-300 font-medium px-4 py-2 rounded-lg backdrop-blur-sm"
            style={{ 
              color: nightness > 0.5 ? '#ffffff' : '#000000',
              backgroundColor: nightness > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}
          >
            About
          </button>
          
          <button
            onClick={() => scrollToSection('contact')}
            className="transition-all duration-300 font-medium px-4 py-2 rounded-lg backdrop-blur-sm"
            style={{ 
              color: nightness > 0.5 ? '#ffffff' : '#000000',
              backgroundColor: nightness > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}
          >
            Contact
          </button>
          
          <button
            onClick={handleMenuClick}
            className="transition-all duration-300 text-xl font-medium px-3 py-2 rounded-lg backdrop-blur-sm"
            style={{ 
              color: nightness > 0.5 ? '#ffffff' : '#000000',
              backgroundColor: nightness > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}
          >
            ☰
          </button>
        </div>
      </div>

      <DrawerMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
    </>
  );
}