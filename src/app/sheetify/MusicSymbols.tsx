'use client';

import React from 'react';

export const TrebleClef = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 50 120" className={className} style={{ height: '100%' }}>
    <path
      d="M25 100 C 15 100, 10 90, 15 80 C 20 70, 30 75, 30 85 C 30 92, 22 92, 22 88 C 22 85, 25 80, 25 70 L 25 30 C 25 15, 35 15, 35 25 C 35 35, 20 40, 20 50 C 20 60, 40 60, 40 45 C 40 35, 30 30, 30 10 L 30 110 C 30 115, 20 115, 20 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="22" cy="88" r="3" fill="currentColor" />
  </svg>
);

export const QuarterNote = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 30 90" className={className}>
    <ellipse cx="12" cy="75" rx="8" ry="6" transform="rotate(-20 12 75)" fill="currentColor" />
    <line x1="19" y1="75" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const EighthNote = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 40 90" className={className}>
    <ellipse cx="12" cy="75" rx="8" ry="6" transform="rotate(-20 12 75)" fill="currentColor" />
    <line x1="19" y1="75" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
    <path d="M19 10 Q 35 25, 35 40" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>
);

export const BeamedNotes = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 60 90" className={className}>
    <ellipse cx="12" cy="75" rx="8" ry="6" transform="rotate(-20 12 75)" fill="currentColor" />
    <line x1="19" y1="75" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="42" cy="70" rx="8" ry="6" transform="rotate(-20 42 70)" fill="currentColor" />
    <line x1="49" y1="70" x2="49" y2="5" stroke="currentColor" strokeWidth="2" />
    <line x1="19" y1="10" x2="49" y2="5" stroke="currentColor" strokeWidth="4" />
  </svg>
);

export const CodaSymbol = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 40 60" className={className}>
    <ellipse cx="20" cy="30" rx="14" ry="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <line x1="20" y1="5" x2="20" y2="55" stroke="currentColor" strokeWidth="2.5" />
    <line x1="4" y1="30" x2="36" y2="30" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);
