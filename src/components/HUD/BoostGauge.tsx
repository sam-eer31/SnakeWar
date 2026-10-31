'use client';

import React from 'react';
import { GAME_CONFIG } from '@/game/config/constants';
import { Zap, Flame } from 'lucide-react';

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
    <div className="flex flex-col items-center gap-1 select-none pointer-events-none">
      <div className="flex items-center gap-1.5 text-[10px] font-game font-bold uppercase tracking-wider">
        {hasTurbo ? (
          <span className="flex items-center gap-1 text-amber-400">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            Turbo Active
          </span>
        ) : (
          <span className={`flex items-center gap-1 transition-colors ${isBoosting ? 'text-orange-400' : 'text-[#64748b]'}`}>
            <Flame className={`w-3.5 h-3.5 ${isBoosting ? 'fill-orange-400' : ''}`} />
            Boost
          </span>
        )}
      </div>

      <div className="w-28 sm:w-36 h-2 sm:h-2.5 bg-[#0a0e1a]/95 rounded-full border border-[#1e293b] p-0.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            hasTurbo
              ? 'bg-gradient-to-r from-amber-400 to-red-500'
              : isBoosting
              ? 'bg-gradient-to-r from-orange-500 to-amber-400'
              : 'bg-blue-500'
          }`}
          style={{ width: `${hasTurbo ? 100 : percentage}%` }}
        />
      </div>

      <span className="hidden sm:inline text-[9px] text-[#64748b] font-game uppercase tracking-wider">
        {hasTurbo ? 'Unlimited Speed' : 'Hold Click / Space'}
      </span>
    </div>
  );
};
