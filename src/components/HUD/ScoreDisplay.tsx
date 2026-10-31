'use client';

import React from 'react';
import { PlayerStats } from '@/game/GameEngine';

interface ScoreDisplayProps {
  stats: PlayerStats | null;
  highScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ stats, highScore }) => {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 bg-white/[0.07] backdrop-blur-md border border-white/20 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs select-none pointer-events-none shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex-shrink-0">
      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300">Score</span>
        <span className="font-mono font-black text-cyan-300 text-xs sm:text-sm drop-shadow-sm">
          {stats.score.toLocaleString()}
        </span>
      </div>

      <span className="text-white/25 select-none">•</span>

      {/* Length */}
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300">Len</span>
        <span className="font-mono font-bold text-slate-100 text-[11px] sm:text-xs">
          {stats.length}
        </span>
      </div>

      <span className="text-white/25 select-none">•</span>

      {/* Kills */}
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300">Kills</span>
        <span className="font-mono font-bold text-rose-400 text-[11px] sm:text-xs">
          {stats.kills}
        </span>
      </div>

      {/* Best */}
      {highScore > 0 && (
        <>
          <span className="hidden sm:inline text-white/25 select-none">•</span>
          <div className="hidden sm:flex items-baseline gap-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300/90">Best</span>
            <span className="font-mono font-bold text-amber-300 text-[11px] sm:text-xs">
              {highScore.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
