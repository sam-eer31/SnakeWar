'use client';

import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (angle: number) => void;
  onBoostChange: (boosting: boolean) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onBoostChange }) => {
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setTouchPos(null);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const angle = Math.atan2(dy, dx);
    onMove(angle);

    const maxRadius = rect.width / 2;
    const dist = Math.min(maxRadius, Math.hypot(dx, dy));
    setTouchPos({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    });
  };

  const handleBoostStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsBoosting(true);
    onBoostChange(true);
  };

  const handleBoostEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsBoosting(false);
    onBoostChange(false);
  };

  return (
    <div className="md:hidden fixed inset-x-0 bottom-6 px-8 flex justify-between items-end pointer-events-none select-none z-30">
      {/* Joystick Base */}
      <div
        ref={baseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-28 h-28 rounded-full bg-slate-900/50 backdrop-blur-md border-2 border-slate-700/60 flex items-center justify-center relative pointer-events-auto touch-none shadow-2xl"
      >
        <div
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.7)] transition-transform duration-75"
          style={{
            transform: touchPos
              ? `translate(${touchPos.x}px, ${touchPos.y}px)`
              : 'translate(0px, 0px)',
          }}
        />
      </div>

      {/* Boost Action Button */}
      <button
        onTouchStart={handleBoostStart}
        onTouchEnd={handleBoostEnd}
        onMouseDown={handleBoostStart}
        onMouseUp={handleBoostEnd}
        className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold text-xs uppercase tracking-wider transition-all pointer-events-auto shadow-2xl ${
          isBoosting
            ? 'bg-gradient-to-tr from-orange-600 to-amber-500 scale-95 shadow-[0_0_20px_rgba(245,158,11,0.9)] text-white'
            : 'bg-slate-900/80 backdrop-blur-md border-2 border-orange-500/60 text-orange-400 shadow-lg'
        }`}
      >
        <span className="text-xl">⚡</span>
        <span>Boost</span>
      </button>
    </div>
  );
};

