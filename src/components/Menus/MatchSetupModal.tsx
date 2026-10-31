'use client';

import React, { useState } from 'react';
import {
  Swords,
  X,
  Zap,
  Eye,
  Play,
  Skull,
  Flame,
  Shield,
  Globe,
  Lock,
  Gamepad2,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ArenaSessionConfig,
  DEFAULT_SESSION_CONFIG,
  SESSION_PRESETS,
  SessionPreset,
} from '@/game/config/session';

export type MatchHostingMode = 'offline' | 'public' | 'private';

interface MatchSetupModalProps {
  initialConfig?: ArenaSessionConfig;
  onLaunchOffline: (config: ArenaSessionConfig) => void;
  onLaunchOnlineRoom: (
    mode: 'public' | 'private',
    roomCode: string,
    roomName: string,
    config: ArenaSessionConfig
  ) => void;
  onSpectateMatch?: (config: ArenaSessionConfig) => void;
  onClose: () => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  initialConfig = DEFAULT_SESSION_CONFIG,
  onLaunchOffline,
  onLaunchOnlineRoom,
  onSpectateMatch,
  onClose,
}) => {
  const [config, setConfig] = useState<ArenaSessionConfig>(initialConfig);
  const [activePresetId, setActivePresetId] = useState<string>('standard');
  const [hostingMode, setHostingMode] = useState<MatchHostingMode>('offline');
  const [roomCode, setRoomCode] = useState<string>(() => generateRoomCode());
  const [roomName, setRoomName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: SessionPreset) => {
    setActivePresetId(preset.id);
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
  };

  const update = (partial: Partial<ArenaSessionConfig>) => {
    setActivePresetId('custom');
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleLaunch = () => {
    if (hostingMode === 'offline') {
      onLaunchOffline(config);
    } else {
      const finalName = roomName.trim() || (hostingMode === 'private' ? 'Private Squad Arena' : 'Public Battle Arena');
      onLaunchOnlineRoom(hostingMode, roomCode, finalName, config);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-[#111827] border border-[#1e293b] rounded-2xl p-5 sm:p-7 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Swords className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-xl font-game font-bold text-[#f1f5f9] tracking-tight">
                Host Arena Match
              </h2>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 ml-[42px]">
              Configure rules, bot density, and choose offline solo or online multiplayer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] border border-[#1e293b] text-[#64748b] hover:text-[#f1f5f9] hover:border-[#3b82f6]/50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="space-y-4 py-4 overflow-y-auto pr-1 text-sm">
          {/* 1. Hosting Mode Selector (3 options) */}
          <div>
            <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-2">
              Match Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Offline Solo */}
              <button
                type="button"
                onClick={() => setHostingMode('offline')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  hostingMode === 'offline'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-md shadow-blue-500/10'
                    : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span className="text-xs font-game">Offline Solo</span>
              </button>

              {/* Public Online */}
              <button
                type="button"
                onClick={() => setHostingMode('public')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  hostingMode === 'public'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold shadow-md shadow-emerald-500/10'
                    : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-game">Public Online</span>
              </button>

              {/* Private Code */}
              <button
                type="button"
                onClick={() => setHostingMode('private')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  hostingMode === 'private'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400 font-bold shadow-md shadow-purple-500/10'
                    : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="text-xs font-game">Private Code</span>
              </button>
            </div>
          </div>

          {/* Mode Contextual Card: Private Code or Public Info */}
          {hostingMode === 'private' && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-game font-bold uppercase tracking-wider text-purple-300">
                  Room Invite Code
                </span>
                <button
                  type="button"
                  onClick={() => setRoomCode(generateRoomCode())}
                  className="text-[11px] text-purple-400 hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                  title="Generate new code"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reroll</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2 bg-black/40 border border-purple-700/50 rounded-lg text-lg font-mono font-bold tracking-widest text-center text-purple-200">
                  {roomCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-purple-300/80">
                Share this 6-character code with your friends so they can join from the Arena Browser.
              </p>
            </div>
          )}

          {hostingMode === 'public' && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300/90 flex items-center gap-2">
              <Globe className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                This arena will be published to the Community Arena Browser for any player to join.
              </span>
            </div>
          )}

          {/* 2. Match Presets */}
          <div>
            <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-2">
              Rule Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SESSION_PRESETS.map((p) => {
                const isActive = activePresetId === p.id;
                const getPresetIcon = () => {
                  switch (p.id) {
                    case 'hardcore':
                      return <Skull className="w-4 h-4 text-red-400" />;
                    case 'casual':
                      return <Shield className="w-4 h-4 text-emerald-400" />;
                    case 'mayhem':
                      return <Flame className="w-4 h-4 text-amber-400" />;
                    default:
                      return <Zap className="w-4 h-4 text-blue-400" />;
                  }
                };

                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                    }`}
                  >
                    <div className="mb-1.5">{getPresetIcon()}</div>
                    <div className="text-xs font-game font-bold leading-tight truncate">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Bot Population Slider */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-[#1e293b]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-game font-semibold text-slate-300">Bot Population</span>
              <span className="text-xs font-mono font-bold text-blue-400">{config.botCount} Bots</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={2}
              value={config.botCount}
              onChange={(e) => update({ botCount: parseInt(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* 4. AI Difficulty */}
          <div>
            <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              AI Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Easy (Passive)' },
                { id: 'medium', label: 'Balanced (Normal)' },
                { id: 'hard', label: 'Apex Hard (Lethal)' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => update({ botDifficulty: d.id as any })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    config.botDifficulty === d.id
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-[#94a3b8] hover:text-[#f1f5f9] font-game font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
            {hostingMode === 'offline' && onSpectateMatch && (
              <button
                onClick={() => onSpectateMatch(config)}
                className="flex-1 py-3 rounded-xl bg-transparent border border-[#1e293b] hover:border-blue-500/50 text-[#94a3b8] hover:text-[#f1f5f9] font-game font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Spectate</span>
              </button>
            )}

            <button
              onClick={handleLaunch}
              className={`flex-1 py-3 rounded-xl text-white font-game font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-lg ${
                hostingMode === 'offline'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  : hostingMode === 'public'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>
                {hostingMode === 'offline'
                  ? 'Start Solo Match'
                  : hostingMode === 'public'
                  ? 'Launch Public Arena'
                  : 'Launch Private Arena'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
