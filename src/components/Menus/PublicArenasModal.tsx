'use client';

import React, { useState, useEffect } from 'react';

export interface PublicArenaInfo {
  id: 'medium' | 'hard';
  name: string;
  difficulty: 'medium' | 'hard';
  uptimeSeconds: number;
  snakesCount: number;
  isOnline: boolean;
  pingMs: number;
}

interface PublicArenasModalProps {
  onJoinArena: (roomId: 'medium' | 'hard', isSpectating: boolean, serverUrl: string) => void;
  onClose: () => void;
}

const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'ws://localhost:3001';

export const PublicArenasModal: React.FC<PublicArenasModalProps> = ({
  onJoinArena,
  onClose,
}) => {
  const serverUrl = DEFAULT_SERVER_URL;
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const [arenas, setArenas] = useState<PublicArenaInfo[]>([
    {
      id: 'medium',
      name: 'Emerald Glade',
      difficulty: 'medium',
      uptimeSeconds: 0,
      snakesCount: 38,
      isOnline: false,
      pingMs: 0,
    },
    {
      id: 'hard',
      name: 'Apex Colosseum',
      difficulty: 'hard',
      uptimeSeconds: 0,
      snakesCount: 45,
      isOnline: false,
      pingMs: 0,
    },
  ]);

  // Poll server health endpoint to get live status, population, and uptime
  useEffect(() => {
    let isMounted = true;

    const checkServer = async () => {
      // Derive HTTP URL from WS URL for healthcheck
      const httpUrl = serverUrl.replace(/^ws(s)?:\/\//, 'http$1://');
      const startT = performance.now();

      try {
        const res = await fetch(`${httpUrl}/health`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const latency = Math.round(performance.now() - startT);

          if (isMounted && data.arenas) {
            setArenas([
              {
                id: 'medium',
                name: data.arenas.medium.name || 'Emerald Glade',
                difficulty: 'medium',
                uptimeSeconds: data.arenas.medium.uptime || 0,
                snakesCount: data.arenas.medium.snakes || 38,
                isOnline: true,
                pingMs: latency,
              },
              {
                id: 'hard',
                name: data.arenas.hard.name || 'Apex Colosseum',
                difficulty: 'hard',
                uptimeSeconds: data.arenas.hard.uptime || 0,
                snakesCount: data.arenas.hard.snakes || 45,
                isOnline: true,
                pingMs: latency,
              },
            ]);
            setIsChecking(false);
          }
        } else {
          throw new Error('Not 200');
        }
      } catch {
        if (isMounted) {
          setArenas((prev) =>
            prev.map((a) => ({
              ...a,
              isOnline: false,
              pingMs: 0,
            }))
          );
          setIsChecking(false);
        }
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serverUrl]);

  const formatUptime = (sec: number) => {
    if (sec <= 0) return 'Just started';
    const mins = Math.floor(sec / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${sec % 60}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-cyan-950/70 border border-cyan-800/50 rounded-2xl">
              🌐
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                Official Public Arenas
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Live 24/7 dedicated servers with persistent AI ecosystems and players
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Server Connection Banner */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                arenas.some((a) => a.isOnline)
                  ? 'bg-emerald-400 animate-pulse'
                  : isChecking
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {arenas.some((a) => a.isOnline) ? (
                <>
                  Official Dedicated Arenas: <strong className="text-emerald-400">Online</strong>
                </>
              ) : isChecking ? (
                <>Connecting to Global Arenas...</>
              ) : (
                <>
                  Dedicated Arenas:{' '}
                  <strong className="text-amber-400">Local Simulation Fallback Active</strong>
                </>
              )}
            </span>
          </div>

          {arenas.some((a) => a.isOnline) && (
            <span className="text-[11px] font-mono font-bold text-slate-400">
              Ping: {arenas[0].pingMs || arenas[1].pingMs}ms
            </span>
          )}
        </div>

        {/* Arenas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {arenas.map((arena) => {
            const isMed = arena.id === 'medium';
            const badgeColor = isMed
              ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/70 border-rose-700/60 text-rose-300';

            return (
              <div
                key={arena.id}
                className={`bg-slate-950/60 border rounded-3xl p-5 flex flex-col justify-between transition-all hover:bg-slate-950/80 shadow-xl relative overflow-hidden ${
                  isMed ? 'border-emerald-500/30 hover:border-emerald-400/50' : 'border-rose-500/30 hover:border-rose-400/50'
                }`}
              >
                {/* Header info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{isMed ? '🌲' : '⚔️'}</span>
                    <div className="flex items-center gap-1.5">
                      {arena.isOnline ? (
                        <span className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE • {arena.pingMs}ms
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-950/80 border border-amber-600/50 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          LOCAL SIMULATION
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeColor}`}>
                        {arena.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-100 mb-1">
                    {arena.name}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {isMed
                      ? 'Massive 9,000px battleground. Strict Medium & Easy bots only (0% red apex predators). Great for steady growth and hunting.'
                      : 'Massive 9,000px Colosseum. Dominated by aggressive Red Apex grandmaster bots with lethal constrictor coils and speed cuts.'}
                  </p>

                  {/* Arena Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 mb-4 text-[11px]">
                    <div>
                      <div className="text-slate-400 text-[10px]">Active Snakes</div>
                      <div className="font-bold text-cyan-300 font-mono">
                        {arena.snakesCount} Serpents
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Server Uptime</div>
                      <div className="font-bold text-slate-200 font-mono">
                        {formatUptime(arena.uptimeSeconds)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onJoinArena(arena.id, false, serverUrl)}
                    className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-950 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                      isMed
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:brightness-110'
                        : 'bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 hover:brightness-110'
                    }`}
                  >
                    <span>ENTER & PLAY</span>
                    <span>🚀</span>
                  </button>

                  <button
                    onClick={() => onJoinArena(arena.id, true, serverUrl)}
                    className="w-full py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 font-bold text-slate-300 hover:text-white text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <span>👁️ Spectate Live Arena</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-400">
          ⚡ 30 Hz server-authoritative tick rate with real-time multiplayer, persistent AI ecosystems, and automatic local fallback.
        </div>
      </div>
    </div>
  );
};

