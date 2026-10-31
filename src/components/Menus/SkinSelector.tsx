'use client';

import React, { useEffect, useRef } from 'react';
import { SKINS, SnakeSkin } from '@/game/config/skins';
import { drawIllustratedSnakePreview } from '@/game/render/IllustratedSnakeRenderer';
import { Palette, Check, X } from 'lucide-react';

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

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = 180;
    const cssH = 70;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.045;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawIllustratedSnakePreview(ctx, skin, cssW, cssH, t);
      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [skin]);

  return <canvas ref={canvasRef} className="w-full h-16 block" />;
};

export const SkinSelector: React.FC<SkinSelectorProps> = ({
  selectedSkinId,
  onSelectSkin,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Palette className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-game text-white">
                Snake Skins
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your serpent style and stand out in the arena
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a2235] hover:bg-[#243044] border border-[#1e293b] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 overflow-y-auto pr-1">
          {SKINS.map((skin) => {
            const isSelected = skin.id === selectedSkinId;
            return (
              <div
                key={skin.id}
                onClick={() => onSelectSkin(skin.id)}
                className={`cursor-pointer rounded-xl border p-3 transition-colors duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/20 border-blue-500'
                    : 'bg-[#0d1117] border-[#1e293b] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#f1f5f9]">{skin.name}</span>
                  {isSelected && (
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>

                <div className="bg-black/30 rounded-lg p-1">
                  <SkinCanvasPreview skin={skin} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1e293b] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold font-game text-sm text-white transition-colors"
          >
            Select & Return
          </button>
        </div>
      </div>
    </div>
  );
};
