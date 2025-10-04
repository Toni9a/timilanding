// src/components/UnifiedMenu.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface UnifiedMenuProps {
  isDark?: boolean; // Controls button styling based on background
}

export default function UnifiedMenu({ isDark = false }: UnifiedMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Gallery', href: '/gallery' },
    { name: 'Explore Music', href: '/explore' },
    { name: 'Sheetify', href: '/sheetify' },
    { name: 'Live Requests', href: '/live' }
  ];

  return (
    <>
      {/* Animated Hamburger Button */}
      <motion.button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          cursor: 'pointer',
          width: '48px',
          height: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          zIndex: 21
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          backgroundColor: isMenuOpen 
            ? 'rgba(255, 255, 255, 0.25)' 
            : 'rgba(255, 255, 255, 0.15)'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Hamburger Lines with Smooth Animation */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: '20px',
              height: '2px',
              backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'white',
              borderRadius: '1px'
            }}
            animate={{
              rotate: isMenuOpen 
                ? (i === 0 ? 45 : i === 2 ? -45 : 0)
                : 0,
              y: isMenuOpen 
                ? (i === 0 ? 6 : i === 2 ? -6 : 0)
                : 0,
              opacity: isMenuOpen && i === 1 ? 0 : 1,
              scale: isMenuOpen && i === 1 ? 0.8 : 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        ))}
      </motion.button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                zIndex: 30
              }}
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.4 
              }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '320px',
                height: '100vh',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.3)',
                zIndex: 31,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Menu Header */}
              <div style={{
                padding: '30px 25px 20px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#333',
                    letterSpacing: '1px'
                  }}
                >
                  Menu
                </motion.h3>
                
                <motion.button
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666'
                  }}
                  whileHover={{ 
                    scale: 1.1, 
                    backgroundColor: 'rgba(0, 0, 0, 0.2)' 
                  }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, rotate: 180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  ×
                </motion.button>
              </div>

              {/* Menu Items */}
              <div style={{ 
                padding: '20px 0', 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      delay: 0.1 + index * 0.1,
                      duration: 0.3
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '18px 25px',
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#444',
                        textDecoration: 'none',
                        borderLeft: '4px solid transparent',
                        transition: 'all 0.3s ease',
                        borderRadius: '0 12px 12px 0',
                        margin: '0 8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                        e.currentTarget.style.borderLeftColor = '#8B5CF6';
                        e.currentTarget.style.color = '#8B5CF6';
                        e.currentTarget.style.transform = 'translateX(8px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                        e.currentTarget.style.color = '#444';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  padding: '20px 25px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  color: '#666',
                  textAlign: 'center'
                }}
              >
                Timikeys Music
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}