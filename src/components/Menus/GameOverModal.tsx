'use client';

import React from 'react';
import { GameOverStats } from '@/game/GameEngine';
import { Skull, Trophy, Swords, Ruler, Clock, Crown, RotateCcw, Home, Eye } from 'lucide-react';

interface GameOverModalProps {
  stats: GameOverStats;
  highScore: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
  onChangeSkin?: () => void;
  onReconfigureMatch?: () => void;
  onSpectate?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHighScore,
  onPlayAgain,
  onReturnToMenu,
  onSpectate,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 select-none overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md bg-[#111827] border border-[#1e293b] rounded-2xl p-3 sm:p-4 flex flex-col text-center shadow-2xl my-auto max-h-[96vh] overflow-y-auto">
        {/* Title Header */}
        <div className="mb-1.5 sm:mb-2">
          <Skull className="w-5 h-5 sm:w-7 sm:h-7 text-red-400 mx-auto" />
          <h2 className="font-game text-lg sm:text-xl font-bold text-red-400 mt-0.5">
            GAME OVER
          </h2>
          {isNewHighScore && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-400 text-[10px] sm:text-[11px] font-bold mt-1">
              <Trophy className="w-3 h-3" /> NEW HIGH SCORE!
            </div>
          )}
        </div>

        {/* Final Score Banner - Ultra Compact */}
        <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl py-1 px-2.5 sm:py-1.5 sm:px-3 mb-2">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Final Score
          </div>
          <div className="text-xl sm:text-2xl font-game font-bold text-blue-400 tabular-nums">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* 4 Stats in Single Row - Compact Padding */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-2.5 sm:mb-3">
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-1 sm:p-1.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <Swords className="w-3 h-3 text-red-400 shrink-0" />
              <span>Kill</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums mt-0.5">
              {stats.kills}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-1 sm:p-1.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <Ruler className="w-3 h-3 text-blue-400 shrink-0" />
              <span>Max</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums mt-0.5">
              {stats.length}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-1 sm:p-1.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Time</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums mt-0.5">
              {formatTime(stats.timeSurvivedSeconds)}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-1 sm:p-1.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Peak</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-amber-400 tabular-nums mt-0.5">
              #{stats.topRank}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {/* Primary Play Again Button */}
          <button
            onClick={onPlayAgain}
            className="w-full h-9 sm:h-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-game font-semibold text-white uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          {/* Secondary Row: Spectate (left) + Home (right) */}
          <div className={`grid ${onSpectate ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 sm:gap-2`}>
            {onSpectate && (
              <button
                onClick={onSpectate}
                className="h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-[#1e293b] font-game font-semibold text-slate-200 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Spectate</span>
              </button>
            )}

            <button
              onClick={onReturnToMenu}
              className="h-8 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#1e293b] font-game font-semibold text-slate-300 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
