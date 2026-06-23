'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import UnifiedMenu from '../../components/UnifiedMenu';
import SocialMediaIcons from '../../components/SocialMediaIcons';

interface Photo {
  src: string;
  caption: string;
  hidden: boolean;
  w: number;
  h: number;
}

function spanClass(w: number, h: number): string {
  const ratio = w / h;
  if (ratio >= 1.4) return 'wide';
  if (ratio <= 0.6) return 'tall';
  return 'normal';
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then((data: Photo[]) => setPhotos(data.filter(p => !p.hidden)));
  }, []);

  return (
    <>
      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: 280px;
          gap: 6px;
          padding: 0 6px 80px;
          max-width: 1600px;
          margin: 0 auto;
        }
        .gallery-item {
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .gallery-item.wide {
          grid-column: span 2;
        }
        .gallery-item.tall {
          grid-row: span 2;
        }
        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s ease;
          filter: brightness(0.9);
        }
        .gallery-item:hover img {
          transform: scale(1.05);
          filter: brightness(1);
        }
        .gallery-item .caption-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 30px 14px 12px;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: #fff;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.3px;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .gallery-item:hover .caption-overlay {
          opacity: 1;
        }
        @media (max-width: 1024px) {
          .gallery-grid {
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: 240px;
          }
        }
        @media (max-width: 640px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 200px;
            gap: 4px;
            padding: 0 4px 80px;
          }
        }
      `}</style>
      <main style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '50px 40px 30px',
          textAlign: 'center',
        }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 300,
              color: '#fff',
              margin: 0,
              letterSpacing: '10px',
              textTransform: 'uppercase',
            }}
          >
            Gallery
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '50px' }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              height: '1px',
              background: 'rgba(255,255,255,0.3)',
              margin: '18px auto 0',
            }}
          />
        </div>

        {/* Grid */}
        <motion.div
          className="gallery-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {photos.map((photo, i) => (
            <motion.div
              key={photo.src}
              className={`gallery-item ${spanClass(photo.w, photo.h)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(0.05 * i, 1.5), duration: 0.5 }}
              onClick={() => setSelected(i)}
            >
              <img src={photo.src} alt={photo.caption || ''} loading="lazy" />
              {photo.caption && (
                <div className="caption-overlay">{photo.caption}</div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Lightbox */}
        <AnimatePresence>
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSelected(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.95)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                cursor: 'zoom-out',
                padding: '40px',
              }}
            >
              <motion.img
                key={selected}
                src={photos[selected].src}
                alt=""
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  maxWidth: '90vw',
                  maxHeight: photos[selected].caption ? '82vh' : '90vh',
                  objectFit: 'contain',
                }}
              />
              {photos[selected].caption && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '15px',
                    marginTop: '16px',
                    textAlign: 'center',
                    maxWidth: '600px',
                  }}
                >
                  {photos[selected].caption}
                </motion.p>
              )}
              <div style={{
                position: 'absolute',
                top: '24px',
                right: '28px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '24px',
                cursor: 'pointer',
                fontWeight: 300,
              }}>
                ✕
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav bar */}
        <div style={{ position: 'fixed', top: '18px', left: '24px', right: '24px', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            ← Home
          </Link>
          <UnifiedMenu />
        </div>

        <SocialMediaIcons />
      </main>
    </>
  );
}
