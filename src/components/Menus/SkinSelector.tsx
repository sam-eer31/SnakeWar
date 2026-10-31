'use client';

import React, { useEffect, useRef } from 'react';
import { SKINS, SnakeSkin } from '@/game/config/skins';
import { drawIllustratedSnakePreview } from '@/game/render/IllustratedSnakeRenderer';

interface SkinSelectorProps {
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onClose: () => void;
}

// Mini preview canvas for each skin with hand-drawn illustrated style
const SkinCanvasPreview: React.FC<{ skin: SnakeSkin }> = ({ skin }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.045;
      drawIllustratedSnakePreview(ctx, skin, canvas.width, canvas.height, t);
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [skin]);

  return <canvas ref={canvasRef} width={180} height={70} className="w-full h-16 block" />;
};

export const SkinSelector: React.FC<SkinSelectorProps> = ({
  selectedSkinId,
  onSelectSkin,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>🎨</span> Snake Skin Wardrobe
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your serpent style and stand out in the arena!
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 overflow-y-auto pr-1">
          {SKINS.map((skin) => {
            const isSelected = skin.id === selectedSkinId;
            return (
              <div
                key={skin.id}
                onClick={() => onSelectSkin(skin.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] scale-[1.02]'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{skin.name}</span>
                    {skin.accessory && skin.accessory !== 'none' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {skin.accessory === 'crown'
                          ? '👑 Crown'
                          : skin.accessory === 'halo'
                          ? '😇 Halo'
                          : skin.accessory === 'glasses'
                          ? '🕶️ Shades'
                          : '😈 Horns'}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                      ✓ Active
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/70 rounded-xl p-1 mb-2 border border-slate-800/80">
                  <SkinCanvasPreview skin={skin} />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{skin.patternType} pattern</span>
                  <div className="flex items-center gap-1">
                    {skin.bodyColors.slice(0, 4).map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/30"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 font-bold text-sm text-slate-950 hover:brightness-110 shadow-lg transition-all"
          >
            Select & Return
          </button>
        </div>
      </div>
    </div>
  );
};

