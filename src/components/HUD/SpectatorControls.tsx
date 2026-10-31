'use client';

import React from 'react';
import { Snake } from '@/game/entities/Snake';
import {
  Eye,
  Camera,
  Lock,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Swords,
  Home,
  Info,
  Zap,
} from 'lucide-react';

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
  let nameColor = 'text-blue-400';
  if (spectatedSnake) {
    if (spectatedSnake.tier === 'easy') {
      nameColor = 'text-emerald-400';
      tierBadge = (
        <span className="text-[10px] font-game font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          Easy Bot
        </span>
      );
    } else if (spectatedSnake.tier === 'medium') {
      nameColor = 'text-amber-400';
      tierBadge = (
        <span className="text-[10px] font-game font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400">
          Medium Bot
        </span>
      );
    } else if (spectatedSnake.tier === 'hard') {
      nameColor = 'text-red-400';
      tierBadge = (
        <span className="text-[10px] font-game font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400">
          Apex Bot
        </span>
      );
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 pointer-events-none flex flex-col items-center gap-2.5 px-4">
      {/* Top Floating Spectator Status & Controls */}
      <div className="pointer-events-auto bg-[#0a0e1a]/95 border border-[#1e293b] rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 max-w-4xl w-full">
        {/* Left: Mode Badge & Target Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/40 px-2.5 py-1 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-game font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Spectating
            </span>
          </div>

          {isFreeCam ? (
            <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-game font-bold">Free Camera</span>
              <span className="text-[11px] text-[#64748b] hidden sm:inline">
                (Click + drag canvas or WASD to pan)
              </span>
            </div>
          ) : spectatedSnake ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-game font-bold ${nameColor} max-w-[130px] sm:max-w-[170px] truncate`}>
                {spectatedSnake.name}
              </span>
              {tierBadge}
              {spectatedSnake.aiBrain && (
                <div className="flex items-center gap-1 text-[10px] font-game font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-[#111827] border border-[#1e293b] text-[#94a3b8]">
                    {spectatedSnake.aiBrain.personality?.archetype || 'AI'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border ${
                    spectatedSnake.aiBrain.state === 'INTERCEPT'
                      ? 'bg-red-950/80 border-red-600/50 text-red-300'
                      : spectatedSnake.aiBrain.state === 'CIRCLE'
                      ? 'bg-purple-950/80 border-purple-600/50 text-purple-300'
                      : spectatedSnake.aiBrain.state === 'SURVIVE' || spectatedSnake.aiBrain.state === 'ESCAPE'
                      ? 'bg-red-950/80 border-red-600/50 text-red-300'
                      : spectatedSnake.aiBrain.state === 'EVADE'
                      ? 'bg-orange-950/80 border-orange-600/50 text-orange-300'
                      : spectatedSnake.aiBrain.state === 'COLLECT_FOOD'
                      ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                      : spectatedSnake.aiBrain.state === 'HUNT'
                      ? 'bg-yellow-950/80 border-yellow-600/50 text-yellow-300'
                      : 'bg-[#111827] border-[#1e293b] text-[#94a3b8]'
                  }`}>
                    {spectatedSnake.aiBrain.state}
                  </span>
                  {spectatedSnake.isBoosting && (
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <Zap className="w-3 h-3 fill-amber-400" />
                      Boost
                    </span>
                  )}
                </div>
              )}
              <div className="hidden md:flex items-center gap-2 text-[11px] font-game text-[#64748b] ml-1">
                <span>Score: <strong className="text-[#f1f5f9]">{spectatedSnake.score}</strong></span>
                <span>•</span>
                <span>Length: <strong className="text-[#f1f5f9]">{spectatedSnake.segments.length}</strong></span>
                <span>•</span>
                <span>Kills: <strong className="text-amber-400">{spectatedSnake.kills}</strong></span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-[#64748b] italic">No Target Selected</span>
          )}
        </div>

        {/* Center: Switch Snake Cycle Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCyclePrev}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-[#f1f5f9] border border-[#1e293b] flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Snake (Left Arrow or [ )"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFreeCam}
            className={`px-3 h-8 rounded-lg border text-xs font-game font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              isFreeCam
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
            title="Toggle Free Cam (Key F)"
          >
            {isFreeCam ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Follow
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Free Cam
              </>
            )}
          </button>

          <button
            onClick={onCycleNext}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-[#f1f5f9] border border-[#1e293b] flex items-center justify-center transition-colors cursor-pointer"
            title="Next Snake (Right Arrow or ] )"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom Controls & Arena Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom In / Out Bar */}
          <div className="flex items-center gap-1 bg-[#111827] border border-[#1e293b] rounded-lg px-1.5 py-1">
            <button
              onClick={onZoomOut}
              className="w-6 h-6 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[#94a3b8] hover:text-[#f1f5f9] flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom Out (Mouse Wheel Down)"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-2 py-0.5 text-[11px] font-game text-blue-400 font-bold hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={onZoomIn}
              className="w-6 h-6 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[#94a3b8] hover:text-[#f1f5f9] flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom In (Mouse Wheel Up)"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Join Match Button */}
          <button
            onClick={onJoinArena}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-game font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            title="Spawn into arena now"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Join Arena</span>
          </button>

          {/* Main Menu Button */}
          <button
            onClick={onReturnToMenu}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-[#94a3b8] hover:text-[#f1f5f9] border border-[#1e293b] flex items-center justify-center transition-colors cursor-pointer"
            title="Return to Main Menu"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="text-[11px] text-[#64748b] bg-[#0a0e1a]/95 border border-[#1e293b] px-3.5 py-1 rounded-full flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span>Click any snake on the Leaderboard to spectate them. Use <strong>Mouse Wheel</strong> to zoom.</span>
      </div>
    </div>
  );
};
