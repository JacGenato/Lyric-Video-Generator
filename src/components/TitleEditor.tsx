import React from 'react';
import { 
  Clapperboard, 
  Sparkles, 
  Play, 
  Clock, 
  Palette, 
  Type, 
  Sliders, 
  Check, 
  Eye, 
  Layers, 
  Film,
  Zap,
  Tag
} from 'lucide-react';
import { IntroTitleSettings, ProjectData } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface TitleEditorProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({
  project,
  setProject,
}) => {
  // Ensure introTitle defaults exist
  const intro: IntroTitleSettings = project.introTitle || {
    enabled: true,
    title: project.title || 'Untitled Track',
    artist: project.artist || '',
    subtitle: 'OFFICIAL LYRIC VIDEO',
    duration: 3.5,
    theme: 'cinematic',
    animation: 'fade',
    textColor: '#ffffff',
    accentColor: project.font.accentColor || '#f59e0b',
    fontSizeMultiplier: 1.0,
  };

  const updateIntro = (updates: Partial<IntroTitleSettings>) => {
    setProject(p => ({
      ...p,
      introTitle: {
        ...(p.introTitle || intro),
        ...updates,
      },
      // Keep project.title and project.artist in sync if edited here
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.artist !== undefined ? { artist: updates.artist } : {}),
    }));
  };

  const handlePreviewIntro = async () => {
    audioEngine.seek(0);
    await audioEngine.play();
  };

  const tagPresets = [
    'OFFICIAL LYRIC VIDEO',
    'OFFICIAL AUDIO',
    'ACOUSTIC COVER',
    'ORIGINAL SONG',
    '4K ULTRA HD',
    'LIVE STUDIO SESSION',
    'REMASTERED',
  ];

  const themeOptions: Array<{ id: IntroTitleSettings['theme']; label: string; desc: string; previewClass: string }> = [
    { 
      id: 'cinematic', 
      label: 'Cinematic Gold', 
      desc: 'Elegant display serif with golden divider and letterspacing',
      previewClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    },
    { 
      id: 'minimal', 
      label: 'Modern Glass', 
      desc: 'Clean minimal dark glass badge box with crisp contrast',
      previewClass: 'border-blue-500/40 bg-blue-500/10 text-blue-300'
    },
    { 
      id: 'neon', 
      label: 'Neon Pulse', 
      desc: 'Electric glowing aura with neon brackets',
      previewClass: 'border-pink-500/40 bg-pink-500/10 text-pink-300'
    },
    { 
      id: 'bold-center', 
      label: 'Impact Bold', 
      desc: 'Heavy tall typography with high impact stroke',
      previewClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300'
    },
    { 
      id: 'vintage', 
      label: 'Vintage Poetic', 
      desc: 'Romantic serif with starry filigree ornaments',
      previewClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    },
  ];

  const animationOptions: Array<{ id: IntroTitleSettings['animation']; label: string; desc: string }> = [
    { id: 'fade', label: 'Smooth Crossfade', desc: 'Soft cinematic dissolve in and out' },
    { id: 'zoom', label: 'Cinematic Zoom', desc: 'Slow subtle scale glide forward' },
    { id: 'slide-up', label: 'Slide Up', desc: 'Smooth upward glide from bottom' },
  ];

  const colorPresets = [
    '#f59e0b', // Amber Gold
    '#ec4899', // Hot Pink / Neon
    '#38bdf8', // Sky Blue
    '#10b981', // Emerald
    '#a855f7', // Vivid Purple
    '#ffffff', // Pure White
    '#fbbf24', // Yellow Glow
    '#f43f5e', // Rose Red
  ];

  return (
    <div className="bg-[#16161D] border border-white/10 rounded-xl p-4 flex flex-col gap-5 shadow-2xl h-full overflow-y-auto custom-scrollbar">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-white/90">Video Intro & Title Card</h3>
            <p className="text-[11px] text-white/40">Customize the opening title sequence for the video</p>
          </div>
        </div>

        {/* Master Toggle */}
        <label className="flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 hover:border-purple-500/40 transition-all">
          <input
            type="checkbox"
            checked={intro.enabled}
            onChange={(e) => updateIntro({ enabled: e.target.checked })}
            className="w-3.5 h-3.5 accent-purple-500 cursor-pointer rounded"
          />
          <span className="text-xs font-semibold text-white/90">
            {intro.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* Quick Play Intro Preview Button */}
      <button
        onClick={handlePreviewIntro}
        className="w-full py-2 px-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
      >
        <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
        <span>Preview Opening Title Card (Play from 0:00)</span>
      </button>

      {/* 1. Title Text Inputs */}
      <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
            <Type className="w-3 h-3 text-purple-400" />
            <span>Title Content</span>
          </label>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-white/70 block mb-1">
              Song / Video Title
            </label>
            <input
              type="text"
              value={intro.title}
              onChange={(e) => updateIntro({ title: e.target.value })}
              placeholder="e.g. Tanging Handog"
              className="w-full bg-black/40 border border-white/10 focus:border-purple-500 px-3 py-2 rounded-lg text-xs text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Artist / Vocalist
              </label>
              <input
                type="text"
                value={intro.artist}
                onChange={(e) => updateIntro({ artist: e.target.value })}
                placeholder="e.g. Acoustic Worship"
                className="w-full bg-black/40 border border-white/10 focus:border-purple-500 px-3 py-2 rounded-lg text-xs text-white placeholder:text-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Header Tag / Subtitle
              </label>
              <input
                type="text"
                value={intro.subtitle}
                onChange={(e) => updateIntro({ subtitle: e.target.value })}
                placeholder="e.g. OFFICIAL LYRIC VIDEO"
                className="w-full bg-black/40 border border-white/10 focus:border-purple-500 px-3 py-2 rounded-lg text-xs text-white placeholder:text-white/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Tag Presets Pills */}
          <div>
            <span className="text-[10px] text-white/40 font-medium block mb-1.5">Quick Subtitle Tags:</span>
            <div className="flex flex-wrap gap-1.5">
              {tagPresets.map((tag) => (
                <button
                  key={tag}
                  onClick={() => updateIntro({ subtitle: tag })}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    intro.subtitle === tag
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-200'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Intro Display Duration */}
      <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Title Duration on Screen</span>
          </label>
          <span className="font-mono text-xs text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
            {intro.duration} seconds
          </span>
        </div>

        <input
          type="range"
          min="1.0"
          max="8.0"
          step="0.5"
          value={intro.duration}
          onChange={(e) => updateIntro({ duration: parseFloat(e.target.value) })}
          className="w-full accent-purple-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-white/30 font-mono">
          <span>1.0s (Quick Flash)</span>
          <span>3.5s (Standard Intro)</span>
          <span>8.0s (Long Cinematic)</span>
        </div>
      </div>

      {/* 3. Title Theme / Layout Style */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Visual Theme & Layout</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {themeOptions.map((t) => (
            <button
              key={t.id}
              onClick={() => updateIntro({ theme: t.id })}
              className={`p-2.5 rounded-lg border text-left transition-all relative cursor-pointer ${
                intro.theme === t.id
                  ? 'bg-purple-500/20 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'bg-black/30 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{t.label}</span>
                {intro.theme === t.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Animation Entrance */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
          <Clapperboard className="w-3 h-3 text-purple-400" />
          <span>Entrance & Exit Motion</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {animationOptions.map((a) => (
            <button
              key={a.id}
              onClick={() => updateIntro({ animation: a.id })}
              className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                intro.animation === a.id
                  ? 'bg-purple-500/20 border-purple-500/80 text-purple-200'
                  : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold">{a.label}</div>
              <div className="text-[9px] text-white/40 truncate">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Colors & Typography Scale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
        {/* Accent Color */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block">
            Accent / Tag Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={intro.accentColor}
              onChange={(e) => updateIntro({ accentColor: e.target.value })}
              className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
            />
            <span className="font-mono text-xs text-white/70 uppercase">{intro.accentColor}</span>
          </div>
          {/* Quick colors */}
          <div className="flex flex-wrap gap-1">
            {colorPresets.map((c) => (
              <button
                key={c}
                onClick={() => updateIntro({ accentColor: c })}
                className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Font Size Multiplier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Title Size Scale
            </label>
            <span className="font-mono text-xs text-white/80 font-bold">
              {Math.round((intro.fontSizeMultiplier || 1.0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={intro.fontSizeMultiplier || 1.0}
            onChange={(e) => updateIntro({ fontSizeMultiplier: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/30 font-mono">
            <span>Compact</span>
            <span>Normal</span>
            <span>Massive</span>
          </div>
        </div>
      </div>
    </div>
  );
};
