'use client';

import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { useSheetifyData } from './useSheetifyData';
import { Loader2, LogIn, Share2 } from 'lucide-react';
import { VexStaff } from './VexStaff';
import { CodaSymbol } from './MusicSymbols';
import './sheetify.css';

interface SongItem { title: string; artist: string; key?: string; spotifyId?: string; tiktokLink?: string }

const SongPopup: React.FC<{ song: SongItem; onClose: () => void; position: { x: number; y: number } }> = ({ song, onClose, position }) => (
  <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
    <div style={{
      position: 'fixed', left: position.x, top: position.y, transform: 'translate(-50%, -100%)',
      zIndex: 101, backgroundColor: '#f5f0e6', border: '1px solid #c4b99a', borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px',
    }}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '13px', fontWeight: 'bold', color: '#292524', margin: 0 }}>{song.title}</p>
      <a href={`https://open.spotify.com/track/${song.spotifyId}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#1DB954', textDecoration: 'none', padding: '6px 0', borderTop: '1px solid #e7e5e4' }}>
        ▶ Play on Spotify
      </a>
      {song.tiktokLink && (
        <a href={song.tiktokLink} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#a855f7', textDecoration: 'none', padding: '6px 0', borderTop: '1px solid #e7e5e4' }}>
          ♫ Play Timi&apos;s cover
        </a>
      )}
    </div>
  </>
);

const EmptyStave: React.FC<{ width: number; timeSignature: string }> = ({ width, timeSignature }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || width < 100) return;
    containerRef.current.innerHTML = '';
    try {
      const { Stave, Renderer } = require('vexflow');
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, 140);
      const context = renderer.getContext();
      const stave = new Stave(0, 25, width - 1);
      stave.addClef('treble').addTimeSignature(timeSignature);
      stave.setContext(context).draw();
    } catch (e) {
      console.error('VexFlow empty stave error:', e);
    }
  }, [width, timeSignature]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, opacity: 0.4, filter: 'grayscale(100%)', overflow: 'visible' }} />;
};

const StaffRow: React.FC<{ songs: SongItem[]; startIndex: number; rowIndex: number; slabWidth: number; timeSignature: string; sonicScore: number; musicSeed: number; onSongClick: (song: SongItem, e: React.MouseEvent) => void }> = ({ songs, startIndex, rowIndex, slabWidth, musicSeed, timeSignature, onSongClick }) => {
  const revealDelay = 0.5 + rowIndex * 0.8;

  return (
    <div style={{ position: 'relative', width: '100%', height: '115px', zIndex: 0, overflow: 'visible' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <EmptyStave width={slabWidth} timeSignature={timeSignature} />
      </div>

      <div
        key={`row-${startIndex}-${musicSeed}`}
        className="animate-reveal"
        style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '58px', animationDelay: `${revealDelay}s` }}
      >
        <div
          style={{ width: '100%', display: 'grid', gap: '8px', alignItems: 'center', gridTemplateColumns: `repeat(${songs.length}, 1fr)`, paddingLeft: '80px', paddingRight: '16px' }}
        >
          {songs.map((song, i) => (
            <div key={i} onClick={(e) => onSongClick(song, e)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', minWidth: 0, cursor: 'pointer' }}>
              <div className="text-halo" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a8a29e' }}>#{startIndex + i + 1}</span>
                <span
                  className="song-glow-text"
                  style={{ fontSize: 'clamp(11px, 1.6vw, 18px)', fontWeight: 'bold', letterSpacing: '-0.025em', fontFamily: "'Playfair Display', serif", animationDelay: `${revealDelay}s` }}
                >
                  {song.title}
                </span>
                {song.key && (
                  <span style={{ fontSize: '8px', fontFamily: 'monospace', border: '1px solid #a8a29e', padding: '0 3px', borderRadius: '2px', opacity: 0.5, textTransform: 'uppercase', flexShrink: 0 }}>
                    {song.key}
                  </span>
                )}
              </div>
              <span
                className="song-glow-text"
                style={{ fontSize: '10px', marginLeft: '20px', fontFamily: 'sans-serif', animationDelay: `${revealDelay + 0.3}s` }}
              >
                {song.artist}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function SheetifyApp() {
  const {
    isAuthenticated,
    loading,
    matchedSongs,
    sonicData,
    login,
    enableDemoMode,
    timeRange,
    setTimeRange
  } = useSheetifyData();

  const [slabWidth, setSlabWidth] = useState(800);
  const [musicSeed, setMusicSeed] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [popupSong, setPopupSong] = useState<{ song: SongItem; position: { x: number; y: number } } | null>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash === '#demo' && !isAuthenticated) {
      enableDemoMode();
    }
  }, []);

  const timeSignatureMap: Record<string, string> = {
    'short_term': '4/4',
    'medium_term': '3/4',
    'long_term': '6/4'
  };

  const currentTimeSignature = timeSignatureMap[timeRange] || '4/4';

  const handleMatchTaste = () => {
    setMusicSeed(prev => prev + 1);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail) return;
    setRequestStatus('sending');
    try {
      await fetch('/api/sheetify/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail }),
      });
      setRequestStatus('sent');
      setRequestEmail('');
    } catch {
      setRequestStatus('error');
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#fdfbf7',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: true,
        ignoreElements: (el) => el.tagName === 'svg',
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'sheetify-receipt.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: 'My Sheetify Receipt',
            text: 'Check out my music taste receipt from Sheetify!',
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sheetify-receipt.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setSharing(false);
    }
  };

  const displaySongs = matchedSongs.slice(0, 15).map((item) => ({
    title: item.track.name,
    artist: item.track.artists[0].name,
    key: item.matchType !== 'none' ? (item.matchType === 'exact' ? 'MATCH' : 'VIBE') : '',
    spotifyId: item.track.id,
    tiktokLink: item.matchType === 'exact' && item.matches.length > 0 ? item.matches[0].versions[0] : undefined,
  }));

  const songsPerRow = 3;

  const handleSongClick = (song: SongItem, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupSong({ song, position: { x: rect.left + rect.width / 2, y: rect.top } });
  };

  useEffect(() => {
    if (!slabRef.current) return;
    const observer = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        setSlabWidth(entries[0].contentRect.width);
      });
    });
    observer.observe(slabRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#e8e4dc',
      color: '#1c1917',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Playfair Display', serif",
    }}>
      <style>{`@media (min-width: 768px) { .sheetify-outer { padding: 32px !important; } .sheetify-content { padding-left: 32px !important; padding-right: 32px !important; } .sheetify-controls { padding-left: 32px !important; padding-right: 32px !important; } }`}</style>

      <div style={{ width: '100%', maxWidth: '896px', marginBottom: '24px' }} />

      <div className="sheetify-outer" style={{ width: '100%', maxWidth: '896px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        <div ref={cardRef} className="rustic-paper" style={{ position: 'relative', overflow: 'hidden', borderRadius: '2px', border: '1px solid #c4b99a', minHeight: '800px' }}>

          {/* Header */}
          <div style={{ padding: '16px 32px 8px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 30 }}>

            {/* Logo */}
            <div style={{ position: 'relative', height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/keyslogo.gif"
                alt="Logo"
                style={{ height: '100%', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', opacity: 0.9 }}
              />
            </div>

            {/* Description */}
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', color: '#78716c', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6, marginBottom: '16px' }}>
              Connect your Spotify to see which of your favourite songs Timi has covered.
            </p>

            {/* Login + Request Access */}
            {!isAuthenticated && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '24px', width: '100%', maxWidth: '448px' }}>
                <button
                  onClick={login}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Playfair Display', serif", color: '#292524', border: '1px solid #292524', backgroundColor: '#f5f0e6', padding: '12px 32px', cursor: 'pointer', boxShadow: '2px 2px 0 #44403c', transition: 'all 0.15s' }}
                >
                  <LogIn size={18} />
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '14px' }}>Login with Spotify</span>
                </button>

                <div style={{ width: '100%', borderTop: '1px solid #d6d3d1', paddingTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#78716c', marginBottom: '12px' }}>
                    Don&apos;t have access yet?
                  </p>
                  {requestStatus === 'sent' ? (
                    <p style={{ fontFamily: "'Playfair Display', serif", color: '#57534e', fontSize: '14px', fontStyle: 'italic' }}>
                      Request received — we&apos;ll add you shortly.
                    </p>
                  ) : (
                    <form onSubmit={handleRequestAccess} style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input
                        type="email"
                        required
                        placeholder="Your Spotify email"
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                        style={{ flex: 1, padding: '8px 16px', border: '1px solid #a8a29e', backgroundColor: '#f5f0e6', fontFamily: "'Playfair Display', serif", fontSize: '14px', color: '#292524', outline: 'none' }}
                      />
                      <button
                        type="submit"
                        disabled={requestStatus === 'sending'}
                        style={{ fontFamily: "'Playfair Display', serif", color: '#57534e', border: '1px solid #a8a29e', backgroundColor: '#f5f0e6', padding: '8px 20px', cursor: 'pointer', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '2px 2px 0 #a8a29e', transition: 'all 0.15s' }}
                      >
                        {requestStatus === 'sending' ? '...' : 'Request'}
                      </button>
                    </form>
                  )}
                  {requestStatus === 'error' && (
                    <p style={{ fontFamily: "'Playfair Display', serif", color: '#b91c1c', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>Something went wrong. Try again.</p>
                  )}
                </div>
              </div>
            )}

            {/* Controls Row */}
            <div className="sheetify-controls" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 8px 16px', position: 'relative', zIndex: 20 }}>

              {/* Time Selection */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ position: 'relative', backgroundColor: '#fdfbf7', border: '1px solid #292524', padding: '4px 12px', boxShadow: '2px 2px 0 #44403c', transition: 'all 0.15s' }}>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{ appearance: 'none', background: 'transparent', fontFamily: "'Playfair Display', serif", fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', outline: 'none', paddingRight: '24px', color: '#292524', border: 'none' }}
                  >
                    <option value="short_term">Last Month</option>
                    <option value="medium_term">3 Months</option>
                    <option value="long_term">6 Months</option>
                  </select>
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px' }}>▼</span>
                </div>
              </div>

              {/* Shuffle Vibe */}
              <div style={{ flexShrink: 0, padding: '0 16px' }}>
                <button
                  onClick={handleMatchTaste}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <div style={{ color: '#f97316', transition: 'transform 0.3s' }}>
                    <CodaSymbol className="w-8 h-8" />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(234,88,12,0.8)', letterSpacing: '0.2em', marginTop: '4px', textTransform: 'uppercase' }}>
                    shuffle vibe
                  </span>
                </button>
              </div>

              {/* Sonic Score */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                {sonicData && (
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', textAlign: 'right' }}>
                    <div style={{ color: '#78716c' }}>SONIC RANGE</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.round(sonicData.score)}%</div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Dotted separator */}
          <div style={{ borderBottom: '1px dashed #d6d3d1', margin: '0 32px 24px', opacity: 0.5, position: 'relative', zIndex: 20 }} />

          {/* Main Content */}
          <div ref={slabRef} className="sheetify-content" style={{ padding: '0 8px 48px', width: '100%', position: 'relative' }}>

            {/* Intro Staves */}
            <div style={{ marginBottom: '0', width: '100%', transition: 'all 0.5s', position: 'relative', zIndex: 20 }}>
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <VexStaff
                  width={slabWidth}
                  delay={0.2}
                  timeSignature={currentTimeSignature}
                  seed={musicSeed}
                  sonicScore={sonicData?.score || 50}
                />
              </div>
              <div style={{ width: '100%', overflow: 'hidden', marginTop: '-32px' }}>
                <VexStaff
                  width={slabWidth}
                  delay={2.5}
                  timeSignature={currentTimeSignature}
                  clef="treble"
                  seed={musicSeed}
                  sonicScore={sonicData?.score || 50}
                />
              </div>
            </div>

            {/* Song List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '-16px', position: 'relative' }}>

              {loading && (
                <div className="font-script" style={{ textAlign: 'center', padding: '80px 0', fontSize: '30px', opacity: 0.5 }}>
                  Fetching your history...
                </div>
              )}

              {!loading && (() => {
                const rows = [];
                for (let i = 0; i < displaySongs.length; i += songsPerRow) {
                  rows.push(
                    <StaffRow
                      key={i}
                      songs={displaySongs.slice(i, i + songsPerRow)}
                      startIndex={i}
                      rowIndex={i / songsPerRow}
                      slabWidth={slabWidth}
                      timeSignature={currentTimeSignature}
                      sonicScore={sonicData?.score || 50}
                      musicSeed={musicSeed}
                      onSongClick={handleSongClick}
                    />
                  );
                }
                return rows;
              })()}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '48px', textAlign: 'center', borderTop: '1px solid #1c1917', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', opacity: 0.8, position: 'relative', zIndex: 20 }}>
              <div style={{ height: '32px', width: '256px', backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAgMAAADXB5lNAAAADFBMVEUAAAAAAAAAAAD///+i1c8vAAAAAXRSTlMAQObYZgAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADxJREFUOMtjGMbAAIyCkYGhYCCCAgYGoQIMDIIFDBwKCxgoFA4wcCg8YOBQeMDAofCAgUPhAQOHwoHBAwYA/gMMCF316W0AAAAASUVORK5CYII=')", backgroundRepeat: 'repeat-x', opacity: 0.6 }} />
              <p style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Generated by Sheetify</p>
              {isAuthenticated && displaySongs.length > 0 && (
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Playfair Display', serif", color: '#57534e', border: '1px solid #a8a29e', backgroundColor: '#fdfbf7', padding: '8px 24px', cursor: 'pointer', boxShadow: '2px 2px 0 #a8a29e', marginBottom: '8px', transition: 'all 0.15s' }}
                >
                  {sharing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Share2 size={16} />}
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '12px' }}>
                    {sharing ? 'Generating...' : 'Share Receipt'}
                  </span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
      {popupSong && (
        <SongPopup song={popupSong.song} position={popupSong.position} onClose={() => setPopupSong(null)} />
      )}
    </div>
  );
}
