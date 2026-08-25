import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward, 
  Zap, 
  Sparkles,
  Gauge
} from 'lucide-react';
import { ProjectData } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { formatTime } from '../utils/lrcParser';
import { drawLyricFrame } from '../utils/videoRenderer';

interface StagePreviewProps {
  project: ProjectData;
  setProject?: React.Dispatch<React.SetStateAction<ProjectData>>;
  onStampActiveLyric: () => void;
  activeLyricIndex: number;
  totalLyrics: number;
}

export const StagePreview: React.FC<StagePreviewProps> = ({
  project,
  setProject,
  onStampActiveLyric,
  activeLyricIndex,
  totalLyrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(38);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgMediaElement, setBgMediaElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);

  const particlesRef = useRef<Array<{ x: number; y: number; size: number; speedY: number; opacity: number }>>([]);

  // Initialize particle system
  useEffect(() => {
    const pts: Array<{ x: number; y: number; size: number; speedY: number; opacity: number }> = [];
    for (let i = 0; i < 40; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 4 + 1.2,
        speedY: (Math.random() * 0.001) + 0.0006,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
    particlesRef.current = pts;
  }, [project.animation.particleOverlay]);

  // Load background image or video
  useEffect(() => {
    if (project.background.type === 'image' && project.background.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = project.background.url;
      img.onload = () => setBgMediaElement(img);
      img.onerror = () => setBgMediaElement(null);
    } else if (project.background.type === 'video' && project.background.videoUrl) {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.src = project.background.videoUrl;
      vid.loop = true;
      vid.muted = true;
      vid.play().catch(() => {});
      setBgMediaElement(vid);
    } else {
      setBgMediaElement(null);
    }
  }, [project.background.type, project.background.url, project.background.videoUrl]);

  // Sync audio engine listeners
  useEffect(() => {
    const unsubscribeTime = audioEngine.onTimeUpdate((t) => {
      setCurrentTime(t);
    });

    const unsubscribeEnd = audioEngine.onEnded(() => {
      setIsPlaying(false);
    });

    // If project duration is defined
    if (project.audio.duration) {
      setDuration(project.audio.duration);
    }

    return () => {
      unsubscribeTime();
      unsubscribeEnd();
    };
  }, [project.audio.duration]);

  // Animation Frame rendering loop on Canvas
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Update particles
          for (const p of particlesRef.current) {
            p.y -= p.speedY;
            if (p.y < 0) p.y = 1;
          }

          const freqData = audioEngine.getFrequencyData();
          const currT = audioEngine.getCurrentTime();

          drawLyricFrame(
            ctx,
            canvas.width,
            canvas.height,
            currT,
            project,
            bgMediaElement,
            freqData,
            particlesRef.current
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [project, bgMediaElement]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    audioEngine.seek(targetTime);
  };

  const handleSkip = (seconds: number) => {
    const newT = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newT);
    audioEngine.seek(newT);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    audioEngine.setVolume(v);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 0.85);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    audioEngine.setPlaybackRate(rate);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Determine stage dimensions & CSS aspect ratio
  const getAspectRatioClasses = () => {
    switch (project.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[560px] w-auto mx-auto';
      case '1:1':
        return 'aspect-square max-h-[500px] w-auto mx-auto';
      case '16:9':
      default:
        return 'aspect-video w-full max-h-[460px]';
    }
  };

  // Canvas internal buffer resolution
  const canvasWidth = project.aspectRatio === '9:16' ? 1080 : project.aspectRatio === '1:1' ? 1080 : 1920;
  const canvasHeight = project.aspectRatio === '9:16' ? 1920 : project.aspectRatio === '1:1' ? 1080 : 1080;

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col bg-[#16161D] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#0F0F12] flex flex-col justify-center' : ''
      }`}
    >
      {/* Top Bar of Stage */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#16161D] border-b border-white/10 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span className="text-[11px] font-semibold tracking-wide">Live Stage Preview</span>
          </div>
          <span className="text-white/40 font-mono text-[11px] hidden sm:inline uppercase">
            {project.aspectRatio} • {project.resolution}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Lyric Counter Indicator */}
          {totalLyrics > 0 && (
            <div className="px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-semibold">
              Line {Math.min(totalLyrics, activeLyricIndex + 1)} / {totalLyrics}
            </div>
          )}

          <button
            id="btn-fullscreen-toggle"
            onClick={handleToggleFullscreen}
            className="p-1.5 text-white/60 hover:text-white rounded-md hover:bg-white/5 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Stage'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div className="relative flex-1 bg-[#09090B] flex items-center justify-center p-4 sm:p-6 overflow-hidden min-h-[300px]">
        <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-black group ${getAspectRatioClasses()}`}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleTogglePlay}
          />

          {/* Floating artistic status pill overlay */}
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 pointer-events-none transition-opacity group-hover:opacity-100 opacity-80">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/40'}`} />
            <span className="text-[11px] font-mono tracking-tight text-white/90">
              {formatTime(currentTime, true)} / {formatTime(duration, true)}
            </span>
          </div>

          {/* Overlay Stamp Beat Indicator for Quick Interactive Feedback */}
          <button
            id="btn-stage-stamp-overlay"
            onClick={(e) => {
              e.stopPropagation();
              onStampActiveLyric();
            }}
            className="absolute bottom-3 right-3 z-20 group bg-black/60 hover:bg-purple-600 border border-white/15 hover:border-purple-400 text-white px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            title="Press Space or Click to sync the active lyric line to current playback time"
          >
            <div className="w-5 h-5 rounded bg-purple-500 group-hover:bg-white text-black group-hover:text-purple-600 flex items-center justify-center font-bold text-[11px]">
              ⎵
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-wider leading-none text-purple-300 group-hover:text-white">
                Stamp Beat
              </div>
              <div className="text-[9px] text-white/50 group-hover:text-purple-100 font-mono">
                Line {activeLyricIndex + 1}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Audio Waveform & Control Dashboard Bar */}
      <div className="p-4 bg-[#16161D] border-t border-white/10 flex flex-col gap-3">
        {/* Waveform Header & Zoom Info */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Timeline / Audio Waveform
          </span>
          <div className="flex items-center gap-2 text-white/40 font-mono text-[10px]">
            <span>{Math.round((currentTime / (duration || 1)) * 100)}%</span>
            <span className="text-white/20">•</span>
            <span>{playbackRate}x speed</span>
          </div>
        </div>

        {/* Audio Waveform Visual Representation */}
        <div className="relative h-12 bg-black/30 rounded-lg border border-white/5 overflow-hidden flex items-center px-2 group cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const ratio = clickX / rect.width;
          const targetTime = ratio * (duration || 100);
          setCurrentTime(targetTime);
          audioEngine.seek(targetTime);
        }}>
          {/* Waveform Bars Background */}
          <div className="absolute inset-0 flex items-center justify-between px-3 opacity-25 group-hover:opacity-40 transition-opacity">
            {[40, 65, 30, 80, 50, 90, 35, 75, 55, 85, 45, 95, 60, 40, 70, 85, 30, 90, 60, 45, 80, 65, 35, 95, 50, 75, 40, 85, 60, 30].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-white transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* All Lyric Markers on Timeline */}
          {project.lyrics.map((l, idx) => {
            const leftPct = Math.max(0, Math.min(100, (l.startTime / (duration || 1)) * 100));
            const isTarget = idx === activeLyricIndex;
            return (
              <div
                key={l.id}
                className={`absolute top-0 bottom-0 pointer-events-none transition-all ${
                  isTarget ? 'w-0.5 bg-purple-400 z-10' : 'w-px bg-white/20'
                }`}
                style={{ left: `${leftPct}%` }}
              />
            );
          })}

          {/* Active Lyric Section Span Indicator */}
          {project.lyrics[activeLyricIndex] && (
            <div
              className="absolute top-0 bottom-0 bg-purple-500/20 border-x border-purple-500/60 transition-all pointer-events-none"
              style={{
                left: `${Math.max(0, (project.lyrics[activeLyricIndex].startTime / (duration || 1)) * 100)}%`,
                width: `${Math.max(1.5, (((project.lyrics[activeLyricIndex].endTime - project.lyrics[activeLyricIndex].startTime) / (duration || 1)) * 100))}%`,
              }}
            >
              <span className="absolute top-1 left-1 text-[9px] font-mono text-purple-300 font-bold uppercase truncate max-w-[90px] bg-black/60 px-1 rounded">
                Line {activeLyricIndex + 1}
              </span>
            </div>
          )}

          {/* Playhead scrub indicator with purple glow */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] z-10 pointer-events-none transition-all"
            style={{ left: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
          />

          {/* Real Timeline input slider overlaid for seamless drag */}
          <input
            id="timeline-scrubber"
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
          />
        </div>

        {/* Timeline Scrub Bar Time Labels & Quick Timing Snap Toolbar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 px-1">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-semibold">{formatTime(currentTime, true)}</span>
            {project.lyrics[activeLyricIndex] && (
              <span className="text-white/30 hidden sm:inline">
                • Target: {formatTime(project.lyrics[activeLyricIndex].startTime, true)} - {formatTime(project.lyrics[activeLyricIndex].endTime, true)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {setProject && project.lyrics[activeLyricIndex] && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const curr = parseFloat(audioEngine.getCurrentTime().toFixed(2));
                    setProject(prev => ({
                      ...prev,
                      lyrics: prev.lyrics.map((l, i) => i === activeLyricIndex ? { ...l, startTime: curr } : l)
                    }));
                  }}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-purple-600 text-[10px] text-purple-300 hover:text-white border border-white/10 font-mono transition-all"
                  title="Snap active line start time to playhead"
                >
                  In=Now
                </button>
                <button
                  onClick={() => {
                    const curr = parseFloat(audioEngine.getCurrentTime().toFixed(2));
                    setProject(prev => ({
                      ...prev,
                      lyrics: prev.lyrics.map((l, i) => i === activeLyricIndex ? { ...l, endTime: Math.max(l.startTime + 0.5, curr) } : l)
                    }));
                  }}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-purple-600 text-[10px] text-purple-300 hover:text-white border border-white/10 font-mono transition-all"
                  title="Snap active line end time to playhead"
                >
                  Out=Now
                </button>
              </div>
            )}
            <span>{formatTime(duration, true)}</span>
          </div>
        </div>

        {/* Playback Controls & Utility Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/5">
          {/* Left: Play/Pause/Skips */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-stage-skip-back"
              onClick={() => handleSkip(-5)}
              className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-95"
              title="Rewind 5s"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="btn-stage-toggle-play"
              onClick={handleTogglePlay}
              className="p-2.5 px-4 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              id="btn-stage-skip-forward"
              onClick={() => handleSkip(5)}
              className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-95"
              title="Skip 5s"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              id="btn-stage-replay-zero"
              onClick={() => {
                audioEngine.seek(0);
                setCurrentTime(0);
              }}
              className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/5 transition-all"
              title="Replay from start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Playback Speed Selector */}
          <div className="flex items-center bg-black/40 rounded-md p-0.5 border border-white/10 text-[11px]">
            {[0.5, 0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-0.5 rounded font-semibold transition-all ${
                  playbackRate === rate
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
                title={`Playback Speed: ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Right: Volume */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              <button
                onClick={handleToggleMute}
                className="text-white/60 hover:text-white transition-all p-0.5"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
              </button>
              <input
                id="volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
