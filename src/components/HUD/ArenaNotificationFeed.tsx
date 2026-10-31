'use client';

import React from 'react';
import { UserPlus, UserMinus, Info } from 'lucide-react';

export interface ArenaNotification {
  id: string;
  type: 'join' | 'leave' | 'info';
  playerName?: string;
  message: string;
  timestamp: number;
}

interface ArenaNotificationFeedProps {
  notifications: ArenaNotification[];
}

export const ArenaNotificationFeed: React.FC<ArenaNotificationFeedProps> = ({
  notifications,
}) => {
  if (!notifications || notifications.length === 0) return null;

  // Show up to the 3 most recent notifications
  const recent = notifications.slice(-3);

  return (
    <div className="flex flex-col items-end gap-1.5 pointer-events-none select-none max-w-[260px] sm:max-w-[320px]">
      {recent.map((n) => {
        let badgeIcon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
        let borderColor = 'border-blue-500/30';

        if (n.type === 'join') {
          badgeIcon = <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
          borderColor = 'border-emerald-500/40';
        } else if (n.type === 'leave') {
          badgeIcon = <UserMinus className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
          borderColor = 'border-slate-700/50';
        }

        return (
          <div
            key={n.id}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0a0e1a]/90 border ${borderColor} shadow-lg shadow-black/40 text-xs font-game tracking-tight text-slate-200 animate-in fade-in slide-in-from-right-3 duration-200`}
          >
            {badgeIcon}
            <span className="truncate">
              {n.playerName && (
                <strong className={n.type === 'join' ? 'text-emerald-300 mr-1' : 'text-slate-300 mr-1'}>
                  {n.playerName}
                </strong>
              )}
              {n.message}
            </span>
          </div>
        );
      })}
    </div>
  );
};

