'use client';

import React, { useEffect, useState, useRef } from 'react';
import { soundManager } from '@/game/audio/SoundManager';

interface SnakeWarLoaderProps {
  onEnter: () => void;
}

const ASSETS_TO_PRELOAD = [
  '/assets/snakes/emerald/head.png',
  '/assets/snakes/emerald/body.png',
  '/assets/snakes/emerald/tail.png',
  '/assets/snakes/magma/head.png',
  '/assets/snakes/magma/body.png',
  '/assets/snakes/magma/tail.png',
  '/assets/snakes/void/head.png',
  '/assets/snakes/void/body.png',
  '/assets/snakes/void/tail.png',
  '/assets/snakes/gold/head.png',
  '/assets/snakes/gold/body.png',
  '/assets/snakes/gold/tail.png',
  '/assets/snakes/cyber/head.png',
  '/assets/snakes/cyber/body.png',
  '/assets/snakes/cyber/tail.png',
];

export const SnakeWarLoader: React.FC<SnakeWarLoaderProps> = ({ onEnter }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Awakening ancient serpents...');
  const [isReady, setIsReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const realLoadedRef = useRef(0);
  const totalAssets = ASSETS_TO_PRELOAD.length;

  useEffect(() => {
    // 1. Real Asset Preloader
    let loadedCount = 0;
    const handleOneLoaded = () => {
      loadedCount++;
      realLoadedRef.current = loadedCount;
    };

    ASSETS_TO_PRELOAD.forEach((src) => {
      const img = new Image();
      img.onload = handleOneLoaded;
      img.onerror = handleOneLoaded;
      img.src = src;
    });

    // 2. Smooth progress interpolation
    let currentProgress = 0;
    const interval = setInterval(() => {
      const target = Math.min(100, Math.floor((realLoadedRef.current / totalAssets) * 100));
      // Smoothly approach target or minimum progress ramp
      if (currentProgress < target) {
        currentProgress += Math.max(1, Math.floor((target - currentProgress) * 0.25));
      } else if (currentProgress < 100 && realLoadedRef.current === totalAssets) {
        currentProgress += 2;
      }

      if (currentProgress > 100) currentProgress = 100;
      setProgress(currentProgress);

      // Contextual status messages
      if (currentProgress < 25) {
        setStatusText('Awakening ancient serpents...');
      } else if (currentProgress < 50) {
        setStatusText('Forging dragon scale armor...');
      } else if (currentProgress < 75) {
        setStatusText('Heating magma & cosmic void...');
      } else if (currentProgress < 100) {
        setStatusText('Preparing battle arena...');
      } else {
        setStatusText('Arena battle ready!');
        setIsReady(true);
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [totalAssets]);

  const handleEnterClick = async () => {
    // 1. Initialize & unlock sound
    try {
      soundManager.init();
    } catch {}

    // 2. Mobile Fullscreen Request
    try {
      const doc = document.documentElement as any;
      if (doc.requestFullscreen) {
        await doc.requestFullscreen().catch(() => {});
      } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
      } else if (doc.mozRequestFullScreen) {
        doc.mozRequestFullScreen();
      } else if (doc.msRequestFullscreen) {
        doc.msRequestFullscreen();
      }
    } catch {}

    // 3. Mobile Landscape Orientation Lock
    try {
      const orientation = window.screen?.orientation as any;
      if (orientation && orientation.lock) {
        await orientation.lock('landscape').catch(() => {});
      } else if ((window.screen as any)?.lockOrientation) {
        (window.screen as any).lockOrientation('landscape');
      }
    } catch {}

    // 4. Smooth dramatic fade out
    setIsFadingOut(true);
    setTimeout(() => {
      onEnter();
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950 transition-opacity duration-500 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Volumetric Glows */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Dragon Emblem Icon */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-6 flex items-center justify-center">
          {/* Rotating outer runic ring */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-[spin_12s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/40 animate-[spin_20s_linear_infinite_reverse]" />
          {/* Inner glowing core */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-emerald-950/80 to-slate-900/90 border border-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-center">
            {/* Emerald Dragon Head Preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/snakes/emerald/head.png"
              alt="SnakeWar Dragon"
              className="w-20 h-16 sm:w-24 sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>

        {/* Brand Title: SNAKEWAR */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-200 to-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.45)] mb-1">
          SNAKEWAR
        </h1>
        <p className="text-xs sm:text-sm font-bold tracking-[0.25em] text-emerald-400/80 uppercase mb-8">
          Battle Royale Arena
        </p>

        {/* Loader or Enter Button Area */}
        <div className="w-full min-h-[90px] flex flex-col items-center justify-center">
          {!isReady ? (
            <div className="w-full flex flex-col items-center">
              {/* Dragon Scale Progress Bar Frame */}
              <div className="w-full h-4 bg-slate-900/90 rounded-full border border-emerald-500/40 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden relative">
                {/* Progress bar fill with moving dragon scales */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-300 transition-all duration-150 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Subtle shimmer scan line */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                </div>
              </div>

              {/* Status and Percentage Readout */}
              <div className="w-full flex items-center justify-between mt-2.5 px-1 text-xs font-semibold text-slate-400">
                <span className="text-emerald-400 animate-pulse">{statusText}</span>
                <span className="font-mono text-amber-300">{progress}%</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              <button
                onClick={handleEnterClick}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 text-slate-950 font-black text-lg sm:text-xl tracking-wider uppercase shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:shadow-[0_0_45px_rgba(16,185,129,0.85)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-emerald-300/60"
              >
                <span>⚔️</span>
                <span>ENTER ARENA</span>
                <span>⚔️</span>
              </button>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                Tap to Enter &amp; Launch Fullscreen
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer copyright / info */}
      <div className="absolute bottom-4 text-[10px] text-slate-500 tracking-wider">
        SNAKEWAR &bull; 60 FPS SERPENT ARENA
      </div>
    </div>
  );
};

