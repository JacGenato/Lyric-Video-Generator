import React, { useRef, useState } from 'react';
import { 
  Video, 
  Download, 
  FileText, 
  Sliders, 
  Sparkles, 
  Ratio, 
  Share2, 
  Upload, 
  RefreshCw,
  Layers,
  Music2,
  Plus,
  Bookmark,
  FolderOpen,
  Film
} from 'lucide-react';
import { AspectRatio, ProjectData, Resolution } from '../types';
import { SAMPLE_PROJECTS } from '../utils/sampleData';
import { exportToLrc, exportToSrt } from '../utils/lrcParser';
import { saveState } from '../utils/stateStorage';

interface HeaderProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onOpenExportModal: () => void;
  onOpenStateManager: () => void;
  activeTab: 'editor' | 'title' | 'media' | 'style';
  setActiveTab: (tab: 'editor' | 'title' | 'media' | 'style') => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  setProject,
  onOpenExportModal,
  onOpenStateManager,
  activeTab,
  setActiveTab,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);

  const handleQuickSave = () => {
    saveState(project);
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleLoadSample = (sampleKey: string) => {
    const sample = SAMPLE_PROJECTS[sampleKey];
    if (sample) {
      setProject({ ...sample, id: `proj_${Date.now()}` });
    }
  };

  const handleExportLrcFile = () => {
    const lrcContent = exportToLrc(project.lyrics, project.title, project.artist);
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'lyrics'}.lrc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSrtFile = () => {
    const srtContent = exportToSrt(project.lyrics);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'lyrics'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonProject = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'lyric_project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loadedData = JSON.parse(evt.target?.result as string);
        if (loadedData && Array.isArray(loadedData.lyrics)) {
          setProject(loadedData);
        }
      } catch (err) {
        alert('Invalid project JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="border-b border-white/10 bg-[#16161D] backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Branding, States button & Song Title Input */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-black text-sm shadow-md shadow-purple-500/30">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center">
                  LyricForge Pro
                </h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Artistic Lyric Studio</p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Video States & Versions Switcher Button */}
          <button
            onClick={onOpenStateManager}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
            title="Open States Manager to create new states or switch projects"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">
              {project.title || 'Untitled State'}
            </span>
            <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1 rounded font-mono">
              States
            </span>
          </button>

          {/* Quick Save Indicator Button */}
          <button
            onClick={handleQuickSave}
            className={`p-1.5 rounded-md border text-xs transition-all flex items-center gap-1 ${
              saveIndicator 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'
            }`}
            title="Save current state to browser storage"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">
              {saveIndicator ? 'Saved!' : 'Save'}
            </span>
          </button>

          {/* Project Title & Artist Edit */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <input
              id="header-project-title"
              type="text"
              value={project.title}
              onChange={(e) => setProject(p => ({ ...p, title: e.target.value }))}
              placeholder="Song Title"
              className="bg-white/5 hover:bg-white/10 focus:bg-black/40 border border-white/10 focus:border-purple-500/80 px-2.5 py-1 rounded-md text-xs font-medium text-white placeholder:text-white/40 transition-all outline-none w-24 sm:w-32"
            />
            <input
              id="header-project-artist"
              type="text"
              value={project.artist}
              onChange={(e) => setProject(p => ({ ...p, artist: e.target.value }))}
              placeholder="Artist"
              className="bg-white/5 hover:bg-white/10 focus:bg-black/40 border border-white/10 focus:border-purple-500/80 px-2.5 py-1 rounded-md text-xs text-white/80 placeholder:text-white/40 transition-all outline-none w-20 sm:w-28 hidden lg:block"
            />
          </div>
        </div>

        {/* Center: Tabs & Aspect Ratio */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Buttons */}
          <div className="flex items-center bg-black/30 p-1 rounded-lg border border-white/10 text-xs">
            <button
              id="btn-aspect-16-9"
              onClick={() => setProject(p => ({ ...p, aspectRatio: '16:9' }))}
              className={`px-2.5 py-1 rounded font-bold transition-all text-[11px] ${
                project.aspectRatio === '16:9'
                  ? 'bg-white/15 text-white border border-purple-500/50 shadow-sm'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
              title="16:9 Wide - YouTube & TV"
            >
              16:9 Wide
            </button>
            <button
              id="btn-aspect-9-16"
              onClick={() => setProject(p => ({ ...p, aspectRatio: '9:16' }))}
              className={`px-2.5 py-1 rounded font-bold transition-all text-[11px] ${
                project.aspectRatio === '9:16'
                  ? 'bg-white/15 text-white border border-purple-500/50 shadow-sm'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
              title="9:16 Reel - TikTok / Shorts / Reels"
            >
              9:16 Reel
            </button>
            <button
              id="btn-aspect-1-1"
              onClick={() => setProject(p => ({ ...p, aspectRatio: '1:1' }))}
              className={`px-2.5 py-1 rounded font-bold transition-all text-[11px] ${
                project.aspectRatio === '1:1'
                  ? 'bg-white/15 text-white border border-purple-500/50 shadow-sm'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
              title="1:1 Square - Instagram"
            >
              1:1 Square
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
            <button
              id="tab-lyrics-editor"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-xs ${
                activeTab === 'editor'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lyrics & Sync</span>
            </button>
            <button
              id="tab-title-editor"
              onClick={() => setActiveTab('title')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-xs ${
                activeTab === 'title'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Title Intro</span>
            </button>
            <button
              id="tab-media-settings"
              onClick={() => setActiveTab('media')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-xs ${
                activeTab === 'media'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Media</span>
            </button>
            <button
              id="tab-style-settings"
              onClick={() => setActiveTab('style')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-xs ${
                activeTab === 'style'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Style & FX</span>
            </button>
          </div>
        </div>

        {/* Right: Add State, Presets & Export Actions */}
        <div className="flex items-center gap-2">
          {/* New State Quick Button */}
          <button
            onClick={onOpenStateManager}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-md border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            title="Create a new lyric video state or switch version"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">New State</span>
          </button>

          {/* Quick Menu for Files */}
          <div className="relative group">
            <button
              id="btn-file-options"
              className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 transition-all flex items-center gap-1.5"
              title="Import & Export files"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Files</span>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-[#16161D] border border-white/10 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1">
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Import Project JSON</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={handleExportLrcFile}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Synced .LRC</span>
              </button>
              <button
                onClick={handleExportSrtFile}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Subtitle .SRT</span>
              </button>
              <button
                onClick={handleExportJsonProject}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Project Backup</span>
              </button>
            </div>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleImportJsonProject}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Export Video Primary Button */}
          <button
            id="btn-open-export-video"
            onClick={onOpenExportModal}
            className="px-4 sm:px-5 py-1.5 bg-purple-600 text-xs font-bold rounded-md hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </div>
    </header>
  );
};
