'use client';

import React from 'react';
import { GameOverStats } from '@/game/GameEngine';
import { Skull, Trophy, Swords, Ruler, Clock, Crown, RotateCcw, Palette, Home, Eye, Settings } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col text-center">
        {/* Title */}
        <div className="mb-4">
          <Skull className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="font-game text-2xl font-bold text-red-400 mt-2">
            GAME OVER
          </h2>
          {isNewHighScore && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-400 text-xs font-bold mt-2">
              <Trophy className="w-3.5 h-3.5" /> NEW HIGH SCORE!
            </div>
          )}
        </div>

        {/* Big Score Display */}
        <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-4 mb-4">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
            Final Score
          </div>
          <div className="text-3xl font-game font-bold text-blue-400 tabular-nums mt-1">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Swords className="w-3.5 h-3.5" />
              <span>Kills</span>
            </div>
            <span className="text-lg font-bold text-slate-100 tabular-nums">
              {stats.kills}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Ruler className="w-3.5 h-3.5" />
              <span>Max Length</span>
            </div>
            <span className="text-lg font-bold text-slate-100 tabular-nums">
              {stats.length}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Time Survived</span>
            </div>
            <span className="text-lg font-bold text-slate-100 tabular-nums">
              {formatTime(stats.timeSurvivedSeconds)}
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Crown className="w-3.5 h-3.5" />
              <span>Peak Rank</span>
            </div>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              #{stats.topRank}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 font-game font-semibold text-white uppercase tracking-wider text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          {onSpectate && (
            <button
              onClick={onSpectate}
              className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-game font-semibold text-slate-200 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>Continue Spectating Arena Match</span>
            </button>
          )}

          {onReconfigureMatch && (
            <button
              onClick={onReconfigureMatch}
              className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-game font-semibold text-slate-200 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              <span>Configure Match / Change Rules</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onChangeSkin}
              className="py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-[#1e293b] font-game font-semibold text-slate-300 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
            >
              <Palette className="w-4 h-4" />
              <span>Skins</span>
            </button>

            <button
              onClick={onReturnToMenu}
              className="py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-[#1e293b] font-game font-semibold text-slate-300 uppercase tracking-wider text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
