'use client';

import React from 'react';
import { Snake } from '@/game/entities/Snake';

interface SpectatorControlsProps {
  spectatedSnake: Snake | null;
  isFreeCam: boolean;
  currentZoom: number;
  totalSnakes: number;
  onCyclePrev: () => void;
  onCycleNext: () => void;
  onToggleFreeCam: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onJoinArena: () => void;
  onReturnToMenu: () => void;
}

export const SpectatorControls: React.FC<SpectatorControlsProps> = ({
  spectatedSnake,
  isFreeCam,
  currentZoom,
  totalSnakes,
  onCyclePrev,
  onCycleNext,
  onToggleFreeCam,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onJoinArena,
  onReturnToMenu,
}) => {
  const zoomPercent = Math.round(currentZoom * 100);

  // Difficulty Tier styling for spectated snake
  let tierBadge = null;
  let nameColor = 'text-cyan-300';
  if (spectatedSnake) {
    if (spectatedSnake.tier === 'easy') {
      nameColor = 'text-emerald-400';
      tierBadge = (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold uppercase">
          🟢 Easy Bot
        </span>
      );
    } else if (spectatedSnake.tier === 'medium') {
      nameColor = 'text-amber-300';
      tierBadge = (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold uppercase">
          🟡 Medium Bot
        </span>
      );
    } else if (spectatedSnake.tier === 'hard') {
      nameColor = 'text-rose-400';
      tierBadge = (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 font-bold uppercase animate-pulse">
          🔴 Hard Bot (Apex)
        </span>
      );
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-30 pointer-events-none flex flex-col items-center gap-3 px-4">
      {/* Top Floating Spectator Status & Controls */}
      <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 max-w-4xl w-full">
        {/* Left: Mode Badge & Target Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 px-3 py-1.5 rounded-xl shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="text-xs font-black tracking-wider uppercase text-indigo-300">
              SPECTATING
            </span>
          </div>

          {isFreeCam ? (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-amber-400 font-bold">🕊️ Free Camera</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Click + drag canvas or WASD to pan)
              </span>
            </div>
          ) : spectatedSnake ? (
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-black ${nameColor} max-w-[140px] sm:max-w-[180px] truncate`}>
                {spectatedSnake.name}
              </span>
              {tierBadge}
              {spectatedSnake.aiBrain && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/40 text-indigo-300">
                    {spectatedSnake.aiBrain.personality?.archetype || 'AI'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border ${
                    spectatedSnake.aiBrain.state === 'INTERCEPT'
                      ? 'bg-rose-950/90 border-rose-500/70 text-rose-300 animate-pulse'
                      : spectatedSnake.aiBrain.state === 'CIRCLE'
                      ? 'bg-purple-950/90 border-purple-500/70 text-purple-300'
                      : spectatedSnake.aiBrain.state === 'SURVIVE' || spectatedSnake.aiBrain.state === 'ESCAPE'
                      ? 'bg-red-950/90 border-red-500/70 text-red-300 animate-pulse'
                      : spectatedSnake.aiBrain.state === 'EVADE'
                      ? 'bg-orange-950/90 border-orange-500/70 text-orange-300'
                      : spectatedSnake.aiBrain.state === 'COLLECT_FOOD'
                      ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                      : spectatedSnake.aiBrain.state === 'HUNT'
                      ? 'bg-yellow-950/90 border-yellow-500/70 text-yellow-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}>
                    {spectatedSnake.aiBrain.state}
                  </span>
                  {spectatedSnake.isBoosting && (
                    <span className="text-amber-400 font-extrabold animate-pulse">⚡BOOST</span>
                  )}
                </div>
              )}
              <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400 ml-1">
                <span>Score: <strong className="text-slate-200">{spectatedSnake.score}</strong></span>
                <span>•</span>
                <span>Length: <strong className="text-slate-200">{spectatedSnake.segments.length}</strong></span>
                <span>•</span>
                <span>Kills: <strong className="text-amber-300">{spectatedSnake.kills}</strong></span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">No Target Selected</span>
          )}
        </div>

        {/* Center: Switch Snake Cycle Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCyclePrev}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-base transition-all shadow-md"
            title="Previous Snake (Left Arrow or [ )"
          >
            ‹
          </button>

          <button
            onClick={onToggleFreeCam}
            className={`px-3 h-9 rounded-xl border text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
              isFreeCam
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Toggle Free Cam (Key F)"
          >
            {isFreeCam ? '🔒 Lock Follow' : '🕊️ Free Cam'}
          </button>

          <button
            onClick={onCycleNext}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-base transition-all shadow-md"
            title="Next Snake (Right Arrow or ] )"
          >
            ›
          </button>
        </div>

        {/* Right: Zoom Controls & Arena Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom In / Out Bar */}
          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-xl px-1.5 py-1">
            <button
              onClick={onZoomOut}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-all"
              title="Zoom Out (Mouse Wheel Down)"
            >
              −
            </button>
            <button
              onClick={onResetZoom}
              className="px-2 py-0.5 text-[11px] font-mono text-cyan-300 font-bold hover:text-white transition-colors"
              title="Reset Zoom to 100%"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={onZoomIn}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-all"
              title="Zoom In (Mouse Wheel Up)"
            >
              +
            </button>
          </div>

          {/* Join Match Button */}
          <button
            onClick={onJoinArena}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
            title="Spawn into arena now"
          >
            <span>⚔️ Join Arena</span>
          </button>

          {/* Main Menu Button */}
          <button
            onClick={onReturnToMenu}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center text-sm transition-all"
            title="Return to Main Menu"
          >
            🏠
          </button>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="text-[11px] text-slate-400 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
        <span>💡 <strong>Tip:</strong> Click any snake on the Leaderboard to spectate them immediately. Use <strong>Mouse Wheel</strong> to zoom out and view the full arena.</span>
      </div>
    </div>
  );
};

