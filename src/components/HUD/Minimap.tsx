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

    // Fixed internal high-DPI buffer
    const size = 160;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    const center = size / 2;
    const mapScale = (size * 0.48) / arenaRadius;

    ctx.clearRect(0, 0, size, size);

    // Dark radar arena circle background
    ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, arenaRadius * mapScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle radar crosshair rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, arenaRadius * 0.5 * mapScale, 0, Math.PI * 2);
    ctx.stroke();

    // Power-ups
    for (const p of powerUps) {
      const px = center + p.position.x * mapScale;
      const py = center + p.position.y * mapScale;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bot snakes
    for (const snake of allSnakes) {
      if (snake.isDead || snake.id === 'player') continue;
      const sx = center + snake.position.x * mapScale;
      const sy = center + snake.position.y * mapScale;

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player snake marker
    if (playerSnake && !playerSnake.isDead) {
      const px = center + playerSnake.position.x * mapScale;
      const py = center + playerSnake.position.y * mapScale;

      // Pulse ring
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [playerSnake, allSnakes, powerUps, arenaRadius]);

  return (
    <div className="relative rounded-full p-1 bg-[#0a0e1a]/90 backdrop-blur-md border border-[#1e293b] pointer-events-none select-none flex-shrink-0">
      <canvas
        ref={canvasRef}
        className="w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] rounded-full block"
      />
    </div>
  );
};
