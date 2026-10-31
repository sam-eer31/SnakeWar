'use client';

import React, { useRef, useEffect } from 'react';
import { SKINS, SnakeSkin } from '@/game/config/skins';
import { ArenaSessionConfig } from '@/game/config/session';
import { drawIllustratedSnakePreview } from '@/game/render/IllustratedSnakeRenderer';

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

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      drawIllustratedSnakePreview(ctx, skin, canvas.width, canvas.height, t);
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={110}
      className="w-[260px] sm:w-[320px] h-[85px] sm:h-[105px] block drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)] cursor-pointer"
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
    <div className="fixed inset-0 z-40 bg-[#07090e] select-none overflow-hidden flex flex-col justify-between p-4 sm:p-7">
      {/* 1. TOP BAR: Title at top-left, Audio & Settings at top-right */}
      <header className="w-full flex items-center justify-between z-10 max-w-4xl mx-auto">
        {/* Brand: SNAKE in white, WAR in yellow-green-cyan */}
        <div className="flex items-center font-black tracking-[0.22em] text-xl sm:text-2xl select-none">
          <span className="text-white">SNAKE</span>
          <span className="text-[#a3e635]">W</span>
          <span className="text-[#34d399]">A</span>
          <span className="text-[#38bdf8]">R</span>
        </div>

        {/* Top Right: Sound & Settings Icons */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle (Speaker with red slash when muted) */}
          <button
            onClick={onToggleSound}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0e1320]/90 border border-white/10 hover:border-white/25 flex items-center justify-center text-sm shadow transition-all active:scale-95 cursor-pointer ${
              soundMuted ? 'text-rose-400' : 'text-slate-200'
            }`}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? (
              <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0e1320]/90 border border-white/10 hover:border-white/25 text-slate-200 hover:text-white flex items-center justify-center text-sm shadow transition-all active:scale-95 cursor-pointer"
            title="Game Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. CENTER STAGE: Serpent Showcase, Name Input, Public & Custom Action Buttons */}
      <main className="w-full max-w-md sm:max-w-xl mx-auto flex flex-col items-center justify-center my-auto z-10 gap-3 sm:gap-4">
        {/* Serpent Showcase Area */}
        <div className="relative w-full flex flex-col items-center justify-center">
          {/* Snake Avatar Canvas with Left & Right Arrows */}
          <div className="relative flex items-center justify-center w-full z-10">
            {/* Previous Chevron Button */}
            <button
              onClick={handlePrevSkin}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0c1220]/95 border border-white/15 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] text-slate-200 hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all flex-shrink-0 z-20 cursor-pointer"
              title="Previous Skin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Live Slithering 3D Dragon */}
            <div
              onClick={onOpenSkins}
              className="mx-1 sm:mx-3 transition-transform hover:scale-[1.03] cursor-pointer"
              title="Click to view wardrobe"
            >
              <SnakeAvatarPreview skin={currentSkin} />
            </div>

            {/* Next Chevron Button */}
            <button
              onClick={handleNextSkin}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0c1220]/95 border border-white/15 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] text-slate-200 hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all flex-shrink-0 z-20 cursor-pointer"
              title="Next Skin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Skin Name */}
          <div className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide mt-1 z-10 drop-shadow-sm">
            {currentSkin.name}
          </div>

          {/* Pagination Dots (5 skins) */}
          <div className="flex items-center gap-2 mt-2 z-10">
            {SKINS.map((s, idx) => {
              const isActive = idx === activeSkinIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSkin(s.id)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    isActive
                      ? 'w-2.5 h-2.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.95)] scale-110'
                      : 'w-2 h-2 bg-slate-700/60 hover:bg-slate-400'
                  }`}
                  title={s.name}
                />
              );
            })}
          </div>
        </div>

        {/* Player Name Input Row */}
        <div className="w-full max-w-md flex items-center gap-2.5 mt-1 sm:mt-2">
          <div className="flex-1 h-12 rounded-2xl bg-[#0a0e18] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/60 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.25)] px-4 flex items-center gap-3 transition-all shadow-inner">
            {/* User silhouette icon */}
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              maxLength={16}
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="Enter Nickname..."
              className="w-full bg-transparent text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none tracking-wide"
            />
          </div>

          {/* Random Dice Button */}
          <button
            onClick={handleRandomName}
            title="Random Nickname"
            className="w-12 h-12 rounded-2xl bg-[#0a0e18] border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(56,189,248,0.25)] flex items-center justify-center text-slate-200 hover:text-white transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </button>
        </div>

        {/* Action Buttons: Stacked on mobile portrait, side-by-side on PC */}
        <div className="w-full max-w-md flex flex-col sm:flex-row gap-3 sm:gap-4 mt-1">
          {/* PUBLIC Button: Arcade Neon Green */}
          <button
            onClick={onOpenPublicArenas}
            className="relative flex-1 h-14 rounded-2xl bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] text-white font-black text-sm uppercase tracking-[0.2em] px-5 flex items-center justify-between border-t border-emerald-300/70 border-b border-emerald-950 border-x border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.55),0_10px_25px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.85),0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 cursor-pointer group overflow-hidden"
          >
            {/* Top Gloss Reflection */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-2xl" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-300/30 flex items-center justify-center shadow-inner">
                <svg className="w-4.5 h-4.5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeWidth={2} d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <span className="font-black text-sm tracking-[0.2em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                PUBLIC
              </span>
            </div>

            <div className="relative z-10 w-7 h-7 rounded-full bg-[#023b29]/90 border border-emerald-300/40 shadow-inner flex items-center justify-center text-white text-xs font-black group-hover:translate-x-0.5 transition-transform">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* CUSTOM Button: Arcade Neon Cyan */}
          <button
            onClick={onOpenMatchSetup}
            className="relative flex-1 h-14 rounded-2xl bg-gradient-to-b from-[#0284c7] via-[#0369a1] to-[#075985] text-white font-black text-sm uppercase tracking-[0.2em] px-5 flex items-center justify-between border-t border-sky-300/70 border-b border-sky-950 border-x border-sky-500/40 shadow-[0_0_35px_rgba(14,165,233,0.55),0_10px_25px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(14,165,233,0.85),0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 cursor-pointer group overflow-hidden"
          >
            {/* Top Gloss Reflection */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-2xl" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-950/40 border border-sky-300/30 flex items-center justify-center shadow-inner">
                <svg className="w-4.5 h-4.5 text-sky-100" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <span className="font-black text-sm tracking-[0.2em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                CUSTOM
              </span>
            </div>

            <div className="relative z-10 w-7 h-7 rounded-full bg-[#032e47]/90 border border-sky-300/40 shadow-inner flex items-center justify-center text-white text-xs font-black group-hover:translate-x-0.5 transition-transform">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </main>

      {/* 3. FOOTER: Lines + Subtitle on Left & Right */}
      <footer className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold select-none pt-2 max-w-4xl mx-auto z-10">
        <div className="flex items-center gap-2">
          <span className="w-5 sm:w-8 h-[1px] bg-slate-700/80" />
          <span>SLITHER &bull; BATTLE &bull; DOMINATE</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-5 sm:w-8 h-[1px] bg-slate-700/80" />
          <span>SNAKEWAR</span>
        </div>
      </footer>
    </div>
  );
};
