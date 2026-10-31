'use client';

import React, { useRef, useEffect } from 'react';
import { SKINS, SnakeSkin } from '@/game/config/skins';
import { ArenaSessionConfig } from '@/game/config/session';
import { drawIllustratedSnakePreview } from '@/game/render/IllustratedSnakeRenderer';

interface StartMenuProps {
  playerName: string;
  selectedSkinId: string;
  highScore: number;
  soundMuted: boolean;
  sessionConfig: ArenaSessionConfig;
  onPlayerNameChange: (name: string) => void;
  onSelectSkin: (skinId: string) => void;
  onToggleSound: () => void;
  onOpenSkins: () => void;
  onOpenSettings: () => void;
  onOpenMatchSetup: () => void;
  onOpenPublicArenas?: () => void;
  onQuickPlay: () => void;
  onSpectate: () => void;
}

// Hand-drawn illustrated snake avatar preview matching the Snakes & Ladders style
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
      t += 0.045;
      drawIllustratedSnakePreview(ctx, skin, canvas.width, canvas.height, t);
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [skin]);

  return <canvas ref={canvasRef} width={220} height={90} className="w-full h-20 block" />;
};

export const StartMenu: React.FC<StartMenuProps> = ({
  playerName,
  selectedSkinId,
  highScore,
  soundMuted,
  sessionConfig,
  onPlayerNameChange,
  onSelectSkin,
  onToggleSound,
  onOpenSkins,
  onOpenSettings,
  onOpenMatchSetup,
  onOpenPublicArenas,
  onQuickPlay,
  onSpectate,
}) => {
  const currentSkinIndex = SKINS.findIndex((s) => s.id === selectedSkinId);
  const activeSkinIndex = currentSkinIndex >= 0 ? currentSkinIndex : 0;
  const currentSkin = SKINS[activeSkinIndex];

  const handlePrevSkin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = (activeSkinIndex - 1 + SKINS.length) % SKINS.length;
    onSelectSkin(SKINS[prev].id);
  };

  const handleNextSkin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (activeSkinIndex + 1) % SKINS.length;
    onSelectSkin(SKINS[next].id);
  };

  const handleRandomName = () => {
    const prefixes = ['Viper', 'Neon', 'Shadow', 'Cosmic', 'Turbo', 'Apex', 'Thunder', 'Ghost', 'Golden'];
    const suffixes = ['Worm', 'Serpent', 'Striker', 'Titan', 'Draco', 'Python', 'Cobra', 'Phantom'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    onPlayerNameChange(`${p}${s}_${num}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 1. TOP NAVBAR: Clean professional layout */}
      <header className="w-full flex items-center justify-between z-10">
        {/* Brand logo pill */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-2xl px-3.5 py-2 shadow-lg backdrop-blur-md">
          <span className="text-xl">🐍</span>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">
              SNAKE.IO
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Arena Arena
            </span>
          </div>
        </div>

        {/* Action icons corner */}
        <div className="flex items-center gap-2">
          {/* High Score Trophy */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 border border-amber-500/40 rounded-2xl px-3.5 py-2 shadow-lg text-xs font-semibold text-amber-300 backdrop-blur-md">
            <span>👑</span>
            <span>Best: {highScore.toLocaleString()}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-sm shadow-lg transition-all backdrop-blur-md ${
              soundMuted
                ? 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-base shadow-lg transition-all backdrop-blur-md"
            title="Game Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* 2. CENTER STAGE: Professional Game Card (Worm.io / Wormate.io style) */}
      <main className="w-full flex justify-center items-center my-auto z-10 py-2">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/70 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center backdrop-blur-md relative overflow-hidden">
          {/* Title Header */}
          <div className="text-center mb-5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
              SLITHER ARENA
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
              Multiplayer Serpent Battle Royale
            </p>
          </div>

          {/* Skin Avatar Pedestal with Quick Arrow Toggles */}
          <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-4 flex flex-col items-center relative">
            <div className="w-full flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Skin Preview ({activeSkinIndex + 1}/{SKINS.length})
              </span>
              <button
                onClick={onOpenSkins}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <span>🎨 Wardrobe</span>
              </button>
            </div>

            {/* Slithering Canvas with Previous/Next Arrows */}
            <div className="w-full relative flex items-center">
              <button
                onClick={handlePrevSkin}
                className="absolute left-1 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition-all shadow-md active:scale-90"
                title="Previous Skin"
              >
                ‹
              </button>

              <div
                onClick={onOpenSkins}
                className="w-full cursor-pointer hover:opacity-95 transition-opacity"
              >
                <SnakeAvatarPreview skin={currentSkin} />
              </div>

              <button
                onClick={handleNextSkin}
                className="absolute right-1 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition-all shadow-md active:scale-90"
                title="Next Skin"
              >
                ›
              </button>
            </div>

            <div className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1.5">
              <span>{currentSkin.name}</span>
              {currentSkin.accessory && currentSkin.accessory !== 'none' && (
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                  {currentSkin.accessory}
                </span>
              )}
            </div>
          </div>

          {/* Nickname Input Box */}
          <div className="w-full mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={16}
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value)}
                placeholder="Enter Nickname..."
                className="flex-1 bg-slate-950/80 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 font-bold placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all text-sm"
              />
              <button
                onClick={handleRandomName}
                title="Generate Random Nickname"
                className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700 hover:bg-slate-700 flex items-center justify-center text-lg transition-colors shadow-md active:scale-95"
              >
                🎲
              </button>
            </div>
          </div>

          {/* Active Server / Session Rules Summary Card */}
          <div
            onClick={onOpenMatchSetup}
            className="w-full bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl px-3.5 py-2.5 mb-5 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="text-base">🌐</span>
              <div className="text-left">
                <div className="font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Server Rules: {sessionConfig.selfCollision ? 'Hardcore (Lethal Tail)' : 'Standard (Self-Crossing Safe)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {sessionConfig.botCount} Bots ({sessionConfig.botDifficulty === 'easy' ? 'Easy Tier' : sessionConfig.botDifficulty === 'hard' ? 'Apex Mixed' : 'Standard Mix'}) • {sessionConfig.enablePowerUps ? 'Powerups ON' : 'No Powerups'}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
              Edit ⚙️
            </span>
          </div>

          {/* Big Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Primary: Dedicated Public Arenas (Online Servers) */}
            <button
              onClick={onOpenPublicArenas}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_22px_rgba(52,211,153,0.35)] hover:shadow-[0_0_32px_rgba(52,211,153,0.55)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 group"
            >
              <span>🌐 PUBLIC ARENAS</span>
              <span className="bg-slate-950/80 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                2 ONLINE
              </span>
            </button>

            {/* Create Custom Match / Configure Session */}
            <button
              onClick={onOpenMatchSetup}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 group"
            >
              <span>CUSTOM MATCH & RULES</span>
              <span className="group-hover:translate-x-1 transition-transform">⚙️</span>
            </button>

            {/* Quick Play with current session rules */}
            <button
              onClick={onQuickPlay}
              className="w-full py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 font-bold text-slate-300 hover:text-white text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚡ Quick Join Arena (Direct Start)</span>
            </button>

            {/* Spectate Match Mode with Quick Rules Gear */}
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={onSpectate}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 font-bold text-indigo-300 hover:text-white text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
              >
                <span>👁️ Spectate Match (Watch Bots & Free Cam)</span>
              </button>
              <button
                onClick={onOpenMatchSetup}
                className="px-3 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 font-bold text-slate-300 hover:text-white text-xs transition-all shadow-md active:scale-95 flex items-center gap-1"
                title="Configure Arena Rules Before Spectating"
              >
                <span>⚙️ Rules</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER: Controls guide & credits */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 z-10">
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-md">
          <span>💡</span>
          <span><strong className="text-slate-300">Mouse</strong> to steer • <strong className="text-slate-300">Left Click / Space</strong> to Boost</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>🟢 100% Offline Static</span>
          <span>•</span>
          <span>⚡ Sub-millisecond Spatial Hashing</span>
        </div>
      </footer>
    </div>
  );
};
