import React from 'react';
import { 
  Type, 
  Sparkles, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Layers, 
  Activity, 
  Palette, 
  Sliders,
  Flame,
  Wand2
} from 'lucide-react';
import { EntryAnimation, ProjectData, TextAlignment, TextPosition, TextShadowStyle, VisualizerType } from '../types';
import { FONT_PRESETS } from '../utils/sampleData';

interface StyleAndEffectsProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

export const StyleAndEffects: React.FC<StyleAndEffectsProps> = ({
  project,
  setProject,
}) => {
  const { font, animation } = project;

  const updateFont = (updates: Partial<typeof font>) => {
    setProject(p => ({ ...p, font: { ...p.font, ...updates } }));
  };

  const updateAnim = (updates: Partial<typeof animation>) => {
    setProject(p => ({ ...p, animation: { ...p.animation, ...updates } }));
  };

  const animationOptions: Array<{ id: EntryAnimation; label: string; desc: string }> = [
    { id: 'fade', label: 'Smooth Fade', desc: 'Elegant crossfade in and out' },
    { id: 'pop', label: 'Kinetic Pop', desc: 'Bouncy energetic scale punch' },
    { id: 'slide-up', label: 'Slide Up', desc: 'Cinematic glide upwards' },
    { id: 'karaoke-wipe', label: 'Karaoke Wipe', desc: 'Smooth word fill highlight across line duration' },
    { id: 'neon-pulse', label: 'Neon Pulse', desc: 'Electric glow breathing effect' },
    { id: 'slide-down', label: 'Slide Down', desc: 'Soft drop entering motion' },
  ];

  const shadowStyles: Array<{ id: TextShadowStyle; label: string }> = [
    { id: 'soft', label: 'Soft Shadow' },
    { id: 'heavy', label: 'Heavy Shadow' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'neon', label: 'Neon Glow' },
    { id: 'none', label: 'None' },
  ];

  const visualizerOptions: Array<{ id: VisualizerType; label: string }> = [
    { id: 'none', label: 'Off' },
    { id: 'bars', label: 'Spectrum Bars' },
    { id: 'wave', label: 'Sine Wave' },
    { id: 'circle', label: 'Circular Pulse' },
    { id: 'mirror-spectrum', label: 'Mirror Spectrum' },
  ];

  const particleOptions = [
    { id: 'none', label: 'None' },
    { id: 'dust', label: 'Golden Dust' },
    { id: 'stars', label: 'Cosmic Stars' },
    { id: 'bokeh', label: 'Warm Bokeh' },
  ];

  return (
    <div className="bg-[#16161D] border border-white/10 rounded-xl p-4 flex flex-col gap-5 shadow-2xl h-full overflow-y-auto custom-scrollbar">
      {/* 1. Typography Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">Typography & Placement</h3>
            <p className="text-[11px] text-white/40">Choose fonts, scale, alignment and text styling</p>
          </div>
        </div>

        {/* Font Family Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
            Font Family
          </label>
          <select
            value={font.fontFamily}
            onChange={(e) => updateFont({ fontFamily: e.target.value })}
            className="w-full bg-black/40 border border-white/10 text-xs font-semibold text-white rounded-lg p-2.5 outline-none hover:border-white/20 transition-all cursor-pointer"
          >
            {FONT_PRESETS.map((f) => (
              <option key={f.value} value={f.value} className="bg-[#16161D] text-white">{f.label}</option>
            ))}
          </select>
        </div>

        {/* Grid for Size, Weight, Transform */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Font Size Scale */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium">Text Scale</span>
              <span className="font-mono text-purple-400 text-[11px] font-semibold">{Math.round(font.fontSizeRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.7}
              max={1.6}
              step={0.05}
              value={font.fontSizeRatio}
              onChange={(e) => updateFont({ fontSizeRatio: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Font Weight */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Font Weight</span>
            <div className="flex bg-black/40 p-0.5 rounded-md border border-white/10 text-[11px]">
              {(['normal', 'bold', '900'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => updateFont({ fontWeight: w })}
                  className={`flex-1 py-1 rounded font-semibold transition-all capitalize ${
                    font.fontWeight === w ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {w === '900' ? 'Black' : w}
                </button>
              ))}
            </div>
          </div>

          {/* Letter Case */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Text Transform</span>
            <div className="flex bg-black/40 p-0.5 rounded-md border border-white/10 text-[11px]">
              {(['none', 'uppercase', 'capitalize'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateFont({ textTransform: c })}
                  className={`flex-1 py-1 rounded font-semibold transition-all ${
                    font.textTransform === c ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {c === 'none' ? 'Normal' : c === 'uppercase' ? 'UPPER' : 'Title'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text Alignment & Vertical Position */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Alignment */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Alignment</span>
            <div className="flex bg-black/40 p-0.5 rounded-md border border-white/10 text-xs">
              <button
                onClick={() => updateFont({ alignment: 'left' })}
                className={`flex-1 py-1 rounded flex items-center justify-center transition-all ${
                  font.alignment === 'left' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
                title="Left Align"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateFont({ alignment: 'center' })}
                className={`flex-1 py-1 rounded flex items-center justify-center transition-all ${
                  font.alignment === 'center' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
                title="Center Align"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateFont({ alignment: 'right' })}
                className={`flex-1 py-1 rounded flex items-center justify-center transition-all ${
                  font.alignment === 'right' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
                title="Right Align"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Vertical Placement */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Screen Position</span>
            <div className="flex bg-black/40 p-0.5 rounded-md border border-white/10 text-[11px]">
              {(['top', 'middle', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateFont({ verticalPosition: pos })}
                  className={`flex-1 py-1 rounded font-semibold transition-all capitalize ${
                    font.verticalPosition === pos ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {pos === 'bottom' ? 'Lower 3rd' : pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors & Shadow Styles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Main Text Color */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Text Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={font.textColor}
                onChange={(e) => updateFont({ textColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="font-mono text-white text-xs">{font.textColor}</span>
            </div>
          </div>

          {/* Accent / Tag Color */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Accent / Tag Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={font.accentColor}
                onChange={(e) => updateFont({ accentColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="font-mono text-purple-400 text-xs">{font.accentColor}</span>
            </div>
          </div>

          {/* Shadow Preset */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1">
            <span className="text-white/70 font-medium text-xs block">Glow / Shadow</span>
            <select
              value={font.textShadow}
              onChange={(e) => updateFont({ textShadow: e.target.value as TextShadowStyle })}
              className="w-full bg-black/40 border border-white/10 text-xs font-semibold text-white rounded-lg p-1.5 outline-none cursor-pointer"
            >
              {shadowStyles.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#16161D] text-white">{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* 2. Kinetic Animation & Active Lyric Transitions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">Lyric Motion & Effects</h3>
            <p className="text-[11px] text-white/40">Select entry animation styles and lyric flow</p>
          </div>
        </div>

        {/* Animation Selection Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {animationOptions.map((opt) => {
            const isSelected = animation.entryEffect === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => updateAnim({ entryEffect: opt.id })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-500/20'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{opt.label}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Surrounding Context Lyrics Switch (Spotify / Apple Music style) */}
        <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white/90">Show Surrounding Lyrics Context</div>
            <p className="text-[11px] text-white/40">Displays previous and upcoming lines with dim opacity</p>
          </div>
          <button
            onClick={() => updateAnim({ showSurroundingLyrics: !animation.showSurroundingLyrics })}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              animation.showSurroundingLyrics ? 'bg-purple-600' : 'bg-white/10'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                animation.showSurroundingLyrics ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* 3. Audio Visualizer & Particle Atmosphere */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">Visualizer & Atmosphere</h3>
            <p className="text-[11px] text-white/40">Audio-reactive spectrum wave and particle system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Audio Visualizer Style */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <span className="text-white/70 font-medium text-xs block">Audio Visualizer</span>
            <select
              value={animation.audioVisualizer}
              onChange={(e) => updateAnim({ audioVisualizer: e.target.value as VisualizerType })}
              className="w-full bg-black/40 border border-white/10 text-xs font-semibold text-white rounded-lg p-1.5 outline-none cursor-pointer"
            >
              {visualizerOptions.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#16161D] text-white">{v.label}</option>
              ))}
            </select>
          </div>

          {/* Visualizer Color */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <span className="text-white/70 font-medium text-xs block">Visualizer Tint Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={animation.visualizerColor}
                onChange={(e) => updateAnim({ visualizerColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="font-mono text-purple-400 text-xs">{animation.visualizerColor}</span>
            </div>
          </div>

          {/* Particle Atmosphere */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5 sm:col-span-2">
            <span className="text-white/70 font-medium text-xs block">Floating Particle Dust</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {particleOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updateAnim({ particleOverlay: p.id as any })}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold border transition-all ${
                    animation.particleOverlay === p.id
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-black/40 text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
