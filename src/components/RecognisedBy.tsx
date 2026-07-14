'use client';

import { useEffect, useRef, useState } from 'react';

const PEOPLE = [
  'Drake',
  'Olivia Dean',
  'Dave',
  'Knucks',
  'The Weeknd',
  'Damien Lillard',
  'Metro Boomin',
  'Roisee',
  'Tyler, The Creator',
  'James Blake',
  'Dustin Poirier',
  'Outkast',
  'Coldplay',
  'Busta Rhymes',
  'Smino',
  'Yara Shahidi',
  'SZA',
  'Westside Gunn',
  'Illmind',
  'Madison Beer',
  'Rex Orange County',
  'Jim Legxacy',
];

type Brand = { name: string; logo: string; height?: number };

const BRANDS: Brand[] = [
  { name: 'LinkUp TV', logo: '/logos/linkuptv.png' },
  { name: 'Complex', logo: '/logos/complex.svg' },
  { name: 'Genius', logo: '/logos/genius.svg' },
  { name: 'Paramount Pictures', logo: '/logos/paramount.svg', height: 40 },
  { name: 'Warner Bros', logo: '/logos/warnerbros.svg', height: 40 },
  { name: 'Nike', logo: '/logos/nike.svg' },
  { name: 'Spider-Man: Into the Spider-Verse', logo: '/logos/spiderverse.png' },
  { name: 'Stranger Things', logo: '/logos/strangerthings.svg' },
  { name: 'TikTok', logo: '/logos/tiktok.svg' },
];

function BrandMark({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return (
      <span
        style={{
          fontSize: '17px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        {brand.name}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={brand.logo}
      alt={brand.name}
      onError={() => setFailed(true)}
      className="recognised-by-logo"
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['--logo-height' as any]: `${brand.height ?? 22}px`,
        height: 'var(--logo-height)',
        width: 'auto',
        maxWidth: '180px',
        objectFit: 'contain',
        opacity: 0.45,
        filter: 'grayscale(1) brightness(0) invert(1)',
      }}
    />
  );
}

function MarqueeRow({
  items,
  direction,
  speed,
}: {
  items: React.ReactNode[];
  direction: 'left' | 'right';
  speed: number;
}) {
  const track = [...items, ...items];

  return (
    <div
      className="marquee-wrapper"
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          width: 'max-content',
          animationDuration: `${speed}s`,
          animationName: direction === 'left' ? 'scroll-left' : 'scroll-right',
        }}
      >
        {track.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              padding: '0 28px',
            }}
          >
            {item}
            <span
              style={{
                marginLeft: '28px',
                color: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function nameStyle(): React.CSSProperties {
  return {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '21px',
    fontWeight: 500,
    letterSpacing: '0.01em',
    color: 'rgba(255, 255, 255, 0.45)',
    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
  };
}

export default function RecognisedBy() {
  const peopleItems = PEOPLE.map((name) => (
    <span key={name} style={nameStyle()} className="recognised-by-name">
      {name}
    </span>
  ));

  const brandItems = BRANDS.map((brand) => (
    <BrandMark key={brand.name} brand={brand} />
  ));

  return (
    <section
      className="recognised-by-section"
      style={{
        padding: '60px 0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style jsx global>{`
        .marquee-track {
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .marquee-wrapper:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes scroll-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
        @media (max-width: 640px) {
          .recognised-by-section {
            padding: 40px 0 !important;
          }
          .recognised-by-name {
            font-size: 16px !important;
          }
          .recognised-by-logo {
            height: calc(var(--logo-height) * 0.75) !important;
            max-width: 120px !important;
          }
        }
      `}</style>

      <p
        style={{
          textAlign: 'center',
          fontSize: '13px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.35)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          marginBottom: '32px',
        }}
      >
        Recognised By
      </p>

      <div style={{ marginBottom: '20px' }}>
        <MarqueeRow items={peopleItems} direction="left" speed={PEOPLE.length * 7} />
      </div>
      <MarqueeRow items={brandItems} direction="right" speed={BRANDS.length * 9} />
    </section>
  );
}
