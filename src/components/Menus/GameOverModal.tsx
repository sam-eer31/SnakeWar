'use client';

import React from 'react';
import { GameOverStats } from '@/game/GameEngine';

interface GameOverModalProps {
  stats: GameOverStats;
  highScore: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
  onChangeSkin: () => void;
  onReconfigureMatch?: () => void;
  onSpectate?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHighScore,
  onPlayAgain,
  onReturnToMenu,
  onChangeSkin,
  onReconfigureMatch,
  onSpectate,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col text-center relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="mb-4">
          <span className="text-4xl">💥</span>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-300 to-amber-400 mt-2">
            GAME OVER
          </h2>
          {isNewHighScore && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mt-2 animate-bounce">
              <span>🎉</span> NEW HIGH SCORE!
            </div>
          )}
        </div>

        {/* Big Score Display */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
            Final Score
          </div>
          <div className="text-4xl font-black font-mono text-cyan-400 mt-1">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">⚔️ Kills</span>
            <span className="text-lg font-bold text-slate-100 font-mono mt-0.5">
              {stats.kills}
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">📏 Max Length</span>
            <span className="text-lg font-bold text-slate-100 font-mono mt-0.5">
              {stats.length}
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">⏱️ Time Survived</span>
            <span className="text-lg font-bold text-slate-100 font-mono mt-0.5">
              {formatTime(stats.timeSurvivedSeconds)}
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">🏆 Peak Rank</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              #{stats.topRank}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 font-black text-slate-950 uppercase tracking-wider text-sm sm:text-base shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>Play Again</span>
            <span>🔁</span>
          </button>

          {onSpectate && (
            <button
              onClick={onSpectate}
              className="w-full py-2.5 rounded-2xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/70 font-bold text-indigo-300 hover:text-white text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
            >
              <span>👁️ Continue Spectating Arena Match</span>
            </button>
          )}

          {onReconfigureMatch && (
            <button
              onClick={onReconfigureMatch}
              className="w-full py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 font-bold text-cyan-300 text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚙️ Configure Match / Change Rules</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onChangeSkin}
              className="py-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>🎨</span> Skins
            </button>

            <button
              onClick={onReturnToMenu}
              className="py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>🏠</span> Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
