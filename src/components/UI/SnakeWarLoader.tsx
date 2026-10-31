'use client';

import React, { useEffect, useState, useRef } from 'react';
import { soundManager } from '@/game/audio/SoundManager';
import { Swords, ChevronRight } from 'lucide-react';

interface SnakeWarLoaderProps {
  onEnter: () => void;
}

const ASSETS_TO_PRELOAD = [
  '/assets/snakes/emerald/head.webp',
  '/assets/snakes/emerald/body.webp',
  '/assets/snakes/emerald/tail.webp',
  '/assets/snakes/magma/head.webp',
  '/assets/snakes/magma/body.webp',
  '/assets/snakes/magma/tail.webp',
  '/assets/snakes/void/head.webp',
  '/assets/snakes/void/body.webp',
  '/assets/snakes/void/tail.webp',
  '/assets/snakes/gold/head.webp',
  '/assets/snakes/gold/body.webp',
  '/assets/snakes/gold/tail.webp',
  '/assets/snakes/cyber/head.webp',
  '/assets/snakes/cyber/body.webp',
  '/assets/snakes/cyber/tail.webp',
  '/assets/powerups/magnet.webp',
  '/assets/powerups/multiplier.webp',
  '/assets/powerups/turbo.webp',
  '/assets/powerups/ghost.webp',
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
        setStatusText('Forging serpent scales...');
      } else if (currentProgress < 75) {
        setStatusText('Synchronizing battle arena...');
      } else if (currentProgress < 100) {
        setStatusText('Finalizing game engine...');
      } else {
        setStatusText('Arena battle ready');
        setIsReady(true);
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [totalAssets]);

  const handleEnterClick = async () => {
    // 1. Initialize & unlock sound
    try {
      soundManager.init();
    } catch { }

    // 2. Mobile Fullscreen Request
    try {
      const doc = document.documentElement as any;
      if (doc.requestFullscreen) {
        await doc.requestFullscreen().catch(() => { });
      } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
      } else if (doc.mozRequestFullScreen) {
        doc.mozRequestFullScreen();
      } else if (doc.msRequestFullscreen) {
        doc.msRequestFullscreen();
      }
    } catch { }

    // 3. Mobile Landscape Orientation Lock
    try {
      const orientation = window.screen?.orientation as any;
      if (orientation && orientation.lock) {
        await orientation.lock('landscape').catch(() => { });
      } else if ((window.screen as any)?.lockOrientation) {
        (window.screen as any).lockOrientation('landscape');
      }
    } catch { }

    // 4. Smooth fade out
    setIsFadingOut(true);
    setTimeout(() => {
      onEnter();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#0a0e1a] transition-opacity duration-400 select-none ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
    >
      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Dragon Emblem Icon */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-6 flex items-center justify-center">
          {/* Outer clean rotating accent ring */}
          <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-dashed border-[#1e293b]" />
          {/* Inner core */}
          <div className="absolute inset-3 rounded-full bg-[#111827] border border-[#1e293b] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/snakes/emerald/head.webp"
              alt="SnakeWar Dragon"
              className="w-16 h-14 sm:w-18 sm:h-16 object-contain"
            />
          </div>
        </div>

        {/* Brand Title: SNAKEWAR */}
        <div className="flex items-center font-game font-bold tracking-[0.25em] text-3xl sm:text-4xl select-none uppercase mb-1">
          <span className="text-white">SNAKE</span>
          <span className="text-[#3b82f6]">W</span>
          <span className="text-[#10b981]">A</span>
          <span className="text-[#f59e0b]">R</span>
        </div>
        <p className="text-[11px] font-game font-semibold tracking-[0.3em] text-[#64748b] uppercase mb-8">
          Competitive Serpent Arena
        </p>

        {/* Loader or Enter Button Area */}
        <div className="w-full min-h-[80px] flex flex-col items-center justify-center">
          {!isReady ? (
            <div className="w-full flex flex-col items-center">
              {/* Progress Bar Frame */}
              <div className="w-full h-2.5 bg-[#111827] rounded-full border border-[#1e293b] p-0.5 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status and Percentage Readout */}
              <div className="w-full flex items-center justify-between mt-3 px-1 text-xs font-game">
                <span className="text-[#94a3b8] uppercase tracking-wider">{statusText}</span>
                <span className="text-blue-400 font-bold tabular-nums">{progress}%</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center animate-fade-in-scale">
              <button
                onClick={handleEnterClick}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-game font-bold text-base tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
              >
                <Swords className="w-5 h-5" />
                <span>Enter Arena</span>
                <ChevronRight className="w-5 h-5 ml-auto" />
              </button>
              <span className="text-[11px] text-[#64748b] mt-2 font-game uppercase tracking-wider">
                Click to launch game
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="absolute bottom-4 text-[10px] text-[#64748b] font-game uppercase tracking-[0.2em]">
        SnakeWar &bull; 60 FPS Serpent Arena
      </div>
    </div>
  );
};
