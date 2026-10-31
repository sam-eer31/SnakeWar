'use client';

import React, { useState } from 'react';
import {
  Swords,
  X,
  RefreshCw,
  Zap,
  Eye,
  Play,
  Skull,
  Flame,
  Shield,
} from 'lucide-react';
import {
  ArenaSessionConfig,
  DEFAULT_SESSION_CONFIG,
  SESSION_PRESETS,
  SessionPreset,
} from '@/game/config/session';

interface MatchSetupModalProps {
  initialConfig?: ArenaSessionConfig;
  onLaunchMatch: (config: ArenaSessionConfig) => void;
  onSpectateMatch?: (config: ArenaSessionConfig) => void;
  onClose: () => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  initialConfig = DEFAULT_SESSION_CONFIG,
  onLaunchMatch,
  onSpectateMatch,
  onClose,
}) => {
  const [config, setConfig] = useState<ArenaSessionConfig>(initialConfig);
  const [activePresetId, setActivePresetId] = useState<string>('standard');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#111827] border border-[#1e293b] rounded-2xl p-6 sm:p-7 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Swords className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-xl font-game font-bold text-[#f1f5f9] tracking-tight">
                Create Arena Match
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-700/40 text-blue-400">
                Host Session
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 ml-[42px]">
              Configure arena rules, bot density, and collision physics for this match.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] border border-[#1e293b] text-[#64748b] hover:text-[#f1f5f9] hover:border-[#3b82f6]/50 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="space-y-5 py-4 overflow-y-auto pr-1 text-sm select-none">
          {/* Match Presets */}
          <div>
            <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-2">
              Match Presets
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

          {/* Bot Intelligence & Difficulty */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b]">
                Bot Difficulty (Lobby Intelligence)
              </label>
              <span className="text-[10px] text-blue-400 font-mono">
                {config.botDifficulty === 'easy'
                  ? 'Casual grazers only'
                  : config.botDifficulty === 'medium'
                  ? 'Mixed: Easy & Medium bots'
                  : 'Apex: Easy, Med & Hard bots'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'easy',
                  label: 'Easy',
                  desc: 'Easy Bots Only',
                  sub: 'Casual grazers',
                  dotColor: 'bg-emerald-500',
                },
                {
                  id: 'medium',
                  label: 'Medium (Standard)',
                  desc: 'Easy + Medium Mix',
                  sub: 'Hunters & scavengers',
                  dotColor: 'bg-amber-500',
                },
                {
                  id: 'hard',
                  label: 'Hard (Apex)',
                  desc: 'All Levels (Easy, Med, Hard)',
                  sub: 'Predictive cut-offs & traps',
                  dotColor: 'bg-red-500',
                },
              ].map((d) => {
                const isActive = config.botDifficulty === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => update({ botDifficulty: d.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${d.dotColor} shrink-0`} />
                      {d.label}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-blue-200' : 'text-[#94a3b8]'}`}>
                      {d.desc}
                    </div>
                    <div className="text-[9px] text-[#64748b] mt-0.5">{d.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Rules Group */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-4 space-y-4">
            <div className="text-xs font-game font-bold uppercase tracking-wider text-[#64748b] border-b border-[#1e293b] pb-1.5 flex items-center justify-between">
              <span>Arena Rules & Physics</span>
              {activePresetId === 'custom' && (
                <span className="text-[10px] text-amber-400 font-mono">Custom Preset</span>
              )}
            </div>

            {/* Self-Collision Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#f1f5f9] text-xs sm:text-sm flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span>Self-Collision (Tail Biting)</span>
                </div>
                <div className="text-[11px] text-[#64748b] mt-0.5 ml-5">
                  {config.selfCollision
                    ? 'Lethal: Biting your own body kills you (Classic Snake rule).'
                    : 'Allowed: You can freely cross over your own body (Slither rule).'}
                </div>
              </div>
              <button
                onClick={() => update({ selfCollision: !config.selfCollision })}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                  config.selfCollision ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform mx-0.5 ${
                    config.selfCollision ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Power-ups Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
              <div>
                <div className="font-bold text-[#f1f5f9] text-xs sm:text-sm flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span>Collectible Power-Ups</span>
                </div>
                <div className="text-[11px] text-[#64748b] mt-0.5 ml-5">
                  {config.enablePowerUps
                    ? 'Spawns Magnets, Turbo, 2x Mass Multipliers, and Ghost Phase.'
                    : 'Pure Arena: No power-up items will spawn.'}
                </div>
              </div>
              <button
                onClick={() => update({ enablePowerUps: !config.enablePowerUps })}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                  config.enablePowerUps ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform mx-0.5 ${
                    config.enablePowerUps ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Arena Population & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bot Count */}
            <div>
              <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Bot Population
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { count: 15, label: '15 Casual' },
                  { count: 28, label: '28 Normal' },
                  { count: 42, label: '42 Chaos' },
                ].map((b) => (
                  <button
                    key={b.count}
                    onClick={() => update({ botCount: b.count })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      config.botCount === b.count
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Arena Radius */}
            <div>
              <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Arena Dimension
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { radius: 1800, label: 'Compact' },
                  { radius: 2500, label: 'Standard' },
                  { radius: 3500, label: 'Massive' },
                ].map((a) => (
                  <button
                    key={a.radius}
                    onClick={() => update({ arenaRadius: a.radius })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      config.arenaRadius === a.radius
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Food Density */}
          <div>
            <label className="block text-[11px] font-game font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Food Pellet Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Sparse (700)' },
                { id: 'normal', label: 'Standard (1,200)' },
                { id: 'rich', label: 'Rich Clusters (1,800)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => update({ foodDensity: f.id as any })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    config.foodDensity === f.id
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/[0.03] border-[#1e293b] text-[#94a3b8] hover:border-[#3b82f6]/30 hover:text-[#f1f5f9]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-[#94a3b8] hover:text-[#f1f5f9] font-game font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
            {onSpectateMatch && (
              <button
                onClick={() => onSpectateMatch(config)}
                className="flex-1 py-3 rounded-xl bg-transparent border border-[#1e293b] hover:border-blue-500/50 text-[#94a3b8] hover:text-[#f1f5f9] font-game font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                title="Watch bots battle with these exact rules without playing"
              >
                <Eye className="w-4 h-4" />
                <span>Spectate Match</span>
              </button>
            )}

            <button
              onClick={() => onLaunchMatch(config)}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-game font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Play className="w-4 h-4" />
              <span>Launch & Play</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
