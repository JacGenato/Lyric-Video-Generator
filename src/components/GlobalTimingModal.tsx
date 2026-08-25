import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Clock, 
  ArrowLeftRight, 
  RotateCcw, 
  Check, 
  X, 
  FastForward, 
  Rewind, 
  Sparkles,
  Layers,
  Wand2
} from 'lucide-react';
import { LyricItem, ProjectData } from '../types';
import { sanitizeLyricTimes } from '../utils/lrcParser';

interface GlobalTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  activeLyricIndex: number;
}

export const GlobalTimingModal: React.FC<GlobalTimingModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  activeLyricIndex,
}) => {
  const [shiftAmount, setShiftAmount] = useState<number>(0.5);
  const [shiftDirection, setShiftDirection] = useState<'forward' | 'backward'>('forward');
  const [shiftScope, setShiftScope] = useState<'all' | 'from_active'>('all');
  
  const [stretchFactor, setStretchFactor] = useState<number>(100); // 100% = normal
  const [uniformDuration, setUniformDuration] = useState<number>(3.5);
  const [uniformGap, setUniformGap] = useState<number>(0.5);

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // 1. Shift Timings
  const handleApplyShift = (customDelta?: number) => {
    const deltaVal = customDelta !== undefined ? customDelta : (shiftDirection === 'forward' ? shiftAmount : -shiftAmount);
    const startIndex = shiftScope === 'from_active' ? activeLyricIndex : 0;

    setProject((prev) => {
      const updated = prev.lyrics.map((item, idx) => {
        if (idx >= startIndex) {
          const newStart = Math.max(0, parseFloat((item.startTime + deltaVal).toFixed(2)));
          const duration = item.endTime - item.startTime;
          const newEnd = Math.max(newStart + 0.5, parseFloat((newStart + duration).toFixed(2)));
          return {
            ...item,
            startTime: newStart,
            endTime: newEnd,
          };
        }
        return item;
      });

      return {
        ...prev,
        lyrics: sanitizeLyricTimes(updated),
      };
    });

    showToast(`Shifted ${shiftScope === 'all' ? 'all' : 'subsequent'} lyrics by ${deltaVal > 0 ? `+${deltaVal}` : deltaVal}s`);
  };

  // 2. Scale / Stretch Timings (Tempo Match)
  const handleApplyStretch = (factorPct: number) => {
    const ratio = factorPct / 100;
    if (ratio <= 0) return;

    setProject((prev) => {
      if (prev.lyrics.length === 0) return prev;
      const firstStart = prev.lyrics[0].startTime;

      const updated = prev.lyrics.map((item) => {
        const relativeStart = item.startTime - firstStart;
        const relativeEnd = item.endTime - firstStart;

        const newStart = parseFloat((firstStart + relativeStart * ratio).toFixed(2));
        const newEnd = parseFloat((firstStart + relativeEnd * ratio).toFixed(2));

        return {
          ...item,
          startTime: Math.max(0, newStart),
          endTime: Math.max(newStart + 0.5, newEnd),
        };
      });

      return {
        ...prev,
        lyrics: sanitizeLyricTimes(updated),
      };
    });

    showToast(`Scaled timings to ${factorPct}% speed`);
  };

  // 3. Set Uniform Line Durations
  const handleApplyUniformDuration = () => {
    setProject((prev) => {
      if (prev.lyrics.length === 0) return prev;
      let curr = prev.lyrics[0].startTime;

      const updated = prev.lyrics.map((item) => {
        const start = curr;
        const end = parseFloat((start + uniformDuration).toFixed(2));
        curr = parseFloat((end + uniformGap).toFixed(2));

        return {
          ...item,
          startTime: start,
          endTime: end,
        };
      });

      return {
        ...prev,
        lyrics: sanitizeLyricTimes(updated),
      };
    });

    showToast(`Applied uniform duration (${uniformDuration}s + ${uniformGap}s gap)`);
  };

  // 4. Auto-Distribute Evenly across song duration
  const handleAutoDistribute = () => {
    const totalDuration = project.audio.duration || 35;
    if (project.lyrics.length === 0) return;

    const interval = totalDuration / (project.lyrics.length + 0.5);
    const updated = project.lyrics.map((item, idx) => ({
      ...item,
      startTime: parseFloat((idx * interval + 1.0).toFixed(2)),
      endTime: parseFloat(((idx + 1) * interval + 0.6).toFixed(2)),
    }));

    setProject((prev) => ({
      ...prev,
      lyrics: sanitizeLyricTimes(updated),
    }));

    showToast('Auto-distributed all lyric lines evenly across song');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#16161D] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0F0F12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Global Timing Adjuster</h2>
              <p className="text-[11px] text-white/40">Batch shift, tempo scale, and sync calibration across all lyrics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-purple-500/20 border-b border-purple-500/30 px-4 py-2 text-xs font-semibold text-purple-200 animate-in fade-in">
            ✓ {feedback}
          </div>
        )}

        {/* Body Controls */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Section 1: Batch Timing Shift (Offset) */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
                <span>Batch Timing Offset (Shift Earlier / Later)</span>
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {shiftScope === 'all' ? `All (${project.lyrics.length} lines)` : `From Line ${activeLyricIndex + 1}`}
              </span>
            </div>

            <p className="text-[11px] text-white/50">
              Shift timestamps when audio starts earlier or has an intro offset.
            </p>

            {/* Scope Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer">
                <input
                  type="radio"
                  name="shiftScope"
                  checked={shiftScope === 'all'}
                  onChange={() => setShiftScope('all')}
                  className="accent-purple-500"
                />
                <span>All Lyrics</span>
              </label>
              <label className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer ml-3">
                <input
                  type="radio"
                  name="shiftScope"
                  checked={shiftScope === 'from_active'}
                  onChange={() => setShiftScope('from_active')}
                  className="accent-purple-500"
                />
                <span>From Line {activeLyricIndex + 1} to End</span>
              </label>
            </div>

            {/* Quick Shift Presets */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => handleApplyShift(-1.0)}
                className="py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs font-mono text-white/80 hover:text-white"
              >
                -1.0s (Earlier)
              </button>
              <button
                onClick={() => handleApplyShift(-0.5)}
                className="py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs font-mono text-white/80 hover:text-white"
              >
                -0.5s
              </button>
              <button
                onClick={() => handleApplyShift(-0.1)}
                className="py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs font-mono text-white/80 hover:text-white"
              >
                -0.1s
              </button>
              <button
                onClick={() => handleApplyShift(0.1)}
                className="py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-xs font-mono text-purple-300"
              >
                +0.1s
              </button>
              <button
                onClick={() => handleApplyShift(0.5)}
                className="py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-xs font-mono text-purple-300"
              >
                +0.5s
              </button>
              <button
                onClick={() => handleApplyShift(1.0)}
                className="py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-xs font-mono text-purple-300"
              >
                +1.0s (Later)
              </button>
              <button
                onClick={() => handleApplyShift(2.0)}
                className="py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-xs font-mono text-purple-300"
              >
                +2.0s
              </button>
              <button
                onClick={() => handleApplyShift(5.0)}
                className="py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-xs font-mono text-purple-300"
              >
                +5.0s
              </button>
            </div>
          </div>

          {/* Section 2: Tempo / Stretch Scaling */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tempo Scaling (Speed Up / Slow Down All Timings)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {stretchFactor}%
              </span>
            </div>

            <p className="text-[11px] text-white/50">
              Proportionally scale all timestamp durations to match audio speed changes.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={120}
                step={1}
                value={stretchFactor}
                onChange={(e) => setStretchFactor(parseInt(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
              <button
                onClick={() => handleApplyStretch(stretchFactor)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-all"
              >
                Apply {stretchFactor}%
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[90, 95, 100, 105, 110].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setStretchFactor(pct);
                    handleApplyStretch(pct);
                  }}
                  className={`flex-1 py-1 rounded text-[11px] font-mono border transition-all ${
                    stretchFactor === pct
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Smart Auto Distribution */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Auto-Distribute & Uniform Layout</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleAutoDistribute}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-all group cursor-pointer"
              >
                <span className="font-bold text-xs text-white group-hover:text-purple-300 block">
                  Distribute Across Audio
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5">
                  Evenly spaces all {project.lyrics.length} lines across {project.audio.duration || 35}s duration
                </span>
              </button>

              <button
                onClick={handleApplyUniformDuration}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-all group cursor-pointer"
              >
                <span className="font-bold text-xs text-white group-hover:text-purple-300 block">
                  Set Uniform Durations (3.5s)
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5">
                  Sets each line duration to 3.5s with 0.5s natural spacing
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-white/10 bg-[#0F0F12]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-md shadow-lg transition-all cursor-pointer"
          >
            Done Adjusting
          </button>
        </div>
      </div>
    </div>
  );
};
