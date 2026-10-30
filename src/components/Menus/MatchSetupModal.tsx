'use client';

import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden">
        {/* Glow ambient background accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                Create Arena Match
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-400">
                Host Session
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure arena rules, bot density, and collision physics for this match.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="space-y-5 py-4 overflow-y-auto pr-1 text-sm select-none">
          {/* Match Presets */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Match Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SESSION_PRESETS.map((p) => {
                const isActive = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm mb-1">{p.icon}</div>
                    <div className="text-xs font-bold leading-tight truncate">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bot Intelligence & Difficulty */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Bot Difficulty (Lobby Intelligence)
              </label>
              <span className="text-[10px] text-cyan-400 font-mono">
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
                  label: '🟢 Easy',
                  desc: 'Easy Bots Only',
                  sub: 'Casual grazers',
                },
                {
                  id: 'medium',
                  label: '🟡 Medium (Standard)',
                  desc: 'Easy + Medium Mix',
                  sub: 'Hunters & scavengers',
                },
                {
                  id: 'hard',
                  label: '🔴 Hard (Apex)',
                  desc: 'All Levels (Easy, Med, Hard)',
                  sub: 'Predictive cut-offs & traps',
                },
              ].map((d) => {
                const isActive = config.botDifficulty === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => update({ botDifficulty: d.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{d.label}</div>
                    <div className="text-[10px] text-slate-300 font-semibold mt-0.5">{d.desc}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{d.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Rules Group */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
              <span>Arena Rules & Physics</span>
              {activePresetId === 'custom' && (
                <span className="text-[10px] text-amber-400 font-mono">Custom Preset</span>
              )}
            </div>

            {/* Self-Collision Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>🔄 Self-Collision (Tail Biting)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {config.selfCollision
                    ? '⚠️ Lethal: Biting your own body kills you (Classic Snake rule).'
                    : '🛡️ Allowed: You can freely cross over your own body (Slither rule).'}
                </div>
              </div>
              <button
                onClick={() => update({ selfCollision: !config.selfCollision })}
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center p-1 ${
                  config.selfCollision ? 'bg-rose-600' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.selfCollision ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Power-ups Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <div>
                <div className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>⚡ Collectible Power-Ups</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {config.enablePowerUps
                    ? 'Spawns Magnets, Turbo, 2x Mass Multipliers, and Ghost Phase.'
                    : 'Pure Arena: No power-up items will spawn.'}
                </div>
              </div>
              <button
                onClick={() => update({ enablePowerUps: !config.enablePowerUps })}
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center p-1 ${
                  config.enablePowerUps ? 'bg-cyan-500' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.enablePowerUps ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Arena Population & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bot Count */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Arena Radius */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
            {onSpectateMatch && (
              <button
                onClick={() => onSpectateMatch(config)}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 hover:text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 group"
                title="Watch bots battle with these exact rules without playing"
              >
                <span>SPECTATE MATCH</span>
                <span className="group-hover:scale-110 transition-transform">👁️</span>
              </button>
            )}

            <button
              onClick={() => onLaunchMatch(config)}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 group"
            >
              <span>LAUNCH & PLAY</span>
              <span className="group-hover:translate-x-0.5 transition-transform">🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

