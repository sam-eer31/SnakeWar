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
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderMinimap = () => {
      // Dynamic high-DPI buffer based on actual rendered element size (1/10 of screen)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displaySize = Math.round(rect.width) || 120;
      const size = Math.round(displaySize * dpr);

      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }

      const center = size / 2;
      const mapScale = (size * 0.48) / arenaRadius;
      const scale = size / 160;

      ctx.clearRect(0, 0, size, size);

      // Dark radar arena circle background
      ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.beginPath();
      ctx.arc(center, center, arenaRadius * mapScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Subtle radar crosshair rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = Math.max(1, 1 * scale);
      ctx.beginPath();
      ctx.arc(center, center, arenaRadius * 0.5 * mapScale, 0, Math.PI * 2);
      ctx.stroke();

      // Power-ups
      for (const p of powerUps) {
        const px = center + p.position.x * mapScale;
        const py = center + p.position.y * mapScale;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, 2.5 * scale), 0, Math.PI * 2);
        ctx.fill();
      }

      // Snakes (Distinguish real human players vs AI bots)
      for (const snake of allSnakes) {
        if (snake.isDead || snake === playerSnake) continue;
        const sx = center + snake.position.x * mapScale;
        const sy = center + snake.position.y * mapScale;

        if (!snake.isBot) {
          // Real human players: Vibrant glowing green dot with pulsing beacon
          const pulse = Math.sin(Date.now() * 0.008) * 1.5 * scale;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(3, 3.5 * scale), 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
          ctx.lineWidth = Math.max(1, 1.5 * scale);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(4.5, 5.5 * scale + pulse), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // AI bot snakes: Subtle slate gray
          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1.8, 2.2 * scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Player snake marker
      if (playerSnake && !playerSnake.isDead) {
        const px = center + playerSnake.position.x * mapScale;
        const py = center + playerSnake.position.y * mapScale;

        // Pulse ring
        const pulse = Math.sin(Date.now() * 0.006) * 1.2 * scale;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(5, 6.5 * scale + pulse), 0, Math.PI * 2);
        ctx.stroke();

        // Dot
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, 3.5 * scale), 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderMinimap);
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [playerSnake, allSnakes, powerUps, arenaRadius]);

  return (
    <div className="relative rounded-full p-1 bg-[#0a0e1a]/95 border border-[#1e293b] pointer-events-none select-none flex-shrink-0 shadow-lg">
      <canvas
        ref={canvasRef}
        className="w-[10vw] h-[10vw] min-w-[60px] min-h-[60px] max-w-[190px] max-h-[190px] rounded-full block aspect-square"
      />
    </div>
  );
};
