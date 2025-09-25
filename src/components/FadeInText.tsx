'use client';

import { useEffect, useRef, useState } from 'react';

interface FadeInTextProps {
  paragraphs: string[];
  className?: string;
}

export default function FadeInText({ paragraphs, className = '' }: FadeInTextProps) {
  const [visibleParagraphs, setVisibleParagraphs] = useState<boolean[]>(
    new Array(paragraphs.length).fill(false)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            
            // Reveal paragraphs sequentially
            paragraphs.forEach((_, index) => {
              setTimeout(() => {
                setVisibleParagraphs(prev => {
                  const newState = [...prev];
                  newState[index] = true;
                  return newState;
                });
              }, index * 150); // 150ms stagger between paragraphs
            });
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [paragraphs]);

  return (
    <div ref={containerRef} className={className}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={`mb-6 text-lg leading-relaxed transition-all duration-700 ${
            visibleParagraphs[index]
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}