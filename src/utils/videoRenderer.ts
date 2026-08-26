import { ProjectData, LyricItem } from '../types';
import { audioEngine } from './audioEngine';
import { Muxer as Mp4Muxer, ArrayBufferTarget } from 'mp4-muxer';
import fixWebmDuration from 'webm-duration-fix';

export interface RenderProgress {
  progress: number; // 0 to 1
  currentTime: number;
  totalDuration: number;
  currentFrame: number;
  totalFrames: number;
  status: 'initializing' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
}

export function drawLyricFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number,
  project: ProjectData,
  bgImageElem: HTMLImageElement | HTMLVideoElement | null,
  frequencyData: Uint8Array,
  particles: Array<{ x: number; y: number; size: number; speedY: number; opacity: number }>
) {
  // 1. Clear background
  ctx.clearRect(0, 0, width, height);

  // 2. Draw Background
  if (project.background.type === 'gradient' && project.background.gradientPreset) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (project.background.gradientPreset.includes('Crimson')) {
      grad.addColorStop(0, '#4c0519');
      grad.addColorStop(0.5, '#2e1065');
      grad.addColorStop(1, '#09090b');
    } else if (project.background.gradientPreset.includes('Synthwave')) {
      grad.addColorStop(0, '#18032c');
      grad.addColorStop(0.5, '#3b0764');
      grad.addColorStop(1, '#05050d');
    } else {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (bgImageElem && (bgImageElem instanceof HTMLImageElement ? bgImageElem.complete : true)) {
    ctx.save();

    // Filters: brightness, blur
    const brightness = (project.background.brightness ?? 60) / 100;
    const blur = project.background.blur ?? 0;
    ctx.filter = `brightness(${brightness}) blur(${blur}px)`;

    const imgWidth = bgImageElem instanceof HTMLImageElement ? bgImageElem.naturalWidth || 1920 : (bgImageElem as HTMLVideoElement).videoWidth || 1920;
    const imgHeight = bgImageElem instanceof HTMLImageElement ? bgImageElem.naturalHeight || 1080 : (bgImageElem as HTMLVideoElement).videoHeight || 1080;

    let drawW = width;
    let drawH = height;
    let drawX = 0;
    let drawY = 0;

    if (project.background.fit === 'cover') {
      const imgRatio = imgWidth / imgHeight;
      const canvasRatio = width / height;

      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      }
    } else {
      // Contain
      const imgRatio = imgWidth / imgHeight;
      const canvasRatio = width / height;

      if (imgRatio > canvasRatio) {
        drawW = width;
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      } else {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      }
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(bgImageElem, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    // Default dark cinematic background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.8);
    bgGrad.addColorStop(0, '#18181b');
    bgGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Color Overlay & Vignette
  if (project.background.overlayOpacity > 0) {
    ctx.save();
    ctx.fillStyle = project.background.overlayColor || '#000000';
    ctx.globalAlpha = project.background.overlayOpacity / 100;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (project.background.vignette > 0) {
    ctx.save();
    const vigGrad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, `rgba(0,0,0,${project.background.vignette / 100})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 4. Particle System Overlay
  if (project.animation.particleOverlay && project.animation.particleOverlay !== 'none' && particles.length > 0) {
    ctx.save();
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, p.size * (width / 1000), 0, Math.PI * 2);
      if (project.animation.particleOverlay === 'stars') {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      } else if (project.animation.particleOverlay === 'bokeh') {
        ctx.fillStyle = `rgba(244, 114, 182, ${p.opacity * 0.6})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Audio Visualizer
  const vizType = project.animation.audioVisualizer;
  if (vizType && vizType !== 'none' && frequencyData && frequencyData.length > 0) {
    drawVisualizer(ctx, width, height, vizType, frequencyData, project.animation.visualizerColor || '#f59e0b', project.animation.visualizerPosition);
  }

  // 6. Draw Title Card at Start of Video (if active)
  drawIntroTitleCard(ctx, width, height, currentTime, project);

  // 7. Draw Lyrics (suppressed when title card is actively showing)
  drawActiveLyrics(ctx, width, height, currentTime, project);
}

export function isIntroTitleActive(project: ProjectData, currentTime: number): boolean {
  const intro = project.introTitle;
  if (!intro || intro.enabled === false) return false;
  const startTime = intro.startTime ?? 0;
  const endTime = intro.endTime ?? (intro.duration !== undefined ? startTime + intro.duration : 3.5);
  return currentTime >= startTime && currentTime <= endTime;
}

function drawIntroTitleCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number,
  project: ProjectData
) {
  const intro = project.introTitle;
  // If disabled explicitly, skip
  if (!intro || intro.enabled === false) return;

  const startTime = intro.startTime ?? 0;
  const endTime = intro.endTime ?? (intro.duration !== undefined ? startTime + intro.duration : 3.5);

  if (currentTime < startTime || currentTime > endTime) return;

  const totalDuration = Math.max(0.2, endTime - startTime);
  const timeSinceStart = currentTime - startTime;

  const titleText = (intro.title || project.title || 'Untitled Track').trim();
  const artistText = (intro.artist || project.artist || '').trim();
  const subtitleText = (intro.subtitle ?? 'OFFICIAL LYRIC VIDEO').trim();
  const theme = intro.theme || 'cinematic';
  const animation = intro.animation || 'fade';
  const textColor = intro.textColor || '#ffffff';
  const accentColor = intro.accentColor || project.font.accentColor || '#f59e0b';
  const fontMultiplier = intro.fontSizeMultiplier || 1.0;

  // Calculate smooth fade in and fade out
  const fadeInDuration = Math.min(0.5, totalDuration * 0.25);
  const fadeOutDuration = Math.min(0.6, totalDuration * 0.25);
  const inAlpha = Math.max(0, Math.min(1, timeSinceStart / Math.max(0.01, fadeInDuration)));
  const outAlpha = Math.max(0, Math.min(1, (endTime - currentTime) / Math.max(0.01, fadeOutDuration)));
  const alpha = Math.min(inAlpha, outAlpha);

  if (alpha <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Calculate animation transforms
  let scale = 1.0;
  let offsetY = 0;

  if (animation === 'zoom') {
    scale = 0.94 + (timeSinceStart / totalDuration) * 0.08;
  } else if (animation === 'slide-up') {
    offsetY = (1 - inAlpha) * (height * 0.04);
  }

  const centerY = height * 0.48 + offsetY;
  const baseTitleSize = Math.floor((width * 0.052) * fontMultiplier);
  const baseSubtitleSize = Math.max(12, Math.floor(baseTitleSize * 0.35));
  const baseArtistSize = Math.max(14, Math.floor(baseTitleSize * 0.42));

  // Determine font family
  const titleFontFamily = project.font.fontFamily || "'Playfair Display', serif";

  if (theme === 'cinematic') {
    // Cinematic theme: Centered title with letterspaced subtitle & accent divider
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtitle / Tag above
    if (subtitleText) {
      ctx.font = `700 ${baseSubtitleSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 10;
      ctx.fillText(`• ${subtitleText.toUpperCase()} •`, width / 2, centerY - baseTitleSize * 1.1);
    }

    // Main Title
    ctx.font = `bold ${Math.floor(baseTitleSize * scale)}px ${titleFontFamily}`;
    ctx.fillStyle = textColor;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillText(titleText, width / 2, centerY);

    // Accent Divider line
    const dividerWidth = Math.min(width * 0.35, ctx.measureText(titleText).width * 0.8 + 40);
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2 * (width / 1000);
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.moveTo((width - dividerWidth) / 2, centerY + baseTitleSize * 0.7);
    ctx.lineTo((width + dividerWidth) / 2, centerY + baseTitleSize * 0.7);
    ctx.stroke();

    // Artist below
    if (artistText) {
      ctx.font = `500 ${baseArtistSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 10;
      ctx.fillText(artistText, width / 2, centerY + baseTitleSize * 1.25);
    }
  } else if (theme === 'minimal') {
    // Minimal theme: Modern clean badge box
    const cardWidth = Math.min(width * 0.75, width * 0.65);
    const cardHeight = baseTitleSize * 2.8;
    const cardX = (width - cardWidth) / 2;
    const cardY = centerY - cardHeight / 2;

    // Glass backdrop
    ctx.fillStyle = 'rgba(15, 15, 20, 0.75)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 16 * (width / 1000));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main Title
    ctx.font = `700 ${Math.floor(baseTitleSize * 0.9 * scale)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(titleText, width / 2, centerY - baseTitleSize * 0.25);

    // Artist & Subtitle
    ctx.font = `500 ${baseSubtitleSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = accentColor;
    const infoText = [artistText, subtitleText].filter(Boolean).join('  •  ');
    ctx.fillText(infoText, width / 2, centerY + baseTitleSize * 0.55);
  } else if (theme === 'neon') {
    // Neon theme: Glowing electric title card
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (subtitleText) {
      ctx.font = `800 ${baseSubtitleSize}px 'Syne', sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 15;
      ctx.fillText(`[ ${subtitleText.toUpperCase()} ]`, width / 2, centerY - baseTitleSize * 1.05);
    }

    ctx.font = `900 ${Math.floor(baseTitleSize * scale)}px 'Syne', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 25;
    ctx.fillText(titleText.toUpperCase(), width / 2, centerY);

    if (artistText) {
      ctx.font = `700 ${baseArtistSize}px 'Syne', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 12;
      ctx.fillText(`PRODUCED BY ${artistText.toUpperCase()}`, width / 2, centerY + baseTitleSize * 1.05);
    }
  } else if (theme === 'bold-center') {
    // Bold-center theme: Massive high-impact punchy typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `900 ${Math.floor(baseTitleSize * 1.25 * scale)}px 'Oswald', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4 * (width / 1000);
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 20;
    ctx.strokeText(titleText.toUpperCase(), width / 2, centerY);
    ctx.fillText(titleText.toUpperCase(), width / 2, centerY);

    if (artistText) {
      ctx.font = `700 ${baseArtistSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.fillText(artistText.toUpperCase(), width / 2, centerY + baseTitleSize * 1.1);
    }
  } else {
    // Vintage / Poetic theme
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `italic 400 ${baseSubtitleSize}px 'Playfair Display', serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText('✦  ✦  ✦', width / 2, centerY - baseTitleSize * 1.0);

    ctx.font = `700 ${Math.floor(baseTitleSize * scale)}px 'Playfair Display', serif`;
    ctx.fillStyle = textColor;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 14;
    ctx.fillText(titleText, width / 2, centerY);

    if (artistText) {
      ctx.font = `italic 500 ${baseArtistSize}px 'Playfair Display', serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`by ${artistText}`, width / 2, centerY + baseTitleSize * 1.05);
    }
  }

  ctx.restore();
}

function drawVisualizer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: string,
  data: Uint8Array,
  color: string,
  position: 'bottom' | 'center' | 'under-text'
) {
  ctx.save();
  const basePosY = position === 'center' ? height * 0.5 : position === 'under-text' ? height * 0.72 : height * 0.92;

  if (type === 'bars' || type === 'mirror-spectrum') {
    const barCount = 48;
    const barWidth = (width * 0.8) / barCount;
    const startX = width * 0.1;
    const isMirror = type === 'mirror-spectrum';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    for (let i = 0; i < barCount; i++) {
      const dataIdx = Math.floor((i / barCount) * (data.length * 0.6));
      const val = data[dataIdx] || 0;
      const barHeight = Math.max(3, (val / 255) * (height * 0.18));
      const x = startX + i * barWidth;

      if (isMirror) {
        ctx.fillRect(x + 2, basePosY - barHeight / 2, barWidth - 4, barHeight);
      } else {
        ctx.fillRect(x + 2, basePosY - barHeight, barWidth - 4, barHeight);
      }
    }
  } else if (type === 'wave') {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * (width / 1000);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    const sliceWidth = width / (data.length * 0.5);
    let x = 0;

    for (let i = 0; i < data.length * 0.5; i++) {
      const v = data[i] / 255.0;
      const y = basePosY + (v - 0.5) * (height * 0.2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
  } else if (type === 'circle') {
    const centerX = width / 2;
    const centerY = height * 0.5;
    const radius = Math.min(width, height) * 0.22;
    const numPoints = 64;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * (width / 1000);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const dataIdx = Math.floor((i % numPoints / numPoints) * (data.length * 0.5));
      const val = data[dataIdx] || 0;
      const amp = (val / 255) * (radius * 0.35);
      const r = radius + amp;

      const px = centerX + Math.cos(angle) * r;
      const py = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function drawActiveLyrics(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number,
  project: ProjectData
) {
  const { font, animation, lyrics } = project;
  if (!lyrics || lyrics.length === 0) return;

  const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime);

  // If intro title is active AND song hasn't reached the first lyric line yet, let intro card take sole focus
  if (isIntroTitleActive(project, currentTime) && sorted.length > 0 && currentTime < sorted[0].startTime) {
    return;
  }

  // Find active lyric index
  let activeIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (currentTime >= sorted[i].startTime && currentTime <= sorted[i].endTime) {
      activeIndex = i;
      break;
    }
  }

  // If between lyrics, find the closest upcoming or previous
  if (activeIndex === -1) {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].startTime > currentTime) {
        break;
      }
      activeIndex = i; // last passed
    }
  }

  if (activeIndex === -1 && sorted.length > 0 && currentTime < sorted[0].startTime) {
    // Song hasn't reached first lyric, show first line faintly if preview enabled
    activeIndex = 0;
  }

  const baseSize = Math.floor((width * 0.042) * (font.fontSizeRatio || 1.0));
  const fontFam = font.fontFamily || "'Plus Jakarta Sans', sans-serif";
  const weight = font.fontWeight === '900' ? '900' : font.fontWeight === 'bold' ? '700' : '500';
  const style = font.fontStyle === 'italic' ? 'italic' : 'normal';

  // Base Y position
  let centerY = height * 0.5;
  if (font.verticalPosition === 'top') centerY = height * 0.3;
  if (font.verticalPosition === 'bottom') centerY = height * 0.72;

  const lineSpacing = baseSize * 1.5;

  // Determine lines to draw
  const linesToRender: Array<{ item: LyricItem; index: number; y: number; isCurrent: boolean; opacity: number; scale: number }> = [];

  if (font.maxLinesVisible === 1 || !animation.showSurroundingLyrics) {
    if (activeIndex >= 0 && activeIndex < sorted.length) {
      linesToRender.push({
        item: sorted[activeIndex],
        index: activeIndex,
        y: centerY,
        isCurrent: currentTime >= sorted[activeIndex].startTime && currentTime <= sorted[activeIndex].endTime,
        opacity: 1,
        scale: 1,
      });
    }
  } else {
    // Show surrounding lines (e.g., prev, current, next)
    const prevIdx = activeIndex - 1;
    const currIdx = activeIndex;
    const nextIdx = activeIndex + 1;

    if (prevIdx >= 0 && prevIdx < sorted.length) {
      linesToRender.push({
        item: sorted[prevIdx],
        index: prevIdx,
        y: centerY - lineSpacing,
        isCurrent: false,
        opacity: animation.surroundingOpacity || 0.35,
        scale: 0.88,
      });
    }

    if (currIdx >= 0 && currIdx < sorted.length) {
      const isActuallyActive = currentTime >= sorted[currIdx].startTime && currentTime <= sorted[currIdx].endTime;
      linesToRender.push({
        item: sorted[currIdx],
        index: currIdx,
        y: centerY,
        isCurrent: isActuallyActive,
        opacity: isActuallyActive ? 1.0 : (animation.surroundingOpacity || 0.45),
        scale: 1.0,
      });
    }

    if (nextIdx >= 0 && nextIdx < sorted.length) {
      linesToRender.push({
        item: sorted[nextIdx],
        index: nextIdx,
        y: centerY + lineSpacing,
        isCurrent: false,
        opacity: animation.surroundingOpacity || 0.35,
        scale: 0.88,
      });
    }
  }

  // Render each line
  for (const lineObj of linesToRender) {
    const { item, y, isCurrent, opacity, scale } = lineObj;
    let displayText = item.text;

    if (font.textTransform === 'uppercase') {
      displayText = displayText.toUpperCase();
    } else if (font.textTransform === 'capitalize') {
      displayText = displayText.replace(/\b\w/g, l => l.toUpperCase());
    }

    ctx.save();

    // Animation entry calculation
    const timeSinceStart = currentTime - item.startTime;
    const progress = Math.max(0, Math.min(1, timeSinceStart / Math.max(0.1, animation.duration)));

    let lineAlpha = opacity;
    let lineScale = scale;
    let offsetY = 0;

    if (isCurrent) {
      if (animation.entryEffect === 'fade') {
        lineAlpha = Math.min(1, progress * 1.2);
      } else if (animation.entryEffect === 'pop') {
        lineScale = scale * (0.8 + 0.2 * Math.sin(progress * Math.PI / 2));
      } else if (animation.entryEffect === 'slide-up') {
        offsetY = (1 - progress) * (baseSize * 0.6);
        lineAlpha = Math.min(1, progress * 1.5);
      } else if (animation.entryEffect === 'slide-down') {
        offsetY = -(1 - progress) * (baseSize * 0.6);
        lineAlpha = Math.min(1, progress * 1.5);
      } else if (animation.entryEffect === 'neon-pulse') {
        lineAlpha = 0.8 + 0.2 * Math.sin(currentTime * 8);
      }
    }

    // Setup Text Font
    const currentFontSize = Math.floor(baseSize * lineScale);
    ctx.font = `${style} ${weight} ${currentFontSize}px ${fontFam}`;
    ctx.textAlign = font.alignment || 'center';
    ctx.textBaseline = 'middle';

    const textX = font.alignment === 'left' ? width * 0.12 : font.alignment === 'right' ? width * 0.88 : width / 2;
    const textY = y + offsetY;

    // Apply Shadows & Glow
    if (font.textShadow === 'soft') {
      ctx.shadowColor = font.shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    } else if (font.textShadow === 'heavy' || font.textShadow === 'cinematic') {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    } else if (font.textShadow === 'neon' || font.textShadow === 'glow') {
      ctx.shadowColor = font.shadowColor || font.accentColor || '#ec4899';
      ctx.shadowBlur = isCurrent ? 24 : 10;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, lineAlpha));

    // Stroke Outline
    if (font.strokeWidth > 0) {
      ctx.strokeStyle = font.strokeColor || '#000000';
      ctx.lineWidth = font.strokeWidth * (width / 1000);
      ctx.strokeText(displayText, textX, textY);
    }

    // Fill main text
    if (isCurrent && animation.entryEffect === 'karaoke-wipe') {
      // Karaoke color fill from left to right across line duration
      const lineDuration = Math.max(0.5, item.endTime - item.startTime);
      const wipeProgress = Math.max(0, Math.min(1, (currentTime - item.startTime) / lineDuration));

      const textMetrics = ctx.measureText(displayText);
      const textWidth = textMetrics.width;
      const startX = font.alignment === 'left' ? textX : font.alignment === 'right' ? textX - textWidth : textX - textWidth / 2;

      // Draw base inactive color
      ctx.fillStyle = font.textColor || '#ffffff';
      ctx.fillText(displayText, textX, textY);

      // Draw clipped highlight overlay
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, textY - currentFontSize, textWidth * wipeProgress, currentFontSize * 2);
      ctx.clip();
      ctx.fillStyle = animation.karaokeFillColor || font.accentColor || '#fbbf24';
      ctx.shadowColor = animation.karaokeFillColor || '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.fillText(displayText, textX, textY);
      ctx.restore();
    } else {
      ctx.fillStyle = isCurrent ? (font.textColor || '#ffffff') : 'rgba(255,255,255,0.7)';
      ctx.fillText(displayText, textX, textY);
    }

    ctx.restore();
  }
}

/**
 * Safely load an image and verify that drawing it will not taint the canvas for MediaStream capture
 */
async function loadSafeImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 2;
        testCanvas.height = 2;
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          testCtx.drawImage(img, 0, 0, 2, 2);
          testCtx.getImageData(0, 0, 1, 1); // Throws SecurityError if tainted
          resolve(img);
          return;
        }
      } catch (e) {
        console.warn('Image is cross-origin tainted, falling back to procedural gradient for video export:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}


/**
 * High quality client-side canvas video recorder using MediaRecorder and AudioContext
 */
export async function renderAndExportVideo(
  project: ProjectData,
  canvasWidth: number,
  canvasHeight: number,
  onProgress: (info: RenderProgress) => void,
  cancelSignal: { cancelled: boolean },
  customDuration?: number,
  preferredFormat: 'mp4' | 'webm' = 'mp4'
): Promise<Blob> {
  // Determine duration from customDuration, audio duration, or maximum lyric timestamp
  const maxLyricEndTime = project.lyrics && project.lyrics.length > 0
    ? Math.max(...project.lyrics.map(l => l.endTime || 0))
    : 0;

  let duration = customDuration || project.audio.duration || (maxLyricEndTime > 0 ? maxLyricEndTime + 2 : 30);
  if (!duration || duration <= 0 || isNaN(duration)) {
    duration = maxLyricEndTime > 0 ? maxLyricEndTime + 2 : 30;
  }
  
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // Even dimensions required for H.264 / AVC video codecs
  const width = Math.floor(canvasWidth / 2) * 2;
  const height = Math.floor(canvasHeight / 2) * 2;

  // 1. Create off-screen rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to get 2D canvas context for rendering.');

  // 2. Prepare Background Media safely (checking for CORS tainting)
  let bgMedia: HTMLImageElement | HTMLVideoElement | null = null;
  if (project.background.type === 'image' && project.background.url) {
    bgMedia = await loadSafeImage(project.background.url);
  }

  // 3. Initialize Particles
  const particles: Array<{ x: number; y: number; size: number; speedY: number; opacity: number }> = [];
  if (project.animation.particleOverlay && project.animation.particleOverlay !== 'none') {
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 4 + 1,
        speedY: (Math.random() * 0.001) + 0.0005,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
  }

  // 4. Try WebCodecs MP4 Muxer for pristine, 100% seekable MP4 with FastStart header
  if (preferredFormat === 'mp4' && typeof window.VideoEncoder !== 'undefined') {
    try {
      const bitrate = width >= 1920 || height >= 1920 ? 8000000 : 4000000;
      let chosenCodec = 'avc1.4d002a'; // H.264 Main Profile

      // Verify codec support
      const check1 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.4d002a',
        width,
        height,
        bitrate,
        framerate: fps,
      });

      if (!check1.supported) {
        const check2 = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42001f', // H.264 Baseline Profile
          width,
          height,
          bitrate,
          framerate: fps,
        });
        if (check2.supported) {
          chosenCodec = 'avc1.42001f';
        }
      }

      const muxer = new Mp4Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width,
          height,
          frameRate: fps,
        },
        fastStart: 'in-memory',
      });

      let encoderError: Error | null = null;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          console.error('VideoEncoder error:', e);
          encoderError = e;
        },
      });

      videoEncoder.configure({
        codec: chosenCodec,
        width,
        height,
        bitrate,
        framerate: fps,
      });

      onProgress({
        progress: 0.02,
        currentTime: 0,
        totalDuration: duration,
        currentFrame: 0,
        totalFrames,
        status: 'rendering',
      });

      // Synchronously step and encode each exact frame for pristine time-skipping
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (cancelSignal.cancelled) {
          videoEncoder.close();
          onProgress({
            progress: 0,
            currentTime: 0,
            totalDuration: duration,
            currentFrame: frameIdx,
            totalFrames,
            status: 'cancelled',
          });
          throw new Error('Export was cancelled by user.');
        }

        if (encoderError) {
          throw encoderError;
        }

        const currentTime = (frameIdx / fps);
        const progress = Math.min(0.95, (frameIdx + 1) / totalFrames);

        // Update particles
        for (const p of particles) {
          p.y -= p.speedY;
          if (p.y < 0) p.y = 1;
        }

        // Draw precise frame
        drawLyricFrame(ctx, width, height, currentTime, project, bgMedia, new Uint8Array(64).fill(0), particles);

        const timestampUs = Math.round((frameIdx / fps) * 1_000_000);
        const videoFrame = new VideoFrame(canvas, { timestamp: timestampUs });

        // Keyframe every 2 seconds for high-precision timeline scrubbing
        const isKeyFrame = frameIdx % (fps * 2) === 0;
        videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
        videoFrame.close();

        // Periodically yield to UI thread so progress updates smoothly
        if (frameIdx % 6 === 0 || frameIdx === totalFrames - 1) {
          onProgress({
            progress,
            currentTime,
            totalDuration: duration,
            currentFrame: frameIdx + 1,
            totalFrames,
            status: 'rendering',
          });
          await new Promise(r => setTimeout(r, 0));
        }
      }

      onProgress({
        progress: 0.96,
        currentTime: duration,
        totalDuration: duration,
        currentFrame: totalFrames,
        totalFrames,
        status: 'encoding',
      });

      await videoEncoder.flush();
      videoEncoder.close();
      muxer.finalize();

      const mp4Buffer = muxer.target.buffer;
      const mp4Blob = new Blob([mp4Buffer], { type: 'video/mp4' });

      onProgress({
        progress: 1.0,
        currentTime: duration,
        totalDuration: duration,
        currentFrame: totalFrames,
        totalFrames,
        status: 'completed',
      });

      return mp4Blob;
    } catch (err: any) {
      if (cancelSignal.cancelled) {
        throw new Error('Export was cancelled by user.');
      }
      console.warn('WebCodecs MP4 muxer failed, falling back to MediaRecorder WebM pipeline:', err);
    }
  }

  // 5. Setup MediaStream & MediaRecorder with full seek table repair (WebM)
  let videoStream: MediaStream;
  try {
    videoStream = canvas.captureStream(fps);
  } catch (err: any) {
    throw new Error(`Browser canvas capture not supported: ${err?.message || err}`);
  }

  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

  // Audio track (optional, if available)
  try {
    const audioStream = audioEngine.getAudioStream();
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      audioTracks.forEach(track => {
        if (track.readyState === 'live') {
          combinedStream.addTrack(track);
        }
      });
    }
  } catch (err) {
    console.warn('Audio stream attach warning:', err);
  }

  // Pick supported mime type based on preferred format
  const candidateMimes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    '',
  ];

  let chosenMime = '';
  for (const m of candidateMimes) {
    if (m === '' || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))) {
      chosenMime = m;
      break;
    }
  }

  const bitrate = width >= 1920 || height >= 1920 ? 8000000 : 4000000;
  
  let recorder: MediaRecorder;
  try {
    const options: MediaRecorderOptions = { videoBitsPerSecond: bitrate };
    if (chosenMime) {
      options.mimeType = chosenMime;
    }
    recorder = new MediaRecorder(combinedStream, options);
  } catch (e: any) {
    console.warn('Failed to create MediaRecorder with options, trying standard:', e);
    recorder = new MediaRecorder(combinedStream);
    chosenMime = recorder.mimeType || 'video/webm';
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Draw initial frame immediately so stream has active visual buffer
  drawLyricFrame(ctx, width, height, 0, project, bgMedia, new Uint8Array(64).fill(0), particles);

  // Start audio and recording
  audioEngine.initContext();
  audioEngine.seek(0);
  try {
    await audioEngine.play();
  } catch (err) {
    console.warn('Audio play trigger during export:', err);
  }

  try {
    recorder.start(200); // Emit chunks every 200ms
  } catch (err: any) {
    throw new Error(`Failed to start MediaRecorder: ${err?.message || err}`);
  }

  return new Promise((resolve, reject) => {
    const renderStartTime = performance.now();
    let frame = 0;
    let isFinished = false;
    let fallbackTimeoutId: number | null = null;

    const cleanupStreamsAndAudio = () => {
      try {
        audioEngine.pause();
        audioEngine.seek(0);
      } catch {}
      try {
        videoStream.getTracks().forEach(t => t.stop());
      } catch {}
    };

    const finishExport = async () => {
      if (isFinished) return;
      isFinished = true;
      if (fallbackTimeoutId) {
        window.clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }

      cleanupStreamsAndAudio();

      if (chunks.length === 0) {
        reject(new Error('MediaRecorder produced no video data chunks. Please try exporting in 720p.'));
        return;
      }

      const mime = recorder.mimeType || chosenMime || 'video/webm';
      const rawBlob = new Blob(chunks, { type: mime });
      let finalBlob = rawBlob;

      // Reconstruct EBML Cues Seek Table and Duration using ts-ebml fixer
      try {
        finalBlob = await fixWebmDuration(rawBlob);
      } catch (e) {
        console.warn('fixWebmDuration fallback warning:', e);
        finalBlob = rawBlob;
      }

      onProgress({
        progress: 1.0,
        currentTime: duration,
        totalDuration: duration,
        currentFrame: totalFrames,
        totalFrames,
        status: 'completed',
      });

      resolve(finalBlob);
    };

    recorder.onstop = () => {
      finishExport();
    };

    recorder.onerror = (errEvent: any) => {
      console.warn('MediaRecorder error event:', errEvent);
      if (chunks.length > 0) {
        finishExport();
      } else {
        cleanupStreamsAndAudio();
        reject(new Error('Video recording error during export.'));
      }
    };

    const stopRecordingCleanly = () => {
      onProgress({
        progress: 0.99,
        currentTime: duration,
        totalDuration: duration,
        currentFrame: totalFrames,
        totalFrames,
        status: 'encoding',
      });

      try {
        if (recorder.state === 'recording' || recorder.state === 'paused') {
          recorder.stop();
        }
      } catch (e) {
        console.warn('recorder stop error:', e);
      }

      // Safety timeout: If onstop doesn't fire within 3000ms, force finish
      fallbackTimeoutId = window.setTimeout(() => {
        if (!isFinished) {
          console.warn('Forcing export completion via safety timeout fallback.');
          finishExport();
        }
      }, 3000);
    };

    const renderLoop = () => {
      if (isFinished) return;

      if (cancelSignal.cancelled) {
        isFinished = true;
        try {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        } catch {}
        cleanupStreamsAndAudio();

        onProgress({
          progress: 0,
          currentTime: 0,
          totalDuration: duration,
          currentFrame: frame,
          totalFrames,
          status: 'cancelled',
        });
        return reject(new Error('Export was cancelled by user.'));
      }

      // Calculate currentTime reliably using elapsed wall-clock and audio engine time
      const elapsed = (performance.now() - renderStartTime) / 1000;
      const audioTime = audioEngine.getCurrentTime();
      const currentTime = Math.min(duration, Math.max(0, audioTime > 0.02 ? audioTime : elapsed));
      const progress = Math.min(0.99, currentTime / duration);

      // Update particles
      for (const p of particles) {
        p.y -= p.speedY;
        if (p.y < 0) p.y = 1;
      }

      const freqData = audioEngine.getFrequencyData();

      // Render Frame
      drawLyricFrame(ctx, width, height, currentTime, project, bgMedia, freqData, particles);

      frame++;
      onProgress({
        progress,
        currentTime,
        totalDuration: duration,
        currentFrame: frame,
        totalFrames,
        status: 'rendering',
      });

      // Complete when we have reached full song duration
      if (currentTime >= duration || elapsed >= duration) {
        stopRecordingCleanly();
      } else {
        requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();
  });
}
