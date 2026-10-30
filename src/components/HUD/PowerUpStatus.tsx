'use client';

import React from 'react';
import { PowerUpType, POWERUP_CONFIGS } from '@/game/entities/PowerUp';

interface PowerUpItemProps {
  type: PowerUpType;
  remainingMs: number;
}

export const PowerUpStatus: React.FC<{ items: PowerUpItemProps[] }> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 select-none pointer-events-none">
      {items.map((item) => {
        const cfg = POWERUP_CONFIGS[item.type];
        const remainingSec = (item.remainingMs / 1000).toFixed(1);
        const percent = Math.min(100, Math.max(0, (item.remainingMs / cfg.duration) * 100));

        return (
          <div
            key={item.type}
            className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-xl min-w-[130px]"
          >
            <span className="text-base">{cfg.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-slate-300 font-mono">{remainingSec}s</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: cfg.color,
                    boxShadow: `0 0 6px ${cfg.color}`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

