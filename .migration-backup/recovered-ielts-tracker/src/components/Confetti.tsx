import React, { useEffect, useState } from 'react';

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; r: number; dx: number; dy: number; color: string }>>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const colors = ['#2EC4B6', '#FF6B6B', '#FFD166', '#7B5EA7', '#06D6A0'];
    const newParticles = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      r: Math.random() * 6 + 2,
      dx: Math.random() * 20 - 10,
      dy: Math.random() * -20 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(newParticles);

    let animationFrame: number;
    const animate = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.dx,
        y: p.y + p.dy,
        dy: p.dy + 0.5, // gravity
      })).filter(p => p.y < window.innerHeight));

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.r * 2,
            height: p.r * 2,
            backgroundColor: p.color,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
