'use client';

import React from 'react';
import { Swords, X, Radio } from 'lucide-react';

interface MatchConnectingOverlayProps {
  title: string;
  subtitle: string;
  roomCode?: string;
  onCancel?: () => void;
}

export const MatchConnectingOverlay: React.FC<MatchConnectingOverlayProps> = ({
  title,
  subtitle,
  roomCode,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Animated Cyber Glowing Ring */}
        <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
          {/* Outer Pulsing Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />

          {/* Rotating Spinner Ring */}
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-400 border-r-emerald-400 animate-spin" />

          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Swords className="w-7 h-7 text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-game font-bold tracking-wider text-white uppercase mb-1">
          {title}
        </h3>

        {/* Room Code Badge */}
        {roomCode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-700/50 text-blue-300 font-mono font-bold text-xs tracking-widest my-2 uppercase shadow-inner">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>ROOM: {roomCode}</span>
          </div>
        )}

        {/* Subtitle / Status */}
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs mt-1 mb-6 leading-relaxed">
          {subtitle}
        </p>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-game font-semibold text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};

