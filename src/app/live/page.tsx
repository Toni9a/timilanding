'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import SocialMediaIcons from '../../components/SocialMediaIcons';

export default function LiveRequests() {
  return (
    <main style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Background overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.25)',
        zIndex: 1
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        color: 'white'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Icon */}
          <div style={{
            fontSize: '80px',
            marginBottom: '30px'
          }}>
            🎹
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '700',
            margin: '0 0 20px 0',
            letterSpacing: '2px'
          }}>
            Live Requests
          </h1>

          {/* Coming Soon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '30px 50px',
              marginBottom: '40px'
            }}
          >
            <p style={{
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 15px 0',
              color: '#fff'
            }}>
              Coming Soon
            </p>
            <p style={{
              fontSize: '18px',
              margin: '0',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6'
            }}>
              Submit song requests for Timi&apos;s live streams and performances. 
              Vote on requests and see what&apos;s up next!
            </p>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Link 
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '50px',
                padding: '15px 30px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ← Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Social Media Icons */}
      <SocialMediaIcons />
    </main>
  );
}