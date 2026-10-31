'use client';

import React, { useRef, useEffect } from 'react';
import { SKINS, SnakeSkin } from '@/game/config/skins';
import { ArenaSessionConfig } from '@/game/config/session';
import { drawIllustratedSnakePreview } from '@/game/render/IllustratedSnakeRenderer';
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Settings,
  Shuffle,
  Globe,
  Users,
} from 'lucide-react';

interface StartMenuProps {
  playerName: string;
  selectedSkinId: string;
  highScore?: number;
  soundMuted: boolean;
  sessionConfig?: ArenaSessionConfig;
  onPlayerNameChange: (name: string) => void;
  onSelectSkin: (skinId: string) => void;
  onToggleSound: () => void;
  onOpenSkins: () => void;
  onOpenSettings: () => void;
  onOpenMatchSetup: () => void;
  onOpenPublicArenas?: () => void;
  onQuickPlay?: () => void;
  onSpectate?: () => void;
}

// Illustrated 3D slithering dragon preview
const SnakeAvatarPreview: React.FC<{ skin: SnakeSkin }> = ({ skin }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = 320;
    const cssH = 95;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawIllustratedSnakePreview(ctx, skin, cssW, cssH, t);
      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[190px] sm:w-[250px] md:w-[300px] h-[55px] sm:h-[70px] md:h-[85px] block cursor-pointer object-contain"
    />
  );
};

export const StartMenu: React.FC<StartMenuProps> = ({
  playerName,
  selectedSkinId,
  soundMuted,
  onPlayerNameChange,
  onSelectSkin,
  onToggleSound,
  onOpenSkins,
  onOpenSettings,
  onOpenMatchSetup,
  onOpenPublicArenas,
}) => {
  const currentSkinIndex = SKINS.findIndex((s) => s.id === selectedSkinId);
  const activeSkinIndex = currentSkinIndex >= 0 ? currentSkinIndex : 0;
  const currentSkin = SKINS[activeSkinIndex];

  const handlePrevSkin = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prev = (activeSkinIndex - 1 + SKINS.length) % SKINS.length;
    onSelectSkin(SKINS[prev].id);
  };

  const handleNextSkin = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = (activeSkinIndex + 1) % SKINS.length;
    onSelectSkin(SKINS[next].id);
  };

  const handleRandomName = () => {
    const prefixes = ['Cosmic', 'Magma', 'Emerald', 'Void', 'Shadow', 'Turbo', 'Apex', 'Thunder', 'Ghost', 'Golden'];
    const suffixes = ['Draco', 'Serpent', 'Titan', 'Python', 'Striker', 'Cobra', 'Phantom', 'Dragon'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    onPlayerNameChange(`${p}${s}_${num}`);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0e1a] select-none overflow-hidden flex flex-col justify-between p-2.5 sm:p-5 lg:p-6">
      {/* 1. TOP BAR: Title at top-left, Audio & Settings at top-right */}
      <header className="w-full flex items-center justify-between z-10 max-w-4xl mx-auto shrink-0">
        {/* Brand: SNAKE in white, W A R each a different color */}
        <div className="flex items-center font-game font-bold tracking-[0.2em] sm:tracking-[0.22em] text-lg sm:text-2xl select-none uppercase">
          <span className="text-white">SNAKE</span>
          <span className="text-[#3b82f6]">W</span>
          <span className="text-[#10b981]">A</span>
          <span className="text-[#f59e0b]">R</span>
        </div>

        {/* Top Right: Sound & Settings Icons */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              soundMuted ? 'text-red-400' : 'text-slate-200'
            }`}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Game Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. CENTER STAGE: Serpent Showcase, Name Input, Action Buttons */}
      <main className="w-full max-w-md sm:max-w-xl mx-auto flex flex-col items-center justify-center my-auto z-10 gap-1.5 sm:gap-3 py-1">
        {/* Serpent Showcase Area */}
        <div className="relative w-full flex flex-col items-center justify-center">
          {/* Snake Avatar Canvas with Left & Right Arrows */}
          <div className="relative flex items-center justify-center w-full z-10">
            {/* Previous Chevron Button */}
            <button
              onClick={handlePrevSkin}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition-all flex-shrink-0 z-20 cursor-pointer"
              title="Previous Skin"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Live Slithering 3D Dragon */}
            <div
              onClick={onOpenSkins}
              className="mx-1 sm:mx-2 transition-transform hover:scale-[1.03] cursor-pointer"
              title="Click to view wardrobe"
            >
              <SnakeAvatarPreview skin={currentSkin} />
            </div>

            {/* Next Chevron Button */}
            <button
              onClick={handleNextSkin}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition-all flex-shrink-0 z-20 cursor-pointer"
              title="Next Skin"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Skin Name */}
          <div className="text-[11px] sm:text-xs font-game font-bold text-slate-200 tracking-wide mt-0.5 sm:mt-1 z-10 uppercase">
            {currentSkin.name}
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5 z-10">
            {SKINS.map((s, idx) => {
              const isActive = idx === activeSkinIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSkin(s.id)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    isActive
                      ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 scale-110'
                      : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={s.name}
                />
              );
            })}
          </div>
        </div>

        {/* Player Name Input Row */}
        <div className="w-full max-w-md flex items-center gap-2 mt-0.5 sm:mt-1">
          <div className="flex-1 h-9 sm:h-11 rounded-xl bg-[#111827] border border-[#1e293b] focus-within:border-blue-500 px-3 sm:px-4 flex items-center gap-2.5 transition-colors">
            <input
              type="text"
              maxLength={16}
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="Enter Nickname..."
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none tracking-wide"
            />
          </div>

          {/* Random Name Button */}
          <button
            onClick={handleRandomName}
            title="Random Nickname"
            className="w-9 h-9 sm:h-11 sm:w-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons: Always side-by-side with responsive height */}
        <div className="w-full max-w-md flex flex-row gap-2 sm:gap-3 mt-0.5 sm:mt-1">
          {/* ARENA BROWSER Button */}
          <button
            onClick={onOpenPublicArenas}
            className="flex-1 h-10 sm:h-12 md:h-13 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-[11px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 flex items-center justify-between active:scale-[0.97] transition-all duration-150 cursor-pointer group shadow-lg shadow-emerald-950/40"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100 shrink-0" />
              <span>ARENA BROWSER</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* HOST MATCH Button */}
          <button
            onClick={onOpenMatchSetup}
            className="flex-1 h-10 sm:h-12 md:h-13 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-game font-bold text-[11px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 flex items-center justify-between active:scale-[0.97] transition-all duration-150 cursor-pointer group shadow-lg shadow-blue-950/40"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-100 shrink-0" />
              <span>HOST MATCH</span>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>
      </main>

      {/* 3. FOOTER: Lines + Subtitle on Left & Right (Ultra-compact / Responsive) */}
      <footer className="w-full flex items-center justify-between text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-500 font-semibold select-none pt-1 max-w-4xl mx-auto z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-4 sm:w-8 h-px bg-slate-700" />
          <span>SLITHER &bull; BATTLE &bull; DOMINATE</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 sm:w-8 h-px bg-slate-700" />
          <span>SNAKEWAR</span>
        </div>
      </footer>
    </div>
  );
};
