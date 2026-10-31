'use client';

import React, { useRef, useState } from 'react';
import { Zap } from 'lucide-react';

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
        className="w-28 h-28 rounded-full bg-[#0a0e1a]/80 backdrop-blur-md border border-[#1e293b] flex items-center justify-center relative pointer-events-auto touch-none"
      >
        <div
          className="w-12 h-12 rounded-full bg-blue-600/80 border border-blue-400/50 transition-transform duration-75"
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
        className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-game font-bold text-xs uppercase tracking-wider transition-all pointer-events-auto active:scale-95 ${
          isBoosting
            ? 'bg-amber-600 border-2 border-amber-400 text-white'
            : 'bg-[#0a0e1a]/90 backdrop-blur-md border border-[#1e293b] text-amber-400'
        }`}
      >
        <Zap className="w-6 h-6 mb-0.5" />
        <span>Boost</span>
      </button>
    </div>
  );
};
