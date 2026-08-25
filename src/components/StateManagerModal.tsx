import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Layers, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  FileText, 
  FolderOpen, 
  Download, 
  Upload,
  ArrowRight,
  Ratio
} from 'lucide-react';
import { ProjectData } from '../types';
import { 
  SavedStateItem, 
  getSavedStates, 
  saveState, 
  createNewProjectState, 
  duplicateProjectState, 
  deleteProjectState,
  saveAllStates
} from '../utils/stateStorage';
import { SAMPLE_PROJECTS } from '../utils/sampleData';

interface StateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectData;
  onSelectState: (project: ProjectData) => void;
}

export const StateManagerModal: React.FC<StateManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onSelectState,
}) => {
  const [savedStates, setSavedStates] = useState<SavedStateItem[]>(() => getSavedStates());
  const [viewMode, setViewMode] = useState<'list' | 'create_new' | 'save_snapshot'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [snapshotName, setSnapshotName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSwitchToState = (stateItem: SavedStateItem) => {
    onSelectState(stateItem.project);
    showFeedback(`Loaded "${stateItem.name}" state`);
    onClose();
  };

  const handleCreateNew = () => {
    const templateKey = selectedTemplate === 'blank' ? undefined : selectedTemplate;
    const { state, project } = createNewProjectState(templateKey, newTitle.trim() || undefined);
    setSavedStates(getSavedStates());
    onSelectState(project);
    showFeedback(`Created new lyric video state "${state.name}"`);
    setViewMode('list');
    onClose();
  };

  const handleSaveSnapshot = () => {
    const name = snapshotName.trim() || `${currentProject.title || 'Project'} (Snapshot)`;
    const saved = saveState(currentProject, name);
    setSavedStates(getSavedStates());
    showFeedback(`Saved snapshot state "${saved.name}"`);
    setViewMode('list');
  };

  const handleDuplicate = (stateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = duplicateProjectState(stateId);
    if (result) {
      setSavedStates(getSavedStates());
      showFeedback(`Duplicated state as "${result.state.name}"`);
    }
  };

  const handleDelete = (stateId: string, stateName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedStates.length <= 1) {
      alert('You must keep at least one lyric video state.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${stateName}"?`)) {
      const updated = deleteProjectState(stateId);
      setSavedStates(updated);
      showFeedback(`Deleted "${stateName}"`);
    }
  };

  const handleExportAllBackup = () => {
    const jsonStr = JSON.stringify(savedStates, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LyricForge_All_States_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = JSON.parse(evt.target?.result as string);
        if (Array.isArray(loaded) && loaded.length > 0) {
          saveAllStates(loaded);
          setSavedStates(loaded);
          showFeedback(`Imported ${loaded.length} video states!`);
        }
      } catch (err) {
        alert('Invalid JSON backup file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#16161D] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0F0F12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shadow-md">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-tight">Lyric Video States & Projects</h2>
              <p className="text-[11px] text-white/40">Manage multiple lyric compositions, versions and templates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {feedbackMsg && (
          <div className="bg-purple-500/20 border-b border-purple-500/30 px-4 py-2 text-xs font-semibold text-purple-200 flex items-center justify-between animate-in fade-in">
            <span>✨ {feedbackMsg}</span>
          </div>
        )}

        {/* Action Switcher Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#121217] border-b border-white/5 text-xs">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Saved States ({savedStates.length})
            </button>
            <button
              onClick={() => {
                setNewTitle('');
                setSelectedTemplate('blank');
                setViewMode('create_new');
              }}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'create_new'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New State</span>
            </button>
            <button
              onClick={() => {
                setSnapshotName(`${currentProject.title || 'Composition'} - Snapshot ${savedStates.length + 1}`);
                setViewMode('save_snapshot');
              }}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'save_snapshot'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save Snapshot</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-white/10">
              <Upload className="w-3 h-3 text-purple-400" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
            <button
              onClick={handleExportAllBackup}
              className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-white/10"
              title="Download backup of all states"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Backup All</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* VIEW MODE 1: LIST SAVED STATES */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">
                  Select a State to Load or Edit
                </span>
                <span className="text-xs text-white/40 font-mono">
                  Active: {currentProject.title || 'Untitled'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedStates.map((stateItem) => {
                  const isCurrentActive = stateItem.project.id === currentProject.id || stateItem.name === currentProject.title;
                  return (
                    <div
                      key={stateItem.id}
                      onClick={() => handleSwitchToState(stateItem)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between ${
                        isCurrentActive
                          ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/15'
                          : 'bg-black/30 hover:bg-white/[0.04] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                            {stateItem.name}
                          </h3>
                          {isCurrentActive && (
                            <span className="text-[10px] bg-purple-500 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-white/50 line-clamp-1">
                          {stateItem.artist || stateItem.project.artist || 'Unknown Artist'}
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-[10px] text-white/40 font-mono">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {stateItem.aspectRatio || stateItem.project.aspectRatio}
                          </span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-purple-300 font-semibold">
                            {stateItem.lyricsCount || stateItem.project.lyrics.length} lines
                          </span>
                          <span>
                            {new Date(stateItem.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5">
                        <span className="text-[11px] text-purple-400 font-medium group-hover:underline flex items-center gap-1">
                          <span>Load Video State</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDuplicate(stateItem.id, e)}
                            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-all"
                            title="Duplicate this state"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(stateItem.id, stateItem.name, e)}
                            className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete this state"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: CREATE NEW STATE */}
          {viewMode === 'create_new' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-1.5">
                  State / Song Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Acoustic Hymn Session, Midnight Reel 9:16, My New Song"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">
                  Choose Starting Template or Clean Slate
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Blank Option */}
                  <button
                    onClick={() => setSelectedTemplate('blank')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedTemplate === 'blank'
                        ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">✨ Clean Slate (Blank)</span>
                      {selectedTemplate === 'blank' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">Start fresh with empty canvas ready for your custom lyrics & audio</p>
                  </button>

                  {/* Preset Templates */}
                  {Object.keys(SAMPLE_PROJECTS).map((key) => {
                    const sample = SAMPLE_PROJECTS[key];
                    const isSelected = selectedTemplate === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/50'
                            : 'bg-black/30 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{sample.title}</span>
                          <span className="text-[10px] font-mono bg-white/5 text-white/60 px-1.5 py-0.5 rounded border border-white/10">
                            {sample.aspectRatio}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{sample.artist}</p>
                        <div className="text-[10px] text-purple-300/80 font-mono mt-1">
                          Font: {sample.font.fontFamily.split(',')[0].replace(/'/g, '')} • {sample.animation.entryEffect} effect
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNew}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-md shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create State & Open</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: SAVE CURRENT SNAPSHOT */}
          {viewMode === 'save_snapshot' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-200">
                💾 Save the current video state (all lyrics, timings, styles, background optics, and settings) as an independent version snapshot.
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80 block mb-1.5">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Tanging Handog (Fine-Tuned Timings V2)"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Lyrics</span>
                  <span className="font-bold text-purple-300">{currentProject.lyrics.length} Lines</span>
                </div>
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Aspect</span>
                  <span className="font-bold text-white">{currentProject.aspectRatio}</span>
                </div>
                <div className="bg-black/30 border border-white/10 p-2.5 rounded-lg">
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Effect</span>
                  <span className="font-bold text-emerald-400 capitalize">{currentProject.animation.entryEffect}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  Back to List
                </button>
                <button
                  onClick={handleSaveSnapshot}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-md shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save Snapshot State</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
