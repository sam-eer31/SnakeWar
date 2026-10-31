'use client';

import React from 'react';
import { GAME_CONFIG } from '@/game/config/constants';

interface BoostGaugeProps {
  mass: number;
  isBoosting: boolean;
  hasTurbo: boolean;
}

export const BoostGauge: React.FC<BoostGaugeProps> = ({ mass, isBoosting, hasTurbo }) => {
  // Mass available for boosting above minimum
  const minMass = GAME_CONFIG.BOOST_MIN_MASS;
  const maxDisplayMass = 250;
  const ratio = Math.max(0, Math.min(1, (mass - minMass) / (maxDisplayMass - minMass)));
  const percentage = Math.round(ratio * 100);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none pointer-events-none">
      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300">
        <span className={isBoosting ? 'animate-bounce text-orange-400' : 'text-slate-400'}>
          {hasTurbo ? '⚡ TURBO' : '🔥 BOOST'}
        </span>
      </div>

      <div className="w-28 sm:w-36 h-2 sm:h-2.5 bg-black/40 backdrop-blur-[2px] rounded-full border border-white/10 p-0.5 overflow-hidden shadow-lg relative">
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            hasTurbo
              ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : isBoosting
              ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${hasTurbo ? 100 : percentage}%` }}
        />
      </div>
      <span className="hidden sm:inline text-[8px] text-slate-400 font-mono">
        {hasTurbo ? 'Unlimited Speed' : 'Hold Click / Space'}
      </span>
    </div>
  );
};

