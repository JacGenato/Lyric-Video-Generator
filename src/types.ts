export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';
export type BackgroundType = 'image' | 'video' | 'gradient' | 'preset';
export type BackgroundFit = 'cover' | 'contain';

export interface WordHighlight {
  word: string;
  startTime: number;
  endTime: number;
}

export interface LyricItem {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  section?: string;  // e.g., 'Verse 1', 'Chorus', 'Bridge', 'Outro'
  words?: WordHighlight[];
  color?: string;
  scale?: number;
}

export type TextShadowStyle = 'none' | 'soft' | 'heavy' | 'neon' | 'glow' | 'outline' | 'cinematic';
export type TextAlignment = 'center' | 'left' | 'right';
export type TextPosition = 'middle' | 'bottom' | 'top' | 'karaoke-center';
export type EntryAnimation = 
  | 'fade' 
  | 'pop' 
  | 'slide-up' 
  | 'slide-down' 
  | 'karaoke-wipe' 
  | 'typewriter' 
  | 'blur-in' 
  | 'neon-pulse'
  | 'cinematic-zoom'
  | 'glitch';

export type ExitAnimation = 'fade' | 'slide-up' | 'shrink' | 'none';
export type VisualizerType = 'none' | 'bars' | 'wave' | 'particles' | 'circle' | 'mirror-spectrum';

export interface FontSettings {
  fontFamily: string;
  fontSizeRatio: number; // base size multiplier
  fontWeight: 'normal' | 'bold' | '900';
  fontStyle: 'normal' | 'italic';
  textColor: string;
  accentColor: string;
  textShadow: TextShadowStyle;
  shadowColor: string;
  strokeColor: string;
  strokeWidth: number;
  alignment: TextAlignment;
  verticalPosition: TextPosition;
  textTransform: 'none' | 'uppercase' | 'capitalize';
  letterSpacing: number;
  maxLinesVisible: 1 | 2 | 3 | 5;
}

export interface AnimationSettings {
  entryEffect: EntryAnimation;
  exitEffect: ExitAnimation;
  duration: number; // transition duration in seconds (0.1 - 1.0)
  showSurroundingLyrics: boolean;
  surroundingOpacity: number; // 0.1 - 0.7
  karaokeFillColor: string;
  audioVisualizer: VisualizerType;
  visualizerColor: string;
  visualizerPosition: 'bottom' | 'center' | 'under-text';
  particleOverlay: 'none' | 'dust' | 'stars' | 'bubbles' | 'bokeh';
}

export interface BackgroundSettings {
  type: BackgroundType;
  url: string | null;
  videoUrl: string | null;
  presetId?: string;
  fit: BackgroundFit;
  brightness: number; // 0 to 150 (100 is normal, 40-70 is darkened for readable text)
  blur: number;       // 0 to 20 px
  vignette: number;   // 0 to 100%
  overlayColor: string; // hex
  overlayOpacity: number; // 0 to 100%
  gradientPreset?: string;
}

export interface AudioSettings {
  fileUrl: string | null;
  fileName: string | null;
  duration: number; // in seconds
  audioBuffer?: AudioBuffer | null;
}

export interface IntroTitleSettings {
  enabled: boolean;
  title: string;
  artist: string;
  subtitle: string;
  duration: number; // in seconds (1.0 - 8.0)
  theme: 'cinematic' | 'minimal' | 'neon' | 'bold-center' | 'vintage';
  animation: 'fade' | 'zoom' | 'slide-up' | 'blur';
  textColor: string;
  accentColor: string;
  fontSizeMultiplier: number;
}

export interface ProjectData {
  id: string;
  title: string;
  artist: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  introTitle?: IntroTitleSettings;
  background: BackgroundSettings;
  font: FontSettings;
  animation: AnimationSettings;
  audio: AudioSettings;
  lyrics: LyricItem[];
}
