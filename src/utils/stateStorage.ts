import { ProjectData } from '../types';
import { SAMPLE_PROJECTS } from './sampleData';

export interface SavedStateItem {
  id: string;
  name: string;
  artist: string;
  aspectRatio: string;
  lyricsCount: number;
  updatedAt: number;
  project: ProjectData;
  isFavorite?: boolean;
}

const STORAGE_KEY = 'lyricforge_saved_states_v2';
const ACTIVE_STATE_ID_KEY = 'lyricforge_active_state_id';

export const BLANK_PROJECT_TEMPLATE: ProjectData = {
  id: 'blank_project',
  title: 'Untitled Lyric Video',
  artist: 'Unknown Artist',
  aspectRatio: '16:9',
  resolution: '1080p',
  background: {
    type: 'gradient',
    url: null,
    videoUrl: null,
    fit: 'cover',
    brightness: 100,
    blur: 0,
    vignette: 40,
    overlayColor: '#000000',
    overlayOpacity: 30,
    gradientPreset: 'preset_gradient_synthwave',
  },
  font: {
    fontFamily: "'Syne', sans-serif",
    fontSizeRatio: 1.15,
    fontWeight: 'bold',
    fontStyle: 'normal',
    textColor: '#ffffff',
    accentColor: '#a855f7',
    textShadow: 'neon',
    shadowColor: '#a855f7',
    strokeColor: '#000000',
    strokeWidth: 0,
    alignment: 'center',
    verticalPosition: 'middle',
    textTransform: 'none',
    letterSpacing: 1.2,
    maxLinesVisible: 2,
  },
  animation: {
    entryEffect: 'pop',
    exitEffect: 'fade',
    duration: 0.35,
    showSurroundingLyrics: true,
    surroundingOpacity: 0.3,
    karaokeFillColor: '#c084fc',
    audioVisualizer: 'wave',
    visualizerColor: '#a855f7',
    visualizerPosition: 'bottom',
    particleOverlay: 'dust',
  },
  audio: {
    fileUrl: null,
    fileName: 'Sample_Acoustic_Track.mp3',
    duration: 35,
  },
  lyrics: [
    {
      id: 'lyr_1',
      text: 'Start typing your lyrics here',
      startTime: 1.0,
      endTime: 5.0,
      section: 'Verse 1',
    },
    {
      id: 'lyr_2',
      text: 'Use the timing adjuster to sync each line',
      startTime: 5.5,
      endTime: 10.0,
      section: 'Verse 1',
    },
  ],
};

/**
 * Initializes and retrieves all saved states from localStorage
 */
export function getSavedStates(): SavedStateItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load saved states from localStorage:', err);
  }

  // If no saved states, bootstrap with sample presets
  const initialStates: SavedStateItem[] = Object.keys(SAMPLE_PROJECTS).map((key) => {
    const proj = SAMPLE_PROJECTS[key];
    return {
      id: `state_${key}`,
      name: proj.title,
      artist: proj.artist,
      aspectRatio: proj.aspectRatio,
      lyricsCount: proj.lyrics.length,
      updatedAt: Date.now(),
      project: { ...proj, id: `proj_${key}_${Date.now()}` },
    };
  });

  saveAllStates(initialStates);
  return initialStates;
}

export function saveAllStates(states: SavedStateItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (err) {
    console.error('Failed to save states to localStorage:', err);
  }
}

export function getActiveStateId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STATE_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveStateId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_STATE_ID_KEY, id);
  } catch {}
}

/**
 * Saves or updates a project state
 */
export function saveState(project: ProjectData, customName?: string): SavedStateItem {
  const states = getSavedStates();
  const stateName = customName || project.title || 'Untitled State';
  const stateId = `state_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const existingIdx = states.findIndex((s) => s.project.id === project.id);

  const updatedItem: SavedStateItem = {
    id: existingIdx >= 0 ? states[existingIdx].id : stateId,
    name: stateName,
    artist: project.artist || 'Unknown Artist',
    aspectRatio: project.aspectRatio,
    lyricsCount: project.lyrics.length,
    updatedAt: Date.now(),
    project: { ...project, title: stateName },
  };

  if (existingIdx >= 0) {
    states[existingIdx] = updatedItem;
  } else {
    states.unshift(updatedItem);
  }

  saveAllStates(states);
  setActiveStateId(updatedItem.id);
  return updatedItem;
}

/**
 * Creates a brand new lyric video state (blank or from template)
 */
export function createNewProjectState(templateKey?: string, name?: string): { state: SavedStateItem; project: ProjectData } {
  let baseProject: ProjectData;

  if (templateKey && SAMPLE_PROJECTS[templateKey]) {
    baseProject = JSON.parse(JSON.stringify(SAMPLE_PROJECTS[templateKey]));
  } else {
    baseProject = JSON.parse(JSON.stringify(BLANK_PROJECT_TEMPLATE));
  }

  const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const title = name || (templateKey ? `${baseProject.title} (New Copy)` : 'New Lyric Video');

  const newProject: ProjectData = {
    ...baseProject,
    id: newId,
    title,
  };

  const newState: SavedStateItem = {
    id: `state_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: title,
    artist: newProject.artist,
    aspectRatio: newProject.aspectRatio,
    lyricsCount: newProject.lyrics.length,
    updatedAt: Date.now(),
    project: newProject,
  };

  const states = getSavedStates();
  states.unshift(newState);
  saveAllStates(states);
  setActiveStateId(newState.id);

  return { state: newState, project: newProject };
}

/**
 * Clones/Duplicates an existing state
 */
export function duplicateProjectState(sourceStateId: string): { state: SavedStateItem; project: ProjectData } | null {
  const states = getSavedStates();
  const source = states.find((s) => s.id === sourceStateId);
  if (!source) return null;

  const newProject: ProjectData = {
    ...JSON.parse(JSON.stringify(source.project)),
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: `${source.name} (Copy)`,
  };

  const newState: SavedStateItem = {
    id: `state_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${source.name} (Copy)`,
    artist: newProject.artist,
    aspectRatio: newProject.aspectRatio,
    lyricsCount: newProject.lyrics.length,
    updatedAt: Date.now(),
    project: newProject,
  };

  states.unshift(newState);
  saveAllStates(states);
  setActiveStateId(newState.id);

  return { state: newState, project: newProject };
}

/**
 * Deletes a state by ID
 */
export function deleteProjectState(stateId: string): SavedStateItem[] {
  const states = getSavedStates();
  const filtered = states.filter((s) => s.id !== stateId);
  saveAllStates(filtered);
  return filtered;
}
