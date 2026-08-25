import { LyricItem } from '../types';

export function formatTime(seconds: number, includeMs: boolean = true): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (includeMs) {
    return `${pad(mins)}:${pad(secs)}.${pad(ms)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatTimeSrt(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const pad3 = (n: number) => n.toString().padStart(3, '0');

  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)},${pad3(ms)}`;
}

export function parseTime(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const hours = match[1] ? parseFloat(match[1]) : 0;
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses raw text into LyricItem[].
 * Supports:
 * 1. Plain text with line breaks
 * 2. LRC format: [mm:ss.xx] Lyric text
 * 3. Section headers: [Verse 1], [Chorus], [Bridge]
 */
export function parseLyricsText(rawText: string, defaultLineDuration: number = 3.5): LyricItem[] {
  const lines = rawText.split(/\r?\n/);
  const items: LyricItem[] = [];
  let currentTime = 0;
  let currentSection: string | undefined = undefined;

  const lrcRegex = /^\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\](.*)$/;
  const sectionRegex = /^\[([a-zA-Z0-9\s_'-]+)\]$/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check if it is a section header like [Verse 1] or [Chorus]
    const sectionMatch = rawLine.match(sectionRegex);
    // If it is not a timestamp (no colon inside)
    if (sectionMatch && !sectionMatch[1].includes(':')) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Check if it has an LRC timestamp [00:15.50]
    const lrcMatch = rawLine.match(lrcRegex);
    if (lrcMatch) {
      const timeParsed = parseTime(lrcMatch[1]);
      const text = lrcMatch[2].trim();
      const startTime = timeParsed !== null ? timeParsed : currentTime;
      const endTime = startTime + defaultLineDuration;
      currentTime = endTime;

      if (text) {
        items.push({
          id: `lyric_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          text,
          startTime,
          endTime,
          section: currentSection,
        });
      }
    } else {
      // Plain text line
      const startTime = currentTime;
      const endTime = startTime + defaultLineDuration;
      currentTime = endTime;

      items.push({
        id: `lyric_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: rawLine,
        startTime,
        endTime,
        section: currentSection,
      });
    }
  }

  // Adjust overlapping or loose end times so they flow naturally
  return sanitizeLyricTimes(items);
}

/**
 * Ensures end times don't overlap awkwardly and maintain minimum sensible duration
 */
export function sanitizeLyricTimes(lyrics: LyricItem[]): LyricItem[] {
  if (lyrics.length === 0) return [];
  const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime);

  return sorted.map((item, idx) => {
    const nextItem = sorted[idx + 1];
    let endTime = item.endTime;

    if (nextItem) {
      // If next item starts before this item's end time, clip this end time
      if (nextItem.startTime > item.startTime) {
        endTime = Math.min(endTime, nextItem.startTime);
      }
    }

    // Ensure minimum 0.5s duration
    if (endTime <= item.startTime) {
      endTime = item.startTime + 2.5;
    }

    return {
      ...item,
      endTime,
    };
  });
}

/**
 * Exports lyric items to standard .LRC format
 */
export function exportToLrc(lyrics: LyricItem[], title: string = '', artist: string = ''): string {
  const lines: string[] = [];
  if (title) lines.push(`[ti:${title}]`);
  if (artist) lines.push(`[ar:${artist}]`);
  lines.push(`[by:Lyric Video Generator]`);
  lines.push('');

  const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime);
  for (const item of sorted) {
    if (item.section) {
      // Add section comment tag if present
      lines.push(`[${item.section}]`);
    }
    const timeCode = formatTime(item.startTime, true);
    lines.push(`[${timeCode}]${item.text}`);
  }

  return lines.join('\n');
}

/**
 * Exports lyric items to SubRip (.SRT) subtitle format
 */
export function exportToSrt(lyrics: LyricItem[]): string {
  const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime);
  const blocks: string[] = [];

  sorted.forEach((item, index) => {
    const startStr = formatTimeSrt(item.startTime);
    const endStr = formatTimeSrt(item.endTime);
    blocks.push(`${index + 1}\n${startStr} --> ${endStr}\n${item.text}\n`);
  });

  return blocks.join('\n');
}
