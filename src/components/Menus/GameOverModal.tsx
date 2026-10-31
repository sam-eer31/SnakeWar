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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 select-none overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md bg-[#111827] border border-[#1e293b] rounded-2xl p-4 sm:p-5 flex flex-col text-center shadow-2xl my-auto max-h-[96vh] overflow-y-auto">
        {/* Title Header */}
        <div className="mb-2 sm:mb-3">
          <Skull className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto" />
          <h2 className="font-game text-xl sm:text-2xl font-bold text-red-400 mt-1">
            GAME OVER
          </h2>
          {isNewHighScore && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-400 text-[11px] sm:text-xs font-bold mt-1.5">
              <Trophy className="w-3.5 h-3.5" /> NEW HIGH SCORE!
            </div>
          )}
        </div>

        {/* Final Score Banner */}
        <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl py-2 px-3 sm:py-3 sm:px-4 mb-2.5 sm:mb-3">
          <div className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-400">
            Final Score
          </div>
          <div className="text-2xl sm:text-3xl font-game font-bold text-blue-400 tabular-nums mt-0.5">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-3 sm:mb-4">
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>Kills</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-100 tabular-nums">
              {stats.kills}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
              <Ruler className="w-3.5 h-3.5 text-blue-400" />
              <span>Max Length</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-100 tabular-nums">
              {stats.length}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Time Survived</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-100 tabular-nums">
              {formatTime(stats.timeSurvivedSeconds)}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Peak Rank</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-amber-400 tabular-nums">
              #{stats.topRank}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Primary Play Again Button */}
          <button
            onClick={onPlayAgain}
            className="w-full h-10 sm:h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-game font-semibold text-white uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          {/* Secondary Row: Spectate (left) + Home (right) */}
          <div className={`grid ${onSpectate ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            {onSpectate && (
              <button
                onClick={onSpectate}
                className="h-9 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-[#1e293b] font-game font-semibold text-slate-200 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Spectate</span>
              </button>
            )}

            <button
              onClick={onReturnToMenu}
              className="h-9 sm:h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#1e293b] font-game font-semibold text-slate-300 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
