'use client';

import { useState, useEffect } from 'react';

export default function Hero() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      const yOffset = -435; // Much larger offset to show title
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
          fontFamily: "'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive",
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
          fontFamily: "'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive",
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
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
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
          
          {/* Professional Animated Hamburger Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            style={{
              background: scrollProgress > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              width: '44px',
              height: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
          >
            {/* Hamburger Lines with Animation */}
            <span style={{
              width: '20px',
              height: '2px',
              backgroundColor: scrollProgress > 0.5 ? 'white' : 'black',
              transition: 'all 0.3s ease',
              transform: isMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none',
              transformOrigin: 'center'
            }} />
            <span style={{
              width: '20px',
              height: '2px',
              backgroundColor: scrollProgress > 0.5 ? 'white' : 'black',
              transition: 'all 0.3s ease',
              opacity: isMenuOpen ? '0' : '1',
              transform: isMenuOpen ? 'scale(0)' : 'scale(1)'
            }} />
            <span style={{
              width: '20px',
              height: '2px',
              backgroundColor: scrollProgress > 0.5 ? 'white' : 'black',
              transition: 'all 0.3s ease',
              transform: isMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none',
              transformOrigin: 'center'
            }} />
          </button>
        </div>
      </div>

      {/* Professional Slide-in Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              background: 'rgba(0,0,0,0.6)',
              zIndex: 15,
              opacity: isMenuOpen ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
          
          {/* Menu Drawer */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '350px',
              height: '100vh',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))',
              backdropFilter: 'blur(20px)',
              zIndex: 20,
              padding: '0',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
              transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderLeft: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            {/* Menu Header */}
            <div style={{
              padding: '30px 25px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                letterSpacing: '0.5px'
              }}>Menu</h3>
              <button 
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.1)',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  color: '#666'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            
            {/* Menu Items */}
            <div style={{ padding: '30px 0' }}>
              {[
                { name: 'Gallery', href: '/gallery', icon: '🖼️' },
                { name: 'Explore Music', href: '/explore', icon: '🎵' },
                { name: 'Sheetify', href: '/sheetify', icon: '🎼' },
                { name: 'Live Requests', href: '/live', icon: '🎹' }
              ].map((item, index) => (
                <a 
                  key={item.name}
                  href={item.href} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '18px 25px',
                    fontSize: '18px',
                    color: '#444',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    borderLeft: '4px solid transparent',
                    transform: isMenuOpen ? 'translateX(0)' : 'translateX(50px)',
                    opacity: isMenuOpen ? 1 : 0,
                    transitionDelay: `${0.1 + index * 0.1}s`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(232, 121, 249, 0.1)';
                    e.currentTarget.style.borderLeftColor = '#e879f9';
                    e.currentTarget.style.transform = 'translateX(5px)';
                    e.currentTarget.style.color = '#e879f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.color = '#444';
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span style={{ fontWeight: '500' }}>{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}