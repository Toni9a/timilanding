'use client';

import { Instagram, Music, Linkedin, Youtube } from 'lucide-react';

export default function SocialMediaIcons() {
  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://instagram.com/timikeys_',
      icon: Instagram,
      color: '#E4405F'
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@timikeys_',
      icon: Music, // Using Music icon for TikTok since Lucide doesn't have TikTok
      color: '#000000'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@timikeys_',
      icon: Youtube,
      color: '#FF0000'
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/timi-esan-21442b20b/',
      icon: Linkedin,
      color: '#0077B5'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'row',
      gap: '8px'
    }}>
      {socialLinks.map((social, ) => {
        const IconComponent = social.icon;
        return (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textDecoration: 'none',
              opacity: 0.8
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.opacity = '0.8';
            }}
            title={`Follow on ${social.name}`}
          >
            <IconComponent 
              size={18} 
              color="white"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
              }}
            />
          </a>
        );
      })}
    </div>
  );
}