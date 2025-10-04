'use client';

import { Analytics } from "@vercel/analytics/next"
import { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import SocialMediaIcons from '../components/SocialMediaIcons';

export default function HomePage() {
  // Contact form state
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setStatusMessage('Thank you! Your message has been sent successfully.');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setSubmitStatus('error');
        setStatusMessage(result.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setStatusMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSubmitStatus('idle');
        setStatusMessage('');
      }, 5000);
    }
  };

  // Scroll animation logic
// Replace the existing useEffect scroll handler with this corrected version

useEffect(() => {
  const handleScroll = () => {
    const elements = document.querySelectorAll('.scroll-fade-element');
    const isMobile = window.innerWidth <= 768;
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      // Basic fade-in logic - when element enters viewport
      const viewportThreshold = isMobile ? 0.7 : 0.6;
      const viewportBottom = isMobile ? 0.2 : 0.4;
      const isInViewport = rect.top < windowHeight * viewportThreshold && rect.bottom > windowHeight * viewportBottom;
      
      const elementTop = rect.top + scrollY;
      const currentScroll = scrollY + windowHeight * 0.5;
      const elementDistance = currentScroll - elementTop;
      
      // STEP 1: Basic viewport fade-in
      if (isInViewport) {
        htmlElement.style.opacity = '1';
        htmlElement.style.transform = 'translateY(0)';
      } else {
        htmlElement.style.opacity = '0';
        htmlElement.style.transform = 'translateY(30px)';
      }
      
      // STEP 2: Progressive fade-out logic (CRITICAL - this enforces max 1-2 paragraphs visible)
      // This overrides the basic fade-in when we need to hide earlier paragraphs
      
      if (isMobile) {
        // Mobile: More forgiving distances but still progressive
        if (index === 1 && elementDistance > windowHeight * 0.3) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 2 && elementDistance > windowHeight * 0.5) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 3 && elementDistance > windowHeight * 0.7) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 4 && elementDistance > windowHeight * 0.9) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
      } else {
        // Desktop: Original aggressive timing - max 2 paragraphs visible
        if (index === 1 && elementDistance > windowHeight * 0.15) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 2 && elementDistance > windowHeight * 0.25) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 3 && elementDistance > windowHeight * 0.35) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
        if (index === 4 && elementDistance > windowHeight * 0.45) {
          htmlElement.style.opacity = '0';
          htmlElement.style.transform = 'translateY(-50px)';
        }
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
  
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// ALSO UPDATE: Fix About button scroll targeting in Hero.tsx
// Replace the About button onClick handler with this:

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    // Larger offset to show both header AND first paragraph
    const yOffset = -200; // Increased from -435 to show more content
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

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
              fontWeight: '600', 
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
            
            {/* Paragraph 1 - Introduction and Philosophy */}
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
            className="scroll-fade-element fade-away-early"
            >
              Classically trained but genre-defying, Timi embodies his philosophy: &quot; From classical to hip hop and everything in between. &quot; Born in the UK, raised in the Middle East, and currently calling America home, his multicultural journey infuses every performance with sounds as diverse as his background.
            </p>
            
            {/* Paragraph 2A - Core Artistry */}
            <p style={{ 
              fontSize: '18px', 
              lineHeight: '1.7', 
              marginBottom: '30px', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.4s'
            }}
            className="scroll-fade-element fade-away-early"
            >
              His artistry lies in making the piano sing stories. Whether emancipating Drake&apos;s intricate flows through melodic interpretation, weaving Clairo&apos;s ethereal ballads into Radiohead&apos;s complexity, or honoring Wu-Tang Clan and Frank Ocean on a concert grand, Timi transforms covers into conversations.
            </p>
            
            {/* Paragraph 2B - Technical Mastery */}
            <p style={{ 
              fontSize: '18px', 
              lineHeight: '1.7', 
              marginBottom: '30px', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.5s'
            }}
            className="scroll-fade-element fade-away-early"
            >
              His right hand becomes a voice, channeling lyrics through melody in ways that traditional sheet music rarely captures. Meanwhile, his left hand crafts brilliant transitions between songs and genres, drawing from exhaustive music theory knowledge—a feat that elevates his performances from mere covers to musical poetry.
            </p>
            
            {/* Paragraph 3 - Achievements and Recognition */}
            <p style={{ 
              fontSize: '18px', 
              lineHeight: '1.7', 
              marginBottom: '30px', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.6s'
            }}
            className="scroll-fade-element fade-away-medium"
            >
              This unique approach has captivated hundreds of thousands across TikTok and Instagram, leading to collaborations with Paramount Pictures and Nike. From European concert halls to Asian wedding venues, his performances prove that classical training and contemporary innovation can coexist beautifully.
            </p>
            
            {/* Paragraph 4 - Current Life and Call to Action */}
            <p style={{ 
              fontSize: '18px', 
              lineHeight: '1.7', 
              color: 'white',
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'all 0.8s ease',
              transitionDelay: '0.8s'
            }}
            className="scroll-fade-element"
            >
              Currently balancing Harvard studies with athletic pursuits and a growing performance schedule, Timi invites audiences to{' '}
              <a 
              href="/explore" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'underline',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={(e) => {
                e.preventDefault();
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:url(/timi-clean.png) center/cover;opacity:0;z-index:9999;transition:opacity 0.5s ease';
                document.body.appendChild(overlay);
                
                // Fade out current, fade in new
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.5s ease';
                overlay.style.opacity = '1';
                
                setTimeout(() => {
                  window.location.href = '/explore';
                }, 500);
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                target.style.color = 'rgba(255, 255, 255, 1)';
                target.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLElement;
                target.style.color = 'rgba(255, 255, 255, 0.9)';
                target.style.textShadow = '1px 1px 3px rgba(0, 0, 0, 0.8)';
              }}
            >
              explore
            </a>
              {' '}a world where piano knows no limits—making the instrument cool for brands, events, and a new generation of music lovers.
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
              
              {/* Functional Contact Form */}
              <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                {submitStatus !== 'idle' && (
                  <div style={{
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: submitStatus === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${submitStatus === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                    color: submitStatus === 'success' ? '#16a34a' : '#dc2626',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                  }}>
                    {statusMessage}
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>Name *</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    style={{
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
                  }}>Email *</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    style={{
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
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={{
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
                    placeholder="Tell me about your event..."
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
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: isSubmitting ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      const target = e.target as HTMLElement;
                      target.style.background = 'rgba(255, 255, 255, 0.3)';
                      target.style.transform = 'translateY(-1px)';
                      target.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.background = 'rgba(255, 255, 255, 0.2)';
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = 'none';
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
      
      {/* Fixed Social Media Icons */}
      <SocialMediaIcons />
    </div>
  );
}