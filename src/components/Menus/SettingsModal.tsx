'use client';

import React from 'react';
import { GameSettings, GraphicsQuality, ControlScheme } from '@/game/config/settings';
import { Settings, Mouse, Keyboard, Smartphone, VolumeX, Volume2, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({
  checked,
  onChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
      checked ? 'bg-blue-600' : 'bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const update = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#111827] border border-[#1e293b] rounded-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <h2 className="text-xl font-game font-bold text-white">Game Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-5 px-6 py-5 overflow-y-auto text-sm">
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
                    className={`py-2 px-3 rounded-lg font-semibold capitalize text-xs border transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Toggles */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-4 space-y-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Neon Glow Effects</div>
                <div className="text-xs text-slate-500">Radiant aura around snakes and food</div>
              </div>
              <ToggleSwitch
                checked={settings.glowEffects}
                onChange={(checked) => update({ glowEffects: checked })}
              />
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1e293b]">
              <div>
                <div className="font-semibold text-slate-200">Particle Sparks &amp; Smoke</div>
                <div className="text-xs text-slate-500">Boost flame trails and death bursts</div>
              </div>
              <ToggleSwitch
                checked={settings.particles}
                onChange={(checked) => update({ particles: checked })}
              />
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1e293b]">
              <div>
                <div className="font-semibold text-slate-200">Screen Shake</div>
                <div className="text-xs text-slate-500">Tactile impact feedback upon explosions</div>
              </div>
              <ToggleSwitch
                checked={settings.screenShake}
                onChange={(checked) => update({ screenShake: checked })}
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
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  settings.soundMuted
                    ? 'bg-red-950/30 border-red-800/50 text-red-400'
                    : 'bg-white/[0.03] border-[#1e293b] text-slate-300 hover:border-slate-600'
                }`}
              >
                {settings.soundMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Mute
                  </>
                )}
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
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
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
                  { id: 'mouse', label: 'Mouse Track', Icon: Mouse },
                  { id: 'keyboard', label: 'Arrow / WASD', Icon: Keyboard },
                  { id: 'touch', label: 'Touch / Joystick', Icon: Smartphone },
                ] as { id: ControlScheme; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }> }[]
              ).map((ctrl) => {
                const isActive = settings.controlScheme === ctrl.id;
                return (
                  <button
                    key={ctrl.id}
                    onClick={() => update({ controlScheme: ctrl.id })}
                    className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg font-semibold text-xs border text-center transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <ctrl.Icon className="w-4 h-4" />
                    {ctrl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HUD Overlay Preferences */}
          <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
            <div>
              <div className="font-semibold text-slate-200">Show FPS Counter</div>
              <div className="text-xs text-slate-500">Display real-time frame rate</div>
            </div>
            <ToggleSwitch
              checked={settings.showFps}
              onChange={(checked) => update({ showFps: checked })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e293b] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-game font-bold text-sm text-white transition-colors"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
