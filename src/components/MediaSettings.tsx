import React, { useRef } from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Video, 
  Upload, 
  Sliders, 
  Sparkles, 
  Sun, 
  Layers, 
  Check, 
  Eye, 
  Volume2, 
  FileAudio,
  Palette
} from 'lucide-react';
import { ProjectData } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { BACKGROUND_PRESETS } from '../utils/sampleData';

interface MediaSettingsProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

export const MediaSettings: React.FC<MediaSettingsProps> = ({
  project,
  setProject,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Handle Audio File Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    try {
      const duration = await audioEngine.loadAudioUrl(url);
      setProject(p => ({
        ...p,
        audio: {
          fileUrl: url,
          fileName: file.name,
          duration: Math.ceil(duration) || 30,
        },
      }));
    } catch (err) {
      alert('Could not load audio file. Please ensure it is a valid MP3, WAV, or AAC file.');
    }
    e.target.value = '';
  };

  // Handle Background Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setProject(p => ({
      ...p,
      background: {
        ...p.background,
        type: 'image',
        url,
        videoUrl: null,
        presetId: undefined,
      },
    }));
    e.target.value = '';
  };

  // Handle Background Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setProject(p => ({
      ...p,
      background: {
        ...p.background,
        type: 'video',
        url: null,
        videoUrl: url,
        presetId: undefined,
      },
    }));
    e.target.value = '';
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = BACKGROUND_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    if (preset.type === 'gradient') {
      setProject(p => ({
        ...p,
        background: {
          ...p.background,
          type: 'gradient',
          url: null,
          videoUrl: null,
          gradientPreset: preset.name,
          brightness: preset.defaultBrightness,
        },
      }));
    } else {
      setProject(p => ({
        ...p,
        background: {
          ...p.background,
          type: 'image',
          url: preset.url,
          videoUrl: null,
          presetId: preset.id,
          brightness: preset.defaultBrightness,
        },
      }));
    }
  };

  const handleSelectSampleTrack = (type: 'acoustic' | 'synthwave' | 'chill') => {
    const names = {
      acoustic: 'Acoustic_Instrumental_Hymn.mp3',
      synthwave: 'Midnight_Echoes_Beat.mp3',
      chill: 'Golden_Hour_Chills.mp3',
    };
    audioEngine.loadSampleTrack(type, 38);
    setProject(p => ({
      ...p,
      audio: {
        fileUrl: null,
        fileName: names[type],
        duration: 38,
      },
    }));
  };

  return (
    <div className="bg-[#16161D] border border-white/10 rounded-xl p-4 flex flex-col gap-5 shadow-2xl h-full overflow-y-auto custom-scrollbar">
      {/* 1. Audio Track Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <FileAudio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">Audio Track</h3>
              <p className="text-[11px] text-white/40">Upload MP3, WAV or choose a sample track</p>
            </div>
          </div>

          <button
            id="btn-upload-audio-file"
            onClick={() => audioInputRef.current?.click()}
            className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-md border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Upload Audio File</span>
          </button>
          <input
            type="file"
            ref={audioInputRef}
            onChange={handleAudioUpload}
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
            className="hidden"
          />
        </div>

        {/* Audio Track Status Card */}
        <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white/90 truncate max-w-[200px] sm:max-w-xs">
                {project.audio.fileName || 'Sample Audio Active'}
              </div>
              <div className="text-[10px] text-white/40 font-mono">
                Duration: {project.audio.duration ? `${project.audio.duration}s` : 'Auto'}
              </div>
            </div>
          </div>

          {/* Quick switch sample synth tracks */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSelectSampleTrack('acoustic')}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
              title="Acoustic Hymn Track"
            >
              Acoustic
            </button>
            <button
              onClick={() => handleSelectSampleTrack('synthwave')}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
              title="Synthwave Track"
            >
              Synthwave
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* 2. Background Media (Image / Video / Presets) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">Background Media</h3>
              <p className="text-[11px] text-white/40">Upload Image, Video or select high-res presets</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-upload-bg-image"
              onClick={() => imageInputRef.current?.click()}
              className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Image</span>
            </button>
            <button
              id="btn-upload-bg-video"
              onClick={() => videoInputRef.current?.click()}
              className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>Video</span>
            </button>
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              accept="image/*,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleVideoUpload}
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              accept="video/*,.mp4,.webm"
              className="hidden"
            />
          </div>
        </div>

        {/* Curated Preset Backgrounds Grid */}
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">
            Curated Visual Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = project.background.presetId === preset.id || (preset.type === 'gradient' && project.background.gradientPreset === preset.name);

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`relative group rounded-lg overflow-hidden aspect-video border transition-all text-left ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'border-white/10 hover:border-white/25 opacity-75 hover:opacity-100'
                  }`}
                >
                  {preset.type === 'gradient' ? (
                    <div 
                      className="w-full h-full"
                      style={{ background: preset.gradientCss }}
                    />
                  ) : (
                    <img
                      src={preset.previewUrl}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-1.5 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-white leading-tight truncate">
                      {preset.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* 3. Background Controls: Fit, Brightness, Blur, Vignette, Overlay */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-widest text-white/80 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          Background Optics & Adjustments
        </h3>

        {/* Fit mode selector */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70 font-medium">Background Fit</span>
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setProject(p => ({ ...p, background: { ...p.background, fit: 'cover' } }))}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                project.background.fit === 'cover' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Cover (Fill)
            </button>
            <button
              onClick={() => setProject(p => ({ ...p, background: { ...p.background, fit: 'contain' } }))}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                project.background.fit === 'contain' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Contain (Pillars)
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Brightness / Dim */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Brightness (Dimming)
              </span>
              <span className="font-mono text-purple-400 text-[11px] font-semibold">{project.background.brightness}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              value={project.background.brightness}
              onChange={(e) => setProject(p => ({ ...p, background: { ...p.background, brightness: parseInt(e.target.value) } }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Dark (Text Focus)</span>
              <span>Bright</span>
            </div>
          </div>

          {/* Blur Depth */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                Cinematic Blur
              </span>
              <span className="font-mono text-purple-400 text-[11px] font-semibold">{project.background.blur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={project.background.blur}
              onChange={(e) => setProject(p => ({ ...p, background: { ...p.background, blur: parseInt(e.target.value) } }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Crisp</span>
              <span>Heavy Blur</span>
            </div>
          </div>

          {/* Vignette Shadow */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Vignette Edges
              </span>
              <span className="font-mono text-purple-400 text-[11px] font-semibold">{project.background.vignette}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={project.background.vignette}
              onChange={(e) => setProject(p => ({ ...p, background: { ...p.background, vignette: parseInt(e.target.value) } }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Color Tint Overlay */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                Overlay Tint & Opacity
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={project.background.overlayColor}
                  onChange={(e) => setProject(p => ({ ...p, background: { ...p.background, overlayColor: e.target.value } }))}
                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-purple-400 text-[11px] font-semibold">{project.background.overlayOpacity}%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              value={project.background.overlayOpacity}
              onChange={(e) => setProject(p => ({ ...p, background: { ...p.background, overlayOpacity: parseInt(e.target.value) } }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
