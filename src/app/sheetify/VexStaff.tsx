'use client';

import React, { useEffect, useRef } from 'react';

interface VexStaffProps {
  width?: number;
  clef?: string;
  timeSignature?: string;
  delay?: number;
  seed?: number;
  sonicScore?: number;
  backgroundOnly?: boolean;
  hideNotes?: boolean;
}

const PATTERNS = {
  top: [
    ['C5/8, B4/8, A4/16, G4/16, F4/16, E4/16, D4/q, C4/q', 'F4/h, G4/h'],
    ['E5/8, D5/8, C5/16, B4/16, A4/16, G4/16, F4/q, E4/q', 'A4/h, B4/h'],
    ['G4/8, A4/8, B4/16, C5/16, D5/16, E5/16, F5/q, G5/q', 'E5/h, C5/h'],
  ],
  bottom: [
    ['C4/q, E4/q, G4/8, A4/8, B4/q', 'C5/h, B4/h'],
    ['A3/q, C4/q, E4/8, F4/8, G4/q', 'A4/h, G4/h'],
    ['F4/q, A4/q, C5/8, B4/8, A4/q', 'G4/h, F4/h'],
  ]
};

export const VexStaff: React.FC<VexStaffProps> = ({
  width = 800,
  clef = 'treble',
  timeSignature = '4/4',
  delay = 0,
  seed = 0,
  sonicScore = 50,
  hideNotes = false,
}) => {
  const staticContainerRef = useRef<HTMLDivElement>(null);
  const animatedContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const drawSystem = (element: HTMLElement, patternIndex: number) => {
    element.innerHTML = '';

    try {
      const { Factory } = require('vexflow');

      const vf = new Factory({
        renderer: { elementId: element as unknown as string, width: width, height: 140 }
      });

      const score = vf.EasyScore();
      const system = vf.System({ width: width });

      const isTop = delay < 1;
      const collection = isTop ? PATTERNS.top : PATTERNS.bottom;
      const scoreOffset = Math.floor(sonicScore / 33);
      const patternIndexChoice = patternIndex + scoreOffset;
      const pattern = collection[patternIndexChoice % collection.length];

      score.set({ time: '4/4' });

      const voices1 = [score.voice(score.notes(pattern[0], { stem: 'auto' }))];
      system.addStave({ voices: voices1 })
        .addClef(clef)
        .addTimeSignature(timeSignature);

      const voices2 = [score.voice(score.notes(pattern[1], { stem: 'auto' }))];
      system.addStave({ voices: voices2 });

      vf.draw();

    } catch (e) {
      console.error("VexFlow Rendering Error:", e);
    }
  };

  useEffect(() => {
    if (width < 100) return;
    if (!staticContainerRef.current || !animatedContainerRef.current) return;

    drawSystem(staticContainerRef.current, seed + sonicScore);
    drawSystem(animatedContainerRef.current, seed + sonicScore);

    // Static layer: grey background with just stave lines visible (hide notes)
    const staticSvg = staticContainerRef.current.querySelector('svg');
    if (staticSvg) {
      const allElements = staticSvg.querySelectorAll('*');
      allElements.forEach((el) => {
        if (el.tagName === 'svg') return;
        (el as SVGElement).style.opacity = '0';
      });
      // Re-show only the stave line elements (lines spanning most of the width)
      staticSvg.querySelectorAll('line, rect, path').forEach((el) => {
        try {
          const bbox = (el as SVGGraphicsElement).getBBox();
          if (bbox.width > width * 0.5 && bbox.height < 5) {
            (el as SVGElement).style.opacity = '1';
          }
        } catch {}
      });
    }

  }, [width, clef, timeSignature, delay, seed, sonicScore]);

  return (
    <div style={{ position: 'relative', height: '140px', width: width }}>
      <div
        ref={staticContainerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.4, filter: 'grayscale(100%)' }}
      />
      <div
        key={seed}
        ref={wrapperRef}
        className="animate-reveal animate-glow-notes"
        style={{ position: 'absolute', inset: 0, zIndex: 10, animationDelay: `${delay}s` }}
      >
        <div ref={animatedContainerRef} style={{ transformOrigin: 'left' }} />
      </div>
    </div>
  );
};
