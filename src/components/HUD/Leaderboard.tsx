'use client';

import React from 'react';
import { LeaderboardEntry } from '@/game/GameEngine';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  playerRank?: number;
  playerScore?: number;
  playerName?: string;
  spectatingSnakeId?: string | null;
  onSelectSnake?: (snakeId: string) => void;
  isSpectating?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  playerRank,
  playerScore,
  playerName = 'You',
  spectatingSnakeId,
  onSelectSnake,
  isSpectating = false,
}) => {
  const isPlayerInTop10 = entries.some((e) => e.isPlayer);

  return (
    <div
      className={`w-44 sm:w-48 bg-black/55 backdrop-blur-md rounded-xl border border-white/10 p-2 sm:p-2.5 shadow-2xl select-none transition-all ${
        isSpectating ? 'pointer-events-auto border-cyan-500/30' : 'pointer-events-none'
      }`}
    >
      {/* Slither.io Clean Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
          Leaderboard
        </span>
        {isSpectating ? (
          <span className="text-[9px] font-medium text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
            Click to Spec
          </span>
        ) : playerRank ? (
          <span className="text-[10px] font-mono font-bold text-cyan-400">
            #{playerRank}
          </span>
        ) : null}
      </div>

      {/* Top 10 List */}
      <div className="space-y-[1px]">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isSelected = isSpectating && spectatingSnakeId === entry.id;

          // Authentic clean typography
          let nameColor = 'text-slate-200';
          let dotColor = '#94a3b8';

          if (entry.isPlayer) {
            nameColor = 'text-cyan-300 font-bold';
            dotColor = '#38bdf8';
          } else if (entry.tier === 'easy') {
            nameColor = 'text-emerald-300';
            dotColor = '#4ade80';
          } else if (entry.tier === 'medium') {
            nameColor = 'text-amber-300';
            dotColor = '#facc15';
          } else if (entry.tier === 'hard') {
            nameColor = 'text-rose-400 font-semibold';
            dotColor = '#f87171';
          }

          return (
            <div
              key={entry.id}
              onClick={() => {
                if (onSelectSnake) onSelectSnake(entry.id);
              }}
              title={isSpectating ? `Spectate ${entry.name}` : undefined}
              className={`flex items-center justify-between px-1.5 py-[2px] rounded text-[11px] leading-tight transition-colors ${
                isSelected
                  ? 'bg-cyan-500/25 border border-cyan-400/50 text-white font-bold'
                  : entry.isPlayer
                  ? 'bg-cyan-950/40 border border-cyan-500/20'
                  : isSpectating
                  ? 'hover:bg-white/10 cursor-pointer'
                  : ''
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-3.5 text-slate-400 text-[10px] font-mono text-right flex-shrink-0">
                  {rank}.
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className={`truncate max-w-[76px] sm:max-w-[86px] ${nameColor}`}>
                  {entry.name}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-300 font-medium pl-1 flex-shrink-0">
                {entry.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* If Player is outside Top 10, show player's rank at the bottom */}
      {!isSpectating && !isPlayerInTop10 && playerRank && (
        <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between px-1.5 py-[2px] rounded bg-cyan-950/40 border border-cyan-500/20 text-[11px]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-3.5 text-cyan-400 text-[10px] font-mono text-right flex-shrink-0">
              #{playerRank}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
            <span className="truncate max-w-[76px] sm:max-w-[86px] text-cyan-300 font-bold">
              {playerName}
            </span>
          </div>
          {playerScore !== undefined && (
            <span className="font-mono text-[10px] text-cyan-300 font-medium pl-1 flex-shrink-0">
              {playerScore.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
