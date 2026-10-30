'use client';

import React from 'react';
import { GameSettings, GraphicsQuality, ControlScheme } from '@/game/config/settings';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const update = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>⚙️</span> Game Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-5 py-5 overflow-y-auto pr-1 text-sm">
          {/* Graphics Quality */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Graphics Quality
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map((q) => {
                const isActive = settings.graphicsQuality === q;
                return (
                  <button
                    key={q}
                    onClick={() => {
                      update({
                        graphicsQuality: q,
                        glowEffects: q === 'high' || q === 'ultra',
                        particles: q !== 'low',
                      });
                    }}
                    className={`py-2 px-3 rounded-xl font-semibold capitalize text-xs border transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gameplay Rules */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Gameplay Rules
            </label>
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>🔄 Self-Collision (Tail Biting)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {settings.selfCollision ? 'Hardcore' : 'Slither Default'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {settings.selfCollision
                      ? 'Lethal: Biting your own body kills you (Classic Snake rule).'
                      : 'Safe: You can freely slither across your own body (Slither.io rule).'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.selfCollision}
                  onChange={(e) => update({ selfCollision: e.target.checked })}
                  className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Visual Toggles */}
          <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Neon Glow Effects</div>
                <div className="text-xs text-slate-400">Radiant aura around snakes and food</div>
              </div>
              <input
                type="checkbox"
                checked={settings.glowEffects}
                onChange={(e) => update({ glowEffects: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Particle Sparks & Smoke</div>
                <div className="text-xs text-slate-400">Boost flame trails and death bursts</div>
              </div>
              <input
                type="checkbox"
                checked={settings.particles}
                onChange={(e) => update({ particles: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Screen Shake</div>
                <div className="text-xs text-slate-400">Tactile impact feedback upon explosions</div>
              </div>
              <input
                type="checkbox"
                checked={settings.screenShake}
                onChange={(e) => update({ screenShake: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Audio Settings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audio Volume: {settings.soundMuted ? 'Muted' : `${Math.round(settings.soundVolume * 100)}%`}
              </label>
              <button
                onClick={() => update({ soundMuted: !settings.soundMuted })}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                  settings.soundMuted
                    ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {settings.soundMuted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={settings.soundMuted}
              value={settings.soundVolume}
              onChange={(e) => update({ soundVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Controls Mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Primary Controls
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'mouse', label: '🖱️ Mouse Track' },
                  { id: 'keyboard', label: '⌨️ Arrow / WASD' },
                  { id: 'touch', label: '📱 Touch / Joystick' },
                ] as { id: ControlScheme; label: string }[]
              ).map((ctrl) => {
                const isActive = settings.controlScheme === ctrl.id;
                return (
                  <button
                    key={ctrl.id}
                    onClick={() => update({ controlScheme: ctrl.id })}
                    className={`py-2 px-2 rounded-xl font-semibold text-xs border text-center transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ctrl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HUD Overlay Preferences */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Show FPS Counter</div>
              <div className="text-xs text-slate-400">Display real-time frame rate</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showFps}
              onChange={(e) => update({ showFps: e.target.checked })}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 font-bold text-sm text-slate-950 hover:brightness-110 shadow-lg transition-all"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
