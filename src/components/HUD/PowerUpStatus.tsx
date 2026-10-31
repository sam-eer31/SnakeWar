'use client';

import React from 'react';
import { PowerUpType, POWERUP_CONFIGS } from '@/game/entities/PowerUp';
import { Magnet, Zap, Ghost, Sparkles } from 'lucide-react';

interface PowerUpItemProps {
  type: PowerUpType;
  remainingMs: number;
}

const getPowerUpIcon = (type: PowerUpType) => {
  const cfg = POWERUP_CONFIGS[type];
  if (cfg?.imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cfg.imageSrc}
        alt={cfg.label}
        className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]"
      />
    );
  }
  switch (type) {
    case 'magnet':
      return <Magnet className="w-4 h-4 text-sky-400" />;
    case 'turbo':
      return <Zap className="w-4 h-4 text-red-400" />;
    case 'multiplier':
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'multiplier_5x':
      return <Sparkles className="w-4 h-4 text-pink-400" />;
    case 'growth':
      return <Sparkles className="w-4 h-4 text-emerald-400" />;
    case 'ghost':
      return <Ghost className="w-4 h-4 text-purple-400" />;
  }
};

export const PowerUpStatus: React.FC<{ items: PowerUpItemProps[] }> = ({ items }) => {
  if (items.length === 0) return null;

  const has2x = items.some((i) => i.type === 'multiplier');
  const has5x = items.some((i) => i.type === 'multiplier_5x');
  const isCombo10x = has2x && has5x;

  return (
    <div className="flex flex-col gap-1.5 select-none pointer-events-none">
      {isCombo10x && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500/25 via-pink-500/25 to-purple-500/25 border border-amber-400/60 rounded-xl px-3 py-1 shadow-[0_0_14px_rgba(245,158,11,0.35)] animate-pulse">
          <span className="text-[10px] font-game font-black tracking-wider text-amber-300">
            ⚡ 10x ULTRA MULTIPLIER!
          </span>
        </div>
      )}
      {items.map((item) => {
        const cfg = POWERUP_CONFIGS[item.type];
        if (!cfg) return null;
        const remainingSec = (item.remainingMs / 1000).toFixed(1);
        const duration = cfg.duration > 0 ? cfg.duration : 1;
        const percent = Math.min(100, Math.max(0, (item.remainingMs / duration) * 100));

        return (
          <div
            key={item.type}
            className="flex items-center gap-2.5 bg-[#0a0e1a]/90 backdrop-blur-md border border-[#1e293b] rounded-xl px-3 py-1.5 min-w-[136px]"
          >
            <div className="flex-shrink-0">
              {getPowerUpIcon(item.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-game font-bold uppercase tracking-wider">
                <span style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-[#94a3b8] tabular-nums font-mono">{remainingSec}s</span>
              </div>
              <div className="w-full h-1.5 bg-[#111827] rounded-full mt-1 overflow-hidden border border-[#1e293b]/50">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: cfg.color,
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
