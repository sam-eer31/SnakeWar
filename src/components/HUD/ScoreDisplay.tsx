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
    <div className="flex items-center gap-2.5 sm:gap-3 bg-[#0a0e1a]/90 backdrop-blur-md border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs select-none pointer-events-none flex-shrink-0">
      {/* Score */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-game font-bold uppercase tracking-wider text-[#64748b]">
          Score
        </span>
        <span className="font-game font-bold text-blue-400 text-sm sm:text-base tabular-nums">
          {stats.score.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-3.5 bg-[#1e293b]" />

      {/* Length */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-game font-bold uppercase tracking-wider text-[#64748b]">
          Len
        </span>
        <span className="font-game font-bold text-[#f1f5f9] text-xs sm:text-sm tabular-nums">
          {stats.length}
        </span>
      </div>

      <div className="w-px h-3.5 bg-[#1e293b]" />

      {/* Kills */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-game font-bold uppercase tracking-wider text-[#64748b]">
          Kills
        </span>
        <span className="font-game font-bold text-red-400 text-xs sm:text-sm tabular-nums">
          {stats.kills}
        </span>
      </div>

      {/* Best */}
      {highScore > 0 && (
        <>
          <div className="hidden sm:block w-px h-3.5 bg-[#1e293b]" />
          <div className="hidden sm:flex items-baseline gap-1.5">
            <span className="text-[10px] font-game font-bold uppercase tracking-wider text-amber-500/80">
              Best
            </span>
            <span className="font-game font-bold text-amber-400 text-xs sm:text-sm tabular-nums">
              {highScore.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
