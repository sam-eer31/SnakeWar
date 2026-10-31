'use client';

import React, { useState } from 'react';
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
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // On mobile, show top 5 unless expanded; on sm+, show full 10
  const maxMobileEntries = mobileExpanded ? 10 : 5;
  const isPlayerInDisplayed = entries
    .slice(0, maxMobileEntries)
    .some((e) => e.isPlayer);

  return (
    <div
      className={`w-[134px] sm:w-[170px] bg-black/35 hover:bg-black/60 backdrop-blur-[2px] rounded-lg border border-white/10 p-1 sm:p-2 shadow-xl select-none transition-all ${
        isSpectating ? 'pointer-events-auto border-cyan-500/30' : 'pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-0.5 border-b border-white/10 mb-0.5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-300">
            Top Snakes
          </span>
          {/* Subtle mobile expand toggle */}
          <button
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="sm:hidden pointer-events-auto text-[8px] text-cyan-400/80 hover:text-cyan-300 px-0.5"
            title={mobileExpanded ? 'Show top 5' : 'Show top 10'}
          >
            {mobileExpanded ? '▲' : '▼'}
          </button>
        </div>

        {isSpectating ? (
          <span className="text-[8px] sm:text-[9px] font-medium text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40">
            Spec
          </span>
        ) : playerRank ? (
          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-cyan-400">
            #{playerRank}
          </span>
        ) : null}
      </div>

      {/* Entries List */}
      <div className="space-y-[1px]">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isSelected = isSpectating && spectatingSnakeId === entry.id;

          // Responsive visibility: hide ranks > 5 on mobile unless expanded
          const isHiddenOnMobile = index >= 5 && !mobileExpanded;

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
              className={`items-center justify-between px-1 py-[1px] rounded text-[10px] sm:text-[11px] leading-tight transition-colors ${
                isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
              } ${
                isSelected
                  ? 'bg-cyan-500/25 border border-cyan-400/50 text-white font-bold'
                  : entry.isPlayer
                  ? 'bg-cyan-950/40 border border-cyan-500/20'
                  : isSpectating
                  ? 'hover:bg-white/10 cursor-pointer'
                  : ''
              }`}
            >
              <div className="flex items-center gap-1 truncate">
                <span className="w-3 sm:w-3.5 text-slate-400 text-[9px] sm:text-[10px] font-mono text-right flex-shrink-0">
                  {rank}.
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className={`truncate max-w-[50px] sm:max-w-[76px] ${nameColor}`}>
                  {entry.name}
                </span>
              </div>
              <span className="font-mono text-[9px] sm:text-[10px] text-slate-300 font-medium pl-1 flex-shrink-0">
                {entry.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* If Player is outside visible top list, show player's rank at the bottom */}
      {!isSpectating && !isPlayerInDisplayed && playerRank && (
        <div className="mt-0.5 pt-0.5 border-t border-white/10 flex items-center justify-between px-1 py-[1px] rounded bg-cyan-950/40 border border-cyan-500/20 text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-1 truncate">
            <span className="w-3 sm:w-3.5 text-cyan-400 text-[9px] sm:text-[10px] font-mono text-right flex-shrink-0">
              #{playerRank}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
            <span className="truncate max-w-[50px] sm:max-w-[76px] text-cyan-300 font-bold">
              {playerName}
            </span>
          </div>
          {playerScore !== undefined && (
            <span className="font-mono text-[9px] sm:text-[10px] text-cyan-300 font-medium pl-1 flex-shrink-0">
              {playerScore.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
