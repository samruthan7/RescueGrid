import React, { useRef, useState, useEffect } from 'react';

export default function TiltCard({ children, className = '', maxTilt = 7, depth = 15 }) {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(${depth}px)`,
      boxShadow: `0 14px 28px rgba(0,0,0,0.6), 0 0 15px rgba(212, 175, 55, 0.15)`
    });
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
      boxShadow: 'none'
    });
  };

  return (
    <div className="perspective-container h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={style}
        className={`tilt-element transition-all duration-200 ease-out h-full ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
