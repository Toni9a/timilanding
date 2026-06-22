'use client';

import { useState, useEffect } from 'react';
import UnifiedMenu from './UnifiedMenu';

export default function Hero() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      // Change to 1.3 so transition completes much faster - by middle of About section
      const progress = Math.min(scrollY / (windowHeight * 0.8), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -200; // Better offset to show header and first paragraph
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Function to scroll to top when logo is clicked
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Add smooth scrolling CSS */}
      <style jsx>{`
        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: no-preference) {
          html {
            scroll-behavior: smooth;
          }
        }

        @media (max-width: 768px) {
          .nav-buttons {
            gap: 8px !important;
          }
          .nav-buttons .nav-about-btn {
            display: none !important;
          }
          .nav-buttons .listen-now-text {
            display: none !important;
          }
          .nav-buttons .listen-now-btn {
            width: 36px !important;
            height: 36px !important;
            padding: 0 !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(255, 255, 255, 0.15) !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: none !important;
          }
          .nav-buttons .listen-now-btn svg {
            width: 14px !important;
            height: 14px !important;
          }
        }
      `}</style>

      {/* Background images */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          backgroundImage: `url(/day.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }}
      />
      
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          backgroundImage: `url(/night.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: scrollProgress,
          zIndex: 1
        }}
      />
      
      {/* Hero Text Overlay */}
      <div style={{
        position: 'fixed',
        top: '29%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        textAlign: 'center',
        pointerEvents: 'none',
        opacity: Math.max(0, 1 - (scrollProgress * 2))
      }}>
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: 'bold',
          margin: 0,
          marginBottom: '0.5rem',
          color: '#e879f9',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease',
          fontFamily: "'PARISIAN', 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive",
          letterSpacing: '0.05em'
        }}>
          Timikeys
        </h1>
        <p style={{
          fontSize: 'clamp(1.2rem, 3vw, 2rem)',
          margin: 0,
          color: '#e879f9',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease',
          fontFamily: " 'PARISIAN', 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive",
          fontStyle: 'italic',
          letterSpacing: '0.1em'
        }}>
          Pianist
        </p>
      </div>

      {/* Navigation */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo - Now clickable to scroll to top with perfect alignment */}
        <div 
          onClick={scrollToTop}
          style={{
            width: '48px',
            height: '48px',
            position: 'relative',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Light logo (for day) */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '42px',
              height: '42px',
              backgroundImage: 'url(/logo-light.svg)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: 1 - scrollProgress,
              transition: 'opacity 0.3s ease'
            }}
          />
          
          {/* Dark logo (for night) */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '38px',
              height: '38px',
              backgroundImage: 'url(/logo-dark.svg)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: scrollProgress,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>
        
        {/* Nav buttons */}
        <div className="nav-buttons" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            className="listen-now-btn"
            onClick={() => window.location.href = '/explore?audio=true'}
            style={{
              background: scrollProgress > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              border: 'none',
              color: scrollProgress > 0.5 ? 'white' : 'black',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={scrollProgress > 0.5 ? 'white' : 'black'} stroke="none">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span className="listen-now-text">Listen Now</span>
          </button>
          <button
            className="nav-about-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToSection('about');
            }}
            style={{
              background: scrollProgress > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              border: 'none',
              color: scrollProgress > 0.5 ? 'white' : 'black',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            About
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const element = document.getElementById('contact');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            style={{
              background: scrollProgress > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              border: 'none',
              color: scrollProgress > 0.5 ? 'white' : 'black',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            Contact
          </button>
          
          {/* Unified Menu Component */}
          <UnifiedMenu isDark={scrollProgress < 0.5} />
        </div>
      </div>
    </>
  );
}