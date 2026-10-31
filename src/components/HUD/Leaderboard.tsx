'use client';

import React, { useState, useEffect } from 'react';
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
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  useEffect(() => {
    const updateDimensions = () => {
      setViewportHeight(window.innerHeight);
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  // Compute maximum entries dynamically based on screen height
  // Short screens (landscape mobile / small height < 380px): 5 entries so each row is crisp, legible, and stays strictly within bounds
  // Medium screens (< 600px): 7 entries
  // Tall screens (>= 600px): full 10 entries
  let maxVisibleEntries = 10;
  if (viewportHeight < 380) {
    maxVisibleEntries = 5;
  } else if (viewportHeight < 600) {
    maxVisibleEntries = 7;
  }

  const displayedEntries = entries.slice(0, maxVisibleEntries);
  const isPlayerInDisplayed = displayedEntries.some((e) => e.isPlayer);

  return (
    <div
      style={{
        // Mathematical 1/8 Screen Area: (0.35355 * W) * (0.35355 * H) = 0.125 * (W * H) = 1/8 Area
        width: '35.355vw',
        height: '35.355vh',
        fontSize: 'clamp(6.5px, min(1.1vw, 2.3vh), 12px)',
      }}
      className={`bg-[#0a0e1a]/95 rounded-none rounded-br-lg p-1 sm:p-1.5 select-none flex flex-col justify-between overflow-hidden border-b border-r border-[#1e293b]/60 ${
        isSpectating ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-[0.2vh] border-b border-white/5 mb-[0.2vh] shrink-0 text-[0.9em] font-game font-bold uppercase tracking-tight text-[#64748b] leading-tight">
        <span>Top Snakes</span>

        {isSpectating ? (
          <span className="text-[0.8em] font-game font-bold uppercase tracking-tight text-blue-400 bg-blue-950/60 px-1 py-0.2 rounded">
            Spec
          </span>
        ) : playerRank ? (
          <span className="text-[0.95em] font-game font-bold text-blue-400">
            #{playerRank}
          </span>
        ) : null}
      </div>

      {/* Entries List: flex-1 min-h-0 ensures it fills the container evenly without overflowing */}
      <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden py-[0.1vh]">
        {displayedEntries.map((entry, index) => {
          const rank = index + 1;
          const isSelected = isSpectating && spectatingSnakeId === entry.id;

          let nameColor = 'text-[#94a3b8]';
          let dotColor = '#64748b';

          if (entry.isPlayer) {
            nameColor = 'text-blue-400 font-bold';
            dotColor = '#3b82f6';
          } else if (entry.tier === 'easy') {
            nameColor = 'text-emerald-400';
            dotColor = '#10b981';
          } else if (entry.tier === 'medium') {
            nameColor = 'text-amber-400';
            dotColor = '#f59e0b';
          } else if (entry.tier === 'hard') {
            nameColor = 'text-red-400 font-semibold';
            dotColor = '#ef4444';
          }

          return (
            <div
              key={entry.id}
              onClick={() => {
                if (onSelectSnake) onSelectSnake(entry.id);
              }}
              title={isSpectating ? `Spectate ${entry.name}` : undefined}
              className={`flex-1 min-h-0 items-center justify-between px-1 rounded leading-none transition-colors flex ${
                isSelected
                  ? 'bg-blue-600/30 text-white font-bold'
                  : entry.isPlayer
                  ? 'bg-blue-950/50'
                  : isSpectating
                  ? 'hover:bg-white/5 cursor-pointer'
                  : ''
              }`}
            >
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="shrink-0 text-[#64748b] font-game font-bold text-right min-w-[1.2em]">
                  {rank}.
                </span>
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 'clamp(3px, min(0.35vw, 0.7vh), 5px)',
                    height: 'clamp(3px, min(0.35vw, 0.7vh), 5px)',
                    backgroundColor: dotColor,
                  }}
                />
                <span className={`truncate flex-1 font-game tracking-tight ${nameColor}`}>
                  {entry.name}
                </span>
              </div>
              <span className="shrink-0 font-game text-[#f1f5f9] font-medium pl-1 tabular-nums text-right">
                {entry.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* If Player is outside visible top list, show player's rank at the bottom */}
      {!isSpectating && !isPlayerInDisplayed && playerRank && (
        <div className="mt-[0.2vh] pt-[0.2vh] border-t border-white/5 shrink-0 flex items-center justify-between px-1 py-[0.2vh] rounded bg-blue-950/50 leading-none">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="shrink-0 text-blue-400 font-game font-bold text-right min-w-[1.2em]">
              #{playerRank}
            </span>
            <span
              className="shrink-0 rounded-full bg-blue-400"
              style={{
                width: 'clamp(3px, min(0.35vw, 0.7vh), 5px)',
                height: 'clamp(3px, min(0.35vw, 0.7vh), 5px)',
              }}
            />
            <span className="truncate flex-1 text-blue-300 font-game font-bold tracking-tight">
              {playerName}
            </span>
          </div>
          {playerScore !== undefined && (
            <span className="shrink-0 font-game text-blue-400 font-medium pl-1 tabular-nums text-right">
              {playerScore.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
