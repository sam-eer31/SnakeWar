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
    <div className="flex items-center gap-3 select-none pointer-events-none">
      {/* Current Score */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 shadow-2xl flex flex-col">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Score</span>
        <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
          {stats.score.toLocaleString()}
        </span>
      </div>

      {/* Length & Kills */}
      <div className="flex gap-2">
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2">
          <span className="text-emerald-400 text-sm">📏</span>
          <div>
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Length</div>
            <div className="text-sm font-bold text-slate-200 font-mono">{stats.length}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2">
          <span className="text-rose-400 text-sm">⚔️</span>
          <div>
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Kills</div>
            <div className="text-sm font-bold text-rose-300 font-mono">{stats.kills}</div>
          </div>
        </div>

        {/* High Score Badge */}
        {highScore > 0 && (
          <div className="hidden sm:flex bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-md items-center gap-2">
            <span className="text-amber-400 text-sm">👑</span>
            <div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-amber-400/80">Best</div>
              <div className="text-sm font-bold text-amber-300 font-mono">{highScore.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

