'use client';

import { Analytics } from "@vercel/analytics/next"
import { useEffect } from 'react';
import Hero from '../components/Hero';
import SocialMediaIcons from '../components/SocialMediaIcons';

export default function HomePage() {
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.scroll-fade-element');
      
      elements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Element is visible when it's 20% into the viewport
        if (rect.top < windowHeight * 0.8 && rect.bottom > windowHeight * 0.2) {
          htmlElement.style.opacity = '1';
          htmlElement.style.transform = 'translateY(0)';
        } else {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(30px)';
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Run once on mount
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      <Analytics/>
      {/* Hero Section - Fixed Background */}
      <Hero />
      
      {/* Main Content - Scrollable */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        {/* Spacer to push content below hero */}
        <div style={{ height: '100vh' }} />
        
        {/* About Section - NO BACKGROUND */}
        <section id="about" style={{
          minHeight: '100vh',
          padding: '80px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '800px', textAlign: 'center', background: 'transparent' }}>
            <h2 style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              marginBottom: '40px', 
              color: 'white',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0s'
            }}
            className="scroll-fade-element"
            >
              About Timi
            </h2>
            <p style={{ 
              fontSize: '18px', 
              lineHeight: '1.7', 
              marginBottom: '30px', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.2s'
            }}
            className="scroll-fade-element"
            >
              Timi is a passionate pianist whose journey began at the age of five, exploring the intricate melodies that would later define her artistic voice.
            </p>
            <p style={{ 
              fontSize: '20px', 
              lineHeight: '1.8', 
              marginBottom: '30px', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.4s'
            }}
            className="scroll-fade-element"
            >
              With over a decade of classical training, she seamlessly blends traditional techniques with contemporary interpretations, creating a unique sound that resonates with audiences worldwide.
            </p>
            <p style={{ 
              fontSize: '20px', 
              lineHeight: '1.8', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.6s'
            }}
            className="scroll-fade-element"
            >
              Her performances range from intimate piano arrangements to dynamic collaborations, each piece telling a story that connects deeply with listeners.
            </p>
          </div>
        </section>

        {/* Contact Section - Glass Effect Only on Form */}
        <section id="contact" style={{
          minHeight: '100vh',
          padding: '80px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <h2 style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              marginBottom: '40px', 
              color: 'white',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0s'
            }}
            className="scroll-fade-element"
            >
              Get In Touch
            </h2>
            
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.2)', 
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '40px', 
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              marginBottom: '40px',
              opacity: 0,
              transform: 'translateY(50px)',
              transition: 'all 1s ease',
              transitionDelay: '0.3s'
            }}
            className="scroll-fade-element"
            >
              <p style={{ 
                fontSize: '18px', 
                marginBottom: '20px', 
                color: 'rgba(255, 255, 255, 0.8)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
              }}>
                Bookings & enquiries:
              </p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                marginBottom: '40px', 
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
              }}>
                timikeysmusic@gmail.com
              </p>
              
              {/* Contact Form with Glass Styling */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>Name</label>
                  <input type="text" style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none'
                  }} 
                  placeholder="Your name"
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>Email</label>
                  <input type="email" style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none'
                  }} 
                  placeholder="your@email.com"
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  />
                </div>
                
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>Message (optional)</label>
                  <textarea style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: 'white',
                    minHeight: '100px',
                    resize: 'vertical',
                    outline: 'none'
                  }} 
                  placeholder="Tell me about your project..."
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  />
                </div>
                
                <button style={{
                  width: '100%',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'rgba(255, 255, 255, 0.3)';
                  target.style.transform = 'translateY(-1px)';
                  target.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'rgba(255, 255, 255, 0.2)';
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = 'none';
                }}
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Fixed Social Media Icons */}
      <SocialMediaIcons />
    </div>
  );
}