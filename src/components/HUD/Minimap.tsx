'use client';

import React, { useEffect, useRef } from 'react';
import { Snake } from '@/game/entities/Snake';
import { PowerUp } from '@/game/entities/PowerUp';
import { GAME_CONFIG } from '@/game/config/constants';

interface MinimapProps {
  playerSnake: Snake | null;
  allSnakes: Snake[];
  powerUps: PowerUp[];
  arenaRadius?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerSnake,
  allSnakes,
  powerUps,
  arenaRadius = GAME_CONFIG.ARENA_RADIUS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const mapScale = (size * 0.44) / arenaRadius;

    ctx.clearRect(0, 0, size, size);

    // Circular arena background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, arenaRadius * mapScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Secondary grid ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, (arenaRadius * 0.5) * mapScale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw power-ups
    for (const p of powerUps) {
      const px = center + p.position.x * mapScale;
      const py = center + p.position.y * mapScale;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw bot snakes
    for (const snake of allSnakes) {
      if (snake.isDead || snake.id === 'player') continue;
      const sx = center + snake.position.x * mapScale;
      const sy = center + snake.position.y * mapScale;

      ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player snake
    if (playerSnake && !playerSnake.isDead) {
      const px = center + playerSnake.position.x * mapScale;
      const py = center + playerSnake.position.y * mapScale;

      // Pulse ring
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [playerSnake, allSnakes, powerUps]);

  return (
    <div className="relative rounded-full p-1 bg-slate-900/75 backdrop-blur-md border border-slate-700/60 shadow-2xl pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        width={110}
        height={110}
        className="rounded-full block"
      />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono uppercase tracking-wider text-slate-400 font-bold">
        Radar
      </div>
    </div>
  );
};

