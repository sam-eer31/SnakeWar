'use client';

import React, { useState, useEffect } from 'react';
import { getPartyWsUrl, getActivePartyHost } from '@/game/network/PartyClient';
import {
  Globe,
  Play,
  Eye,
  Users,
  X,
  User,
  AlertCircle,
  KeyRound,
  Radio,
} from 'lucide-react';

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
  onJoinArena: (roomCode: string, isSpectating: boolean) => void;
  onClose: () => void;
}

export const PublicArenasModal: React.FC<PublicArenasModalProps> = ({
  onJoinArena,
  onClose,
}) => {
  const [privateCode, setPrivateCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [communityArenas, setCommunityArenas] = useState<CommunityArenaInfo[]>([]);
  const [isLobbyConnected, setIsLobbyConnected] = useState<boolean>(false);

  // Poll Cloudflare PartyServer Lobby for player-hosted arenas
  useEffect(() => {
    let isMounted = true;
    let partyLobbyWs: WebSocket | null = null;
    let lobbyPollInterval: any = null;

    const connectLobby = () => {
      try {
        const partyHost = getActivePartyHost();
        const lobbyUrl = getPartyWsUrl(partyHost, 'lobby');
        const pws = new WebSocket(lobbyUrl);
        partyLobbyWs = pws;

        pws.onopen = () => {
          if (isMounted) {
            setIsLobbyConnected(true);
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

        pws.onclose = () => {
          if (isMounted) setIsLobbyConnected(false);
        };

        pws.onerror = () => {
          if (isMounted) setIsLobbyConnected(false);
        };

        lobbyPollInterval = setInterval(() => {
          if (pws.readyState === WebSocket.OPEN) {
            pws.send(JSON.stringify({ type: 'get_rooms' }));
          }
        }, 3000);
      } catch {}
    };

    connectLobby();

    return () => {
      isMounted = false;
      if (lobbyPollInterval) clearInterval(lobbyPollInterval);
      if (partyLobbyWs) {
        try {
          partyLobbyWs.close();
        } catch {}
      }
    };
  }, []);

  const handleJoinPrivateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = privateCode.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setCodeError('Please enter a valid room code.');
      return;
    }
    setCodeError(null);
    onJoinArena(clean, false);
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
                Join a friend via Room Code or browse active community arenas.
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
        <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-800/40 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-game font-bold text-purple-300 uppercase tracking-wider">
              Join Match With Code
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
              placeholder="ENTER ROOM CODE (e.g. VIP-842)..."
              className="flex-1 h-11 px-3.5 rounded-lg bg-black/40 border border-purple-700/50 text-xs sm:text-sm font-mono font-bold tracking-widest text-purple-100 placeholder:text-purple-400/50 uppercase focus:outline-none focus:border-purple-400 transition-colors"
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md shadow-purple-900/30 shrink-0"
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

        {/* 2. Community Public Arenas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-game font-bold uppercase tracking-wider text-slate-300">
                Community Public Matches ({communityArenas.length})
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isLobbyConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
                title={isLobbyConnected ? 'Lobby live' : 'Connecting'}
              />
            </div>
          </div>

          {communityArenas.length === 0 ? (
            <div className="p-8 rounded-xl bg-white/[0.02] border border-[#1e293b] text-center text-xs text-slate-500">
              <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
              No public arenas are currently hosted.
              <br />
              <span className="text-slate-400 font-medium">Click "Host Match" on the main menu to start your own arena!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {communityArenas.map((room) => (
                <div
                  key={room.id}
                  className="p-3.5 rounded-xl bg-[#0d1117] border border-[#1e293b] flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-game font-bold text-slate-100 truncate">
                        {room.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-400 uppercase">
                        {room.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        Host: <strong className="text-slate-300">{room.hostName}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3 h-3 text-slate-500" />
                        {room.playersCount} {room.playersCount === 1 ? 'Player' : 'Players'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onJoinArena(room.id, true)}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-game font-bold text-xs flex items-center gap-1 border border-[#1e293b] cursor-pointer transition-colors"
                      title="Spectate match"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Spec</span>
                    </button>
                    <button
                      onClick={() => onJoinArena(room.id, false)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-md shadow-emerald-900/30"
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
