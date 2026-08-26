import React, { useState, useRef } from 'react';
import { 
  X, 
  Video, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  FileText, 
  Film,
  Play,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProjectData } from '../types';
import { renderAndExportVideo, RenderProgress } from '../utils/videoRenderer';
import { exportToLrc, exportToSrt, formatTime } from '../utils/lrcParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedBlobType, setExportedBlobType] = useState<string>('video/webm');
  const [selectedResolution, setSelectedResolution] = useState<'1080p' | '720p'>('720p');
  const [exportRange, setExportRange] = useState<'full' | '15s' | '30s'>('full');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cancelSignalRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  if (!isOpen) return null;

  const totalAudioDuration = project.audio.duration || 38;
  const effectiveExportDuration = 
    exportRange === '15s' 
      ? Math.min(15, totalAudioDuration) 
      : exportRange === '30s' 
        ? Math.min(30, totalAudioDuration) 
        : totalAudioDuration;

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportedVideoUrl(null);
    cancelSignalRef.current = { cancelled: false };

    // Calculate dimensions
    let width = 1280;
    let height = 720;

    if (project.aspectRatio === '9:16') {
      width = selectedResolution === '1080p' ? 1080 : 720;
      height = selectedResolution === '1080p' ? 1920 : 1280;
    } else if (project.aspectRatio === '1:1') {
      width = selectedResolution === '1080p' ? 1080 : 720;
      height = selectedResolution === '1080p' ? 1080 : 720;
    } else {
      // 16:9
      width = selectedResolution === '1080p' ? 1920 : 1280;
      height = selectedResolution === '1080p' ? 1080 : 720;
    }

    try {
      const blob = await renderAndExportVideo(
        project,
        width,
        height,
        (progress) => {
          setRenderProgress(progress);
        },
        cancelSignalRef.current,
        effectiveExportDuration
      );

      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
      setExportedBlobType(blob.type || 'video/webm');
      setIsExporting(false);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      if (cancelSignalRef.current.cancelled) {
        setIsExporting(false);
      } else {
        setErrorMsg(err?.message || 'Export failed during rendering. Please try 720p or a shorter clip.');
        setIsExporting(false);
      }
    }
  };

  const handleCancelExport = () => {
    cancelSignalRef.current.cancelled = true;
    setIsExporting(false);
  };

  const handleDownloadVideo = () => {
    if (!exportedVideoUrl) return;
    const a = document.createElement('a');
    a.href = exportedVideoUrl;
    const isMp4 = exportedBlobType.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const safeTitle = (project.title || 'lyric_video').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeTitle}_${project.aspectRatio.replace(':', '_')}.${ext}`;
    a.click();
  };

  const handleDownloadLrc = () => {
    const lrc = exportToLrc(project.lyrics, project.title, project.artist);
    const blob = new Blob([lrc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'lyrics'}.lrc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    const srt = exportToSrt(project.lyrics);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'lyrics'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#16161D] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0F0F12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-tight">Export Lyric Video</h2>
              <p className="text-[11px] text-white/40">Render synchronized video with animated typography</p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* State 1: Configuration & Ready to export */}
          {!isExporting && !exportedVideoUrl && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">Aspect Ratio</span>
                  <span className="text-xs font-bold text-white/90">{project.aspectRatio}</span>
                </div>
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">Render Length</span>
                  <span className="text-xs font-bold text-purple-400 font-mono">
                    {formatTime(effectiveExportDuration, false)}
                  </span>
                </div>
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">Lyrics</span>
                  <span className="text-xs font-bold text-emerald-400">{project.lyrics.length} Lines</span>
                </div>
              </div>

              {/* Clip Length Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 block">Export Length</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setExportRange('full')}
                    className={`py-2 px-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                      exportRange === 'full'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Full Song ({formatTime(totalAudioDuration, false)})
                  </button>
                  <button
                    onClick={() => setExportRange('15s')}
                    className={`py-2 px-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                      exportRange === '15s'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    ⚡ Quick 15s Short
                  </button>
                  <button
                    onClick={() => setExportRange('30s')}
                    className={`py-2 px-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                      exportRange === '30s'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    30s Teaser
                  </button>
                </div>
              </div>

              {/* Resolution Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 block">Output Quality & Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedResolution('720p')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedResolution === '720p'
                        ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-500/20'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>720p HD</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">Recommended</span>
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">Super smooth render & optimal file size</p>
                  </button>

                  <button
                    onClick={() => setSelectedResolution('1080p')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedResolution === '1080p'
                        ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-500/20'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>1080p Full HD</span>
                      <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-mono">Cinema</span>
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">Maximum resolution for YouTube & big screens</p>
                  </button>
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white/50 leading-relaxed">
                🚀 The video will render with your chosen kinetic typography, reactive audio visualizer, and synchronized background.
              </div>
            </div>
          )}

          {/* State 2: Live Export in Progress */}
          {isExporting && (
            <div className="space-y-4 py-4 text-center animate-in fade-in">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <span className="absolute font-mono text-xs font-bold text-white">
                  {Math.round((renderProgress?.progress || 0) * 100)}%
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  {renderProgress?.status === 'encoding' ? 'Finalizing & Packing Video File...' : 'Rendering Lyric Video Frames...'}
                </h3>
                <p className="text-xs text-white/40 mt-1 font-mono">
                  {formatTime(renderProgress?.currentTime || 0, true)} / {formatTime(renderProgress?.totalDuration || effectiveExportDuration, true)}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                  style={{ width: `${Math.max(6, Math.min(100, (renderProgress?.progress || 0) * 100))}%` }}
                />
              </div>

              <button
                onClick={handleCancelExport}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-950/40 transition-all cursor-pointer"
              >
                Cancel Render
              </button>
            </div>
          )}

          {/* State 3: Completed with Download */}
          {!isExporting && exportedVideoUrl && (
            <div className="space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Lyric Video Ready!</h3>
                <p className="text-xs text-white/40 mt-1">Your video was successfully generated with audio and synchronized kinetic lyrics.</p>
              </div>

              {/* Video Preview Player */}
              <div className="rounded-lg overflow-hidden border border-white/10 bg-black aspect-video max-h-48 mx-auto">
                <video 
                  src={exportedVideoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Download Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  id="btn-download-video-file"
                  onClick={handleDownloadVideo}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 rounded-lg shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video ({exportedBlobType.includes('mp4') ? '.mp4' : '.webm'})</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadLrc}
                    className="bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold py-2 rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download .LRC</span>
                  </button>
                  <button
                    onClick={handleDownloadSrt}
                    className="bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold py-2 rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Download .SRT</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isExporting && !exportedVideoUrl && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#0F0F12] flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white font-medium px-3 py-1.5 cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-start-render"
              onClick={handleStartExport}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Start Video Render</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
