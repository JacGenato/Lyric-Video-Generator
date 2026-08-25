/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectData } from './types';
import { SAMPLE_PROJECTS } from './utils/sampleData';
import { Header } from './components/Header';
import { StagePreview } from './components/StagePreview';
import { LyricsEditor } from './components/LyricsEditor';
import { MediaSettings } from './components/MediaSettings';
import { StyleAndEffects } from './components/StyleAndEffects';
import { ExportModal } from './components/ExportModal';
import { StateManagerModal } from './components/StateManagerModal';
import { audioEngine } from './utils/audioEngine';
import { sanitizeLyricTimes } from './utils/lrcParser';
import { getSavedStates, getActiveStateId, saveState } from './utils/stateStorage';

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => {
    // Try to load initial saved state
    const savedStates = getSavedStates();
    const activeId = getActiveStateId();
    if (activeId) {
      const match = savedStates.find(s => s.id === activeId);
      if (match) return match.project;
    }
    return savedStates[0]?.project || SAMPLE_PROJECTS.tanging_handog;
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'media' | 'style'>('editor');
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isStateManagerOpen, setIsStateManagerOpen] = useState<boolean>(false);

  // Initialize synth audio whenever project audio changes or mounts
  useEffect(() => {
    if (!project.audio.fileUrl) {
      audioEngine.loadSampleTrack('acoustic', project.audio.duration || 38);
    }
  }, [project.id]);

  // Track when last stamp occurred to prevent playback tracking from overriding active target
  const lastStampTimestampRef = React.useRef<number>(0);

  // Update active lyric index as playback progresses (only when not in active stamping)
  useEffect(() => {
    const unsubscribe = audioEngine.onTimeUpdate((currentTime) => {
      // If user recently stamped (within 2.5s), don't override the active target line
      if (Date.now() - lastStampTimestampRef.current < 2500) {
        return;
      }

      const lyrics = project.lyrics;
      if (!lyrics || lyrics.length === 0) return;

      for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].startTime && currentTime <= lyrics[i].endTime) {
          setActiveLyricIndex(i);
          break;
        }
      }
    });

    return () => unsubscribe();
  }, [project.lyrics]);

  // "Stamp Beat / Sync Next Line" function
  // Sets the active lyric's start time to current playback time and automatically cascades subsequent lines
  const handleStampActiveLyric = useCallback(() => {
    const currTime = parseFloat(audioEngine.getCurrentTime().toFixed(2));
    lastStampTimestampRef.current = Date.now();
    
    setProject((prev) => {
      if (prev.lyrics.length === 0) return prev;
      const targetIdx = Math.min(activeLyricIndex, prev.lyrics.length - 1);
      const newLyrics = [...prev.lyrics];

      const currentItem = newLyrics[targetIdx];
      const lineDuration = Math.max(2.0, (currentItem.endTime - currentItem.startTime) || 3.5);
      const newEnd = parseFloat((currTime + lineDuration).toFixed(2));

      // 1. Update current target lyric
      newLyrics[targetIdx] = {
        ...currentItem,
        startTime: currTime,
        endTime: newEnd,
      };

      // 2. If previous line exists, cleanly clip its end time to current time
      if (targetIdx > 0) {
        newLyrics[targetIdx - 1] = {
          ...newLyrics[targetIdx - 1],
          endTime: currTime,
        };
      }

      // 3. CRITICAL: Automatically adjust the 2nd line (and all following lines)
      // so Line 2 starts right at Line 1's end time and flows seamlessly
      let rollingStart = newEnd;
      for (let i = targetIdx + 1; i < newLyrics.length; i++) {
        const nextItem = newLyrics[i];
        const nextDuration = Math.max(2.0, (nextItem.endTime - nextItem.startTime) || 3.5);
        const nextEnd = parseFloat((rollingStart + nextDuration).toFixed(2));
        
        newLyrics[i] = {
          ...nextItem,
          startTime: rollingStart,
          endTime: nextEnd,
        };
        rollingStart = nextEnd;
      }

      return {
        ...prev,
        lyrics: newLyrics,
      };
    });

    // Advance target to the next lyric line (e.g. Line 2)
    if (activeLyricIndex < project.lyrics.length - 1) {
      setActiveLyricIndex(idx => idx + 1);
    }
  }, [activeLyricIndex, project.lyrics]);

  const handleSelectState = (newProject: ProjectData) => {
    setProject(newProject);
    setActiveLyricIndex(0);
    audioEngine.seek(0);
  };

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Studio Header & Actions */}
      <Header
        project={project}
        setProject={setProject}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenStateManager={() => setIsStateManagerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Studio Workspace (Split Grid) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Live Video Canvas Stage & Playback */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-4 sticky top-16">
          <StagePreview
            project={project}
            setProject={setProject}
            onStampActiveLyric={handleStampActiveLyric}
            activeLyricIndex={activeLyricIndex}
            totalLyrics={project.lyrics.length}
          />
        </div>

        {/* Right Column: Tab Panels (Lyrics Sync / Audio & BG / Visual Styles) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col h-full min-h-[550px]">
          {activeTab === 'editor' && (
            <LyricsEditor
              project={project}
              setProject={setProject}
              activeLyricIndex={activeLyricIndex}
              setActiveLyricIndex={setActiveLyricIndex}
              onStampActiveLyric={handleStampActiveLyric}
            />
          )}

          {activeTab === 'media' && (
            <MediaSettings
              project={project}
              setProject={setProject}
            />
          )}

          {activeTab === 'style' && (
            <StyleAndEffects
              project={project}
              setProject={setProject}
            />
          )}
        </div>
      </main>

      {/* State Manager Modal (New State, Save Snapshots, Switch Versions) */}
      <StateManagerModal
        isOpen={isStateManagerOpen}
        onClose={() => setIsStateManagerOpen(false)}
        currentProject={project}
        onSelectState={handleSelectState}
      />

      {/* Export Video Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
}
