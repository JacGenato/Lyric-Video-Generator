import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Play, 
  Sparkles, 
  Layers, 
  Edit3, 
  Wand2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Tag,
  Copy,
  SlidersHorizontal,
  FileText,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { LyricItem, ProjectData } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { formatTime, parseLyricsText, sanitizeLyricTimes } from '../utils/lrcParser';

interface LyricsEditorProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  activeLyricIndex: number;
  setActiveLyricIndex: (index: number) => void;
  onStampActiveLyric: () => void;
}

export const LyricsEditor: React.FC<LyricsEditorProps> = ({
  project,
  setProject,
  activeLyricIndex,
  setActiveLyricIndex,
  onStampActiveLyric,
}) => {
  const [editorMode, setEditorMode] = useState<'interactive' | 'bulk'>('interactive');
  const [bulkText, setBulkText] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);

  // When switching to bulk edit mode, load existing lyrics as text
  useEffect(() => {
    if (editorMode === 'bulk') {
      const formatted = project.lyrics
        .map(item => {
          const sectionPrefix = item.section ? `[${item.section}]\n` : '';
          return `${sectionPrefix}${item.text}`;
        })
        .join('\n');
      setBulkText(formatted);
    }
  }, [editorMode, project.lyrics]);

  // Scroll active lyric into view
  useEffect(() => {
    if (listRef.current && activeLyricIndex >= 0) {
      const activeElem = listRef.current.querySelector(`[data-lyric-index="${activeLyricIndex}"]`);
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeLyricIndex]);

  // Handle parsing bulk pasted text into items
  const handleApplyBulkText = () => {
    if (!bulkText.trim()) return;
    const parsed = parseLyricsText(bulkText, 3.5);
    setProject(p => ({
      ...p,
      lyrics: parsed,
    }));
    setEditorMode('interactive');
  };

  const handleUpdateLine = (id: string, updates: Partial<LyricItem>) => {
    setProject(p => ({
      ...p,
      lyrics: p.lyrics.map(item => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const handleAdjustTime = (id: string, field: 'startTime' | 'endTime', delta: number) => {
    setProject(p => ({
      ...p,
      lyrics: p.lyrics.map(item => {
        if (item.id === id) {
          const newVal = Math.max(0, parseFloat(((item[field] || 0) + delta).toFixed(2)));
          return { ...item, [field]: newVal };
        }
        return item;
      }),
    }));
  };

  const handleAddLine = (index?: number) => {
    const currentTime = audioEngine.getCurrentTime();
    const newItem: LyricItem = {
      id: `lyric_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: 'New lyric line',
      startTime: parseFloat(currentTime.toFixed(2)),
      endTime: parseFloat((currentTime + 3.5).toFixed(2)),
    };

    setProject(p => {
      const newLyrics = [...p.lyrics];
      if (index !== undefined && index >= 0) {
        newLyrics.splice(index + 1, 0, newItem);
      } else {
        newLyrics.push(newItem);
      }
      return { ...p, lyrics: sanitizeLyricTimes(newLyrics) };
    });
  };

  const handleDeleteLine = (id: string) => {
    setProject(p => ({
      ...p,
      lyrics: p.lyrics.filter(item => item.id !== id),
    }));
  };

  const handleJumpToLyric = async (startTime: number, index: number) => {
    audioEngine.seek(startTime);
    setActiveLyricIndex(index);
    if (!audioEngine.isPlaying()) {
      await audioEngine.play();
    }
  };

  const handleAutoDistributeTimings = () => {
    const totalDuration = project.audio.duration || 35;
    if (project.lyrics.length === 0) return;

    const interval = totalDuration / (project.lyrics.length + 0.5);
    const distributed = project.lyrics.map((item, idx) => ({
      ...item,
      startTime: parseFloat((idx * interval + 1.0).toFixed(2)),
      endTime: parseFloat(((idx + 1) * interval + 0.8).toFixed(2)),
    }));

    setProject(p => ({ ...p, lyrics: sanitizeLyricTimes(distributed) }));
  };

  const handleAutoSnapGaps = () => {
    setProject(p => ({ ...p, lyrics: sanitizeLyricTimes(p.lyrics) }));
  };

  const handleLoadSampleLyrics = () => {
    const sampleLyrics = `[Verse 1]
Hiram sa Diyos ang aking buhay
Ikaw at ako'y tanging handog lamang
'Di ko ninais na ako'y isilang
Ngunit salamat dahil may buhay

[Chorus]
Ligaya ko nang ako ay isilang
Pagkat tao ay mayroong dangal
Sino'ng may pag-ibig, sino'ng nagmamahal?

[Outro]
Kundi ang taong Diyos ang pinagmulan`;
    setBulkText(sampleLyrics);
  };

  const filteredLyrics = project.lyrics.filter(l => 
    l.text.toLowerCase().includes(filterText.toLowerCase()) || 
    (l.section && l.section.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="bg-[#16161D] border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-2xl">
      {/* Editor Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xs uppercase tracking-widest text-white/70 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Lyrics Editor & Sync
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
              {project.lyrics.length} lines
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5">
            Sync each line with timestamps or use 1-tap beat stamping during playback.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
            <button
              id="btn-mode-interactive"
              onClick={() => setEditorMode('interactive')}
              className={`px-3 py-1 rounded-md font-medium transition-all text-xs ${
                editorMode === 'interactive'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
            >
              Sync Mode
            </button>
            <button
              id="btn-mode-bulk"
              onClick={() => setEditorMode('bulk')}
              className={`px-3 py-1 rounded-md font-medium transition-all text-xs ${
                editorMode === 'bulk'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
            >
              Raw Lyrics
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Bulk Paste Text Editor */}
      {editorMode === 'bulk' ? (
        <div className="flex flex-col flex-1 gap-3 py-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 font-medium">
              Paste song lyrics below. Section tags like <code className="text-purple-400 bg-black/40 px-1 py-0.5 rounded border border-white/10">[Verse 1]</code> or <code className="text-purple-400 bg-black/40 px-1 py-0.5 rounded border border-white/10">[Chorus]</code> are auto-detected.
            </span>
            <button
              onClick={handleLoadSampleLyrics}
              className="text-xs text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
            >
              Insert Prompt Example Lyrics
            </button>
          </div>

          <textarea
            id="textarea-bulk-lyrics"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`[Verse 1]\nHiram sa Diyos ang aking buhay\nIkaw at ako'y tanging handog lamang\n'Di ko ninais na ako'y silayan\n\n[Chorus]\nLigaya ko nang ako ay isilang\nPagkat tao ay mayroong dangal`}
            rows={12}
            className="w-full flex-1 bg-black/40 border border-white/10 rounded-xl p-3.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-purple-500 outline-none resize-none transition-all leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setEditorMode('interactive')}
              className="text-xs text-white/60 hover:text-white px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              id="btn-apply-bulk-lyrics"
              onClick={handleApplyBulkText}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-md shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Process & Split Into Sync Items ({bulkText.split('\n').filter(t => t.trim() && !t.trim().startsWith('[')).length} Lines)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Mode 2: Interactive Synchronizer & Timeline List */
        <div className="flex flex-col flex-1 gap-3 py-3 overflow-hidden">
          {/* Quick Real-Time Sync Bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500 text-black flex items-center justify-center font-black text-xs shadow-md">
                ⎵
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Real-time Stamp Sync</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/40 font-mono font-semibold">
                    Target: Line {activeLyricIndex + 1}
                  </span>
                </div>
                <p className="text-[10px] text-white/40">
                  Play audio and press <strong className="text-white">Spacebar</strong> or click <strong className="text-purple-300">Stamp Beat</strong> on every vocal cue.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-stamp-beat-primary"
                onClick={onStampActiveLyric}
                className="flex-1 sm:flex-initial px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-md shadow-lg shadow-purple-500/20 border border-purple-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-90"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Stamp Beat & Next</span>
              </button>

              <div className="relative group">
                <button
                  id="btn-auto-timing-tools"
                  className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all"
                  title="Auto-timing tools"
                >
                  <Wand2 className="w-4 h-4 text-purple-400" />
                </button>
                <div className="absolute right-0 mt-1 w-52 bg-[#16161D] border border-white/10 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
                  <button
                    onClick={handleAutoDistributeTimings}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                    <span>Auto-Distribute Across Song</span>
                  </button>
                  <button
                    onClick={handleAutoSnapGaps}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Snap & Close Timing Gaps</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search / Filter & Add Line Bar */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              placeholder="Search lyric line..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-black/30 border border-white/10 text-xs px-3 py-1.5 rounded-md text-white placeholder:text-white/30 focus:border-purple-500/80 outline-none w-48 sm:w-64"
            />
            <button
              id="btn-add-new-lyric-line"
              onClick={() => handleAddLine()}
              className="bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-md border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Line</span>
            </button>
          </div>

          {/* Interactive Lyrics List */}
          <div 
            ref={listRef} 
            className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[460px] custom-scrollbar"
          >
            {filteredLyrics.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/15 rounded-xl bg-black/20">
                <FileText className="w-8 h-8 text-white/30 mx-auto mb-2" />
                <p className="text-xs text-white/50 font-medium">No lyrics added yet</p>
                <button
                  onClick={() => setEditorMode('bulk')}
                  className="mt-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all inline-flex items-center gap-1.5"
                >
                  Paste Lyrics Now
                </button>
              </div>
            ) : (
              filteredLyrics.map((item, index) => {
                const isActive = activeLyricIndex === index;
                const sectionTags = ['Verse 1', 'Verse 2', 'Chorus', 'Bridge', 'Intro', 'Outro', 'Hook'];

                return (
                  <div
                    key={item.id}
                    data-lyric-index={index}
                    onClick={() => setActiveLyricIndex(index)}
                    className={`p-3 rounded-r-lg border-l-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-500/10 border-l-purple-500 border-t border-b border-r border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-white/[0.02] hover:bg-white/5 border-l-transparent hover:border-l-white/30 border-t border-b border-r border-white/5'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Left: Index badge, Section Tag, Lyric Text */}
                      <div className="flex items-start sm:items-center gap-2.5 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold ${
                            isActive ? 'bg-purple-500 text-black' : 'bg-white/10 text-white/40'
                          }`}>
                            {index + 1}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpToLyric(item.startTime, index);
                            }}
                            className="p-1 rounded text-white/40 hover:text-purple-400 hover:bg-white/5 transition-all"
                            title="Play from this lyric"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        </div>

                        {/* Section Selector */}
                        <div className="relative">
                          <select
                            value={item.section || ''}
                            onChange={(e) => handleUpdateLine(item.id, { section: e.target.value || undefined })}
                            className="bg-black/40 border border-white/10 text-[10px] uppercase font-bold text-white/50 hover:text-purple-300 px-2 py-1 rounded outline-none cursor-pointer"
                          >
                            <option value="" className="bg-[#16161D] text-white">No Tag</option>
                            {sectionTags.map(tag => (
                              <option key={tag} value={tag} className="bg-[#16161D] text-white">{tag}</option>
                            ))}
                          </select>
                        </div>

                        {/* Editable Lyric Text */}
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleUpdateLine(item.id, { text: e.target.value })}
                          className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 px-1 py-0.5 text-sm transition-all outline-none ${
                            isActive ? 'font-medium text-white' : 'text-white/80'
                          }`}
                          placeholder="Enter lyric words..."
                        />
                      </div>

                      {/* Right: Timestamps & Fine-tuning */}
                      <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {/* Start Time with micro-nudge */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                          <button
                            onClick={() => handleAdjustTime(item.id, 'startTime', -0.1)}
                            className="text-white/40 hover:text-white px-1 text-[11px] font-mono"
                            title="-0.1s"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step={0.1}
                            value={item.startTime}
                            onChange={(e) => handleUpdateLine(item.id, { startTime: parseFloat(e.target.value) || 0 })}
                            className="w-12 bg-transparent text-center font-mono text-[11px] text-purple-400 font-semibold outline-none"
                            title="Start time in seconds"
                          />
                          <span className="text-[10px] text-white/30 font-mono">s</span>
                          <button
                            onClick={() => handleAdjustTime(item.id, 'startTime', 0.1)}
                            className="text-white/40 hover:text-white px-1 text-[11px] font-mono"
                            title="+0.1s"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-white/30 text-xs">→</span>

                        {/* End Time with micro-nudge */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                          <button
                            onClick={() => handleAdjustTime(item.id, 'endTime', -0.1)}
                            className="text-white/40 hover:text-white px-1 text-[11px] font-mono"
                            title="-0.1s"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step={0.1}
                            value={item.endTime}
                            onChange={(e) => handleUpdateLine(item.id, { endTime: parseFloat(e.target.value) || 0 })}
                            className="w-12 bg-transparent text-center font-mono text-[11px] text-white/80 outline-none"
                            title="End time in seconds"
                          />
                          <span className="text-[10px] text-white/30 font-mono">s</span>
                          <button
                            onClick={() => handleAdjustTime(item.id, 'endTime', 0.1)}
                            className="text-white/40 hover:text-white px-1 text-[11px] font-mono"
                            title="+0.1s"
                          >
                            +
                          </button>
                        </div>

                        {/* Insert Line Below Button */}
                        <button
                          onClick={() => handleAddLine(index)}
                          className="p-1 rounded text-white/40 hover:text-purple-400 hover:bg-white/5 transition-all"
                          title="Insert line below"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Line Button */}
                        <button
                          onClick={() => handleDeleteLine(item.id)}
                          className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition-all"
                          title="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
