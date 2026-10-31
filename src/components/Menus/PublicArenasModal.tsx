'use client';

import React, { useState, useEffect } from 'react';
import { DEFAULT_PARTY_HOST, getPartyWsUrl, getActivePartyHost } from '@/game/network/PartyClient';
import {
  Globe,
  TreePine,
  Swords,
  Play,
  Lock,
  Eye,
  Wifi,
  Clock,
  Users,
  X,
  User,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export interface DedicatedArenaInfo {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  uptimeSeconds: number;
  snakesCount: number;
  playersCount: number;
  isOnline: boolean;
  pingMs: number;
}

export interface CommunityArenaInfo {
  id: string;
  name: string;
  hostName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  uptimeSeconds: number;
  snakesCount: number;
  playersCount: number;
  pingMs: number;
}

interface PublicArenasModalProps {
  onJoinArena: (roomId: string, isSpectating: boolean, serverUrl: string, roomCode?: string) => void;
  onClose: () => void;
}

const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'ws://localhost:3001';

export const PublicArenasModal: React.FC<PublicArenasModalProps> = ({
  onJoinArena,
  onClose,
}) => {
  const serverUrl = DEFAULT_SERVER_URL;
  const [isChecking, setIsChecking] = useState<boolean>(true);

  // Private Code input state
  const [privateCode, setPrivateCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Dedicated 24/7 Official Arenas
  const [dedicatedArenas, setDedicatedArenas] = useState<DedicatedArenaInfo[]>([
    {
      id: 'medium',
      name: 'Emerald Glade',
      difficulty: 'medium',
      uptimeSeconds: 0,
      snakesCount: 38,
      playersCount: 0,
      isOnline: false,
      pingMs: 0,
    },
    {
      id: 'hard',
      name: 'Apex Colosseum',
      difficulty: 'hard',
      uptimeSeconds: 0,
      snakesCount: 45,
      playersCount: 0,
      isOnline: false,
      pingMs: 0,
    },
  ]);

  // Live Community player-hosted rooms
  const [communityArenas, setCommunityArenas] = useState<CommunityArenaInfo[]>([]);

  // Probe server status directly via WebSocket
  useEffect(() => {
    let isMounted = true;
    let activeWs: WebSocket | null = null;
    let partyLobbyWs: WebSocket | null = null;

    // Probe Cloudflare PartyServer Lobby for edge community rooms
    let lobbyPollInterval: any = null;
    const probePartyLobby = () => {
      try {
        const partyHost = getActivePartyHost();
        const lobbyUrl = getPartyWsUrl(partyHost, 'lobby');
        const startT = performance.now();
        const pws = new WebSocket(lobbyUrl);
        partyLobbyWs = pws;

        pws.onopen = () => {
          const latency = Math.max(12, Math.round(performance.now() - startT));
          if (isMounted) {
            setDedicatedArenas([
              {
                id: 'medium',
                name: 'Emerald Glade',
                difficulty: 'medium',
                uptimeSeconds: 3600,
                snakesCount: 22,
                playersCount: 0,
                isOnline: true,
                pingMs: latency,
              },
              {
                id: 'hard',
                name: 'Apex Colosseum',
                difficulty: 'hard',
                uptimeSeconds: 3600,
                snakesCount: 28,
                playersCount: 0,
                isOnline: true,
                pingMs: latency,
              },
            ]);
            setIsChecking(false);
          }
          if (pws.readyState === WebSocket.OPEN) {
            pws.send(JSON.stringify({ type: 'get_rooms' }));
          }
        };

        pws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (isMounted && data.type === 'community_rooms' && Array.isArray(data.rooms)) {
              setCommunityArenas(
                data.rooms.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  hostName: c.hostName || 'Host',
                  difficulty: c.difficulty || 'medium',
                  uptimeSeconds: c.uptimeSeconds || 0,
                  snakesCount: c.snakesCount || 30,
                  playersCount: c.playersCount || 1,
                  pingMs: 15,
                }))
              );
            }
          } catch {}
        };

        lobbyPollInterval = setInterval(() => {
          if (pws.readyState === WebSocket.OPEN) {
            pws.send(JSON.stringify({ type: 'get_rooms' }));
          }
        }, 3000);
      } catch {}
    };

    probePartyLobby();

    const checkServer = () => {
      const startT = performance.now();

      try {
        const ws = new WebSocket(serverUrl);
        activeWs = ws;

        const timer = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            try {
              ws.close();
            } catch {}
            checkHttpFallback(startT);
          }
        }, 4000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'status' }));
        };

        ws.onmessage = (event) => {
          clearTimeout(timer);
          try {
            const data = JSON.parse(event.data);
            const latency = Math.max(5, Math.round(performance.now() - startT));

            if (isMounted && data.type === 'status' && data.arenas) {
              setDedicatedArenas([
                {
                  id: 'medium',
                  name: data.arenas.medium.name || 'Emerald Glade',
                  difficulty: 'medium',
                  uptimeSeconds: data.arenas.medium.uptime || 0,
                  snakesCount: data.arenas.medium.snakes || 38,
                  playersCount: data.arenas.medium.players || 0,
                  isOnline: true,
                  pingMs: latency,
                },
                {
                  id: 'hard',
                  name: data.arenas.hard.name || 'Apex Colosseum',
                  difficulty: 'hard',
                  uptimeSeconds: data.arenas.hard.uptime || 0,
                  snakesCount: data.arenas.hard.snakes || 45,
                  playersCount: data.arenas.hard.players || 0,
                  isOnline: true,
                  pingMs: latency,
                },
              ]);

              setIsChecking(false);
            }
          } catch {}
          try {
            ws.close();
          } catch {}
        };

        ws.onerror = () => {
          clearTimeout(timer);
          checkHttpFallback(startT);
        };
      } catch {
        checkHttpFallback(startT);
      }
    };

    const checkHttpFallback = async (startT: number) => {
      try {
        const httpUrl = serverUrl.replace(/^ws(s)?:\/\//, 'http$1://');
        const res = await fetch(`${httpUrl}/api/status`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const latency = Math.max(5, Math.round(performance.now() - startT));

          if (isMounted && data.arenas) {
            setDedicatedArenas([
              {
                id: 'medium',
                name: data.arenas.medium.name || 'Emerald Glade',
                difficulty: 'medium',
                uptimeSeconds: data.arenas.medium.uptime || 0,
                snakesCount: data.arenas.medium.snakes || 38,
                playersCount: data.arenas.medium.players || 0,
                isOnline: true,
                pingMs: latency,
              },
              {
                id: 'hard',
                name: data.arenas.hard.name || 'Apex Colosseum',
                difficulty: 'hard',
                uptimeSeconds: data.arenas.hard.uptime || 0,
                snakesCount: data.arenas.hard.snakes || 45,
                playersCount: data.arenas.hard.players || 0,
                isOnline: true,
                pingMs: latency,
              },
            ]);

            setIsChecking(false);
            return;
          }
        }
      } catch {}

      if (isMounted) {
        setDedicatedArenas((prev) =>
          prev.map((a) => ({
            ...a,
            isOnline: false,
            pingMs: 0,
          }))
        );
        setIsChecking(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (lobbyPollInterval) clearInterval(lobbyPollInterval);
      if (activeWs) {
        try {
          activeWs.close();
        } catch {}
      }
      if (partyLobbyWs) {
        try {
          partyLobbyWs.close();
        } catch {}
      }
    };
  }, [serverUrl]);

  const formatUptime = (sec: number) => {
    if (sec <= 0) return 'Just started';
    const mins = Math.floor(sec / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${sec % 60}s`;
  };

  const handleJoinPrivateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = privateCode.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setCodeError('Please enter a valid room code.');
      return;
    }
    setCodeError(null);
    onJoinArena('', false, serverUrl, clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#1e293b] rounded-2xl p-5 sm:p-6 flex flex-col relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b] mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-game text-white">
                Arena Browser
              </h2>
              <p className="text-xs text-slate-400">
                Join 24/7 dedicated official arenas or player-hosted custom matches.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a2235] hover:bg-[#243044] border border-[#1e293b] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Private Room Code Join Bar */}
        <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-800/40 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-game font-bold text-purple-300 uppercase tracking-wider">
              Join Private Arena With Code
            </span>
          </div>

          <form onSubmit={handleJoinPrivateCode} className="flex items-center gap-2">
            <input
              type="text"
              maxLength={12}
              value={privateCode}
              onChange={(e) => {
                setPrivateCode(e.target.value.toUpperCase());
                if (codeError) setCodeError(null);
              }}
              placeholder="ENTER CODE (e.g. VIP-842)..."
              className="flex-1 h-10 px-3.5 rounded-lg bg-black/40 border border-purple-700/50 text-xs sm:text-sm font-mono font-bold tracking-widest text-purple-100 placeholder:text-purple-400/50 uppercase focus:outline-none focus:border-purple-400 transition-colors"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md shadow-purple-900/30 shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Join</span>
            </button>
          </form>

          {codeError && (
            <div className="mt-2 text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{codeError}</span>
            </div>
          )}
        </div>

        {/* Server Connection Indicator */}
        <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 mb-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                dedicatedArenas.some((a) => a.isOnline)
                  ? 'bg-emerald-400 animate-pulse'
                  : isChecking
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {dedicatedArenas.some((a) => a.isOnline) ? (
                <>
                  Multiplayer Dedicated Backend: <strong className="text-emerald-400">ONLINE</strong>
                </>
              ) : isChecking ? (
                <>Connecting to Multiplayer Backend...</>
              ) : (
                <>
                  Multiplayer Backend: <strong className="text-red-400">OFFLINE</strong>
                </>
              )}
            </span>
          </div>

          {dedicatedArenas.some((a) => a.isOnline) && (
            <span className="text-[11px] font-mono font-bold text-slate-500 flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              {dedicatedArenas[0].pingMs || dedicatedArenas[1].pingMs}ms
            </span>
          )}
        </div>

        {/* 2. Official Dedicated Servers Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-game font-bold uppercase tracking-wider text-slate-400">
              Official Dedicated Arenas (24/7)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {dedicatedArenas.map((arena) => {
              const isMed = arena.id === 'medium';
              const diffColor = isMed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20';

              return (
                <div
                  key={arena.id}
                  className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between transition-colors hover:border-slate-600"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 bg-[#1a2235] rounded-lg">
                        {isMed ? (
                          <TreePine className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Swords className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {arena.isOnline ? (
                          <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ONLINE
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            OFFLINE
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${diffColor}`}>
                          {arena.difficulty}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold font-game text-[#f1f5f9] mb-1">
                      {arena.name}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 bg-[#111827] border border-[#1e293b] rounded-lg p-2 mb-3 text-[10px]">
                      <div>
                        <div className="text-[#64748b] flex items-center gap-1 mb-0.5">
                          <Users className="w-3 h-3" />
                          Snakes
                        </div>
                        <div className="font-bold text-[#f1f5f9] font-mono">
                          {arena.isOnline ? `${arena.snakesCount} (${arena.playersCount} Players)` : '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#64748b] flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3" />
                          Uptime
                        </div>
                        <div className="font-bold text-[#f1f5f9] font-mono">
                          {arena.isOnline ? formatUptime(arena.uptimeSeconds) : '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#1e293b]">
                    <button
                      onClick={() => onJoinArena(arena.id, true, serverUrl, arena.id === 'hard' ? 'apex-colosseum' : 'emerald-glade')}
                      disabled={!arena.isOnline}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[#1e293b] font-game font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="Spectate match"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Spec</span>
                    </button>

                    <button
                      onClick={() => onJoinArena(arena.id, false, serverUrl, arena.id === 'hard' ? 'apex-colosseum' : 'emerald-glade')}
                      disabled={!arena.isOnline}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-game font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Join Arena</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Community Player-Created Arenas */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-game font-bold uppercase tracking-wider text-slate-400">
              Community Public Arenas ({communityArenas.length})
            </span>
          </div>

          {communityArenas.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1e293b] text-center text-xs text-slate-500 py-6">
              No player-hosted public arenas are currently online.
              <br />
              <span className="text-slate-400">Host your own from the Host Match menu!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {communityArenas.map((room) => (
                <div
                  key={room.id}
                  className="p-3 rounded-xl bg-[#0d1117] border border-[#1e293b] flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-game font-bold text-slate-200 truncate">
                        {room.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-800/40 text-blue-400">
                        {room.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="w-3 h-3" />
                        Host: <strong className="text-slate-400">{room.hostName}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>{room.playersCount} Players / {room.snakesCount} Snakes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onJoinArena('', true, serverUrl, room.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-game font-bold text-xs flex items-center gap-1 border border-[#1e293b] cursor-pointer"
                      title="Spectate"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onJoinArena('', false, serverUrl, room.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Join</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
