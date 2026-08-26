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
 * Universal file importer for .lrc, .srt, and .txt files
 */
export function parseLrcOrSrtOrTxt(content: string): { lyrics: LyricItem[]; title?: string; artist?: string } {
  let title: string | undefined;
  let artist: string | undefined;

  // Check for metadata tags in LRC [ti:Song Title] [ar:Artist Name]
  const titleMatch = content.match(/\[ti:\s*([^\]]+)\]/i);
  if (titleMatch) title = titleMatch[1].trim();

  const artistMatch = content.match(/\[ar:\s*([^\]]+)\]/i);
  if (artistMatch) artist = artistMatch[1].trim();

  // Check if it's an SRT subtitle file (contains "-->")
  if (content.includes('-->')) {
    const srtBlocks = content.split(/\r?\n\r?\n/);
    const items: LyricItem[] = [];

    for (const block of srtBlocks) {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      // Find timing line (e.g. 00:00:01,500 --> 00:00:04,200)
      const timeLineIdx = lines.findIndex(l => l.includes('-->'));
      if (timeLineIdx === -1) continue;

      const [startPart, endPart] = lines[timeLineIdx].split('-->').map(s => s.trim());
      const parseSrtTime = (str: string) => {
        const parts = str.replace(',', '.').split(':');
        if (parts.length === 3) {
          return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        }
        return 0;
      };

      const startTime = parseSrtTime(startPart);
      const endTime = parseSrtTime(endPart);
      const text = lines.slice(timeLineIdx + 1).join(' ').trim();

      if (text) {
        items.push({
          id: `lyric_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          text,
          startTime: Math.max(0, parseFloat(startTime.toFixed(2))),
          endTime: Math.max(startTime + 0.5, parseFloat(endTime.toFixed(2))),
        });
      }
    }

    if (items.length > 0) {
      return { lyrics: sanitizeLyricTimes(items), title, artist };
    }
  }

  // Otherwise parse as LRC or plain text
  const lyrics = parseLyricsText(content);
  return { lyrics, title, artist };
}

/**
 * Adjusts sequential lyric times so they flow naturally without overlapping
 * and maintains sequential order.
 */
export function sanitizeLyricTimes(lyrics: LyricItem[]): LyricItem[] {
  if (lyrics.length === 0) return [];

  return lyrics.map((item, idx) => {
    const nextItem = lyrics[idx + 1];
    let endTime = item.endTime;

    if (nextItem && nextItem.startTime > item.startTime) {
      // If next item starts before this item's end time, clip this end time
      endTime = Math.min(endTime, nextItem.startTime);
    }

    // Ensure minimum 0.5s duration
    if (endTime <= item.startTime) {
      endTime = parseFloat((item.startTime + 2.5).toFixed(2));
    }

    return {
      ...item,
      startTime: Math.max(0, parseFloat(item.startTime.toFixed(2))),
      endTime: parseFloat(endTime.toFixed(2)),
    };
  });
}

/**
 * Cascades timings from a given line index forward so subsequent lines
 * automatically adjust their start and end times without overlapping.
 */
export function cascadeLyricTimes(
  lyrics: LyricItem[], 
  fromIndex: number = 0, 
  defaultLineDuration: number = 3.5
): LyricItem[] {
  if (lyrics.length === 0) return [];
  const updated = [...lyrics];

  for (let i = Math.max(0, fromIndex); i < updated.length; i++) {
    const current = updated[i];
    const duration = Math.max(1.0, current.endTime - current.startTime) || defaultLineDuration;
    
    if (i > 0) {
      const prev = updated[i - 1];
      // If current line starts before or at the same time as previous line ended,
      // ripple it forward so it starts right when previous line ends
      if (current.startTime < prev.endTime) {
        current.startTime = prev.endTime;
        current.endTime = parseFloat((current.startTime + duration).toFixed(2));
      }
    }
  }

  return sanitizeLyricTimes(updated);
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
