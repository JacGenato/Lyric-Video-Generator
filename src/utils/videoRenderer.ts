import { ProjectData, LyricItem } from '../types';
import { audioEngine } from './audioEngine';

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

  // 6. Draw Lyrics
  drawActiveLyrics(ctx, width, height, currentTime, project);
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

    // Section Tag Display (e.g. [Chorus])
    if (item.section && isCurrent) {
      ctx.save();
      ctx.font = `600 ${Math.floor(baseSize * 0.42)}px ${fontFam}`;
      ctx.fillStyle = font.accentColor || '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(`• ${item.section.toUpperCase()} •`, width / 2, y - baseSize * 0.9);
      ctx.restore();
    }

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
 * High quality client-side canvas video recorder using MediaRecorder and AudioContext
 */
export async function renderAndExportVideo(
  project: ProjectData,
  canvasWidth: number,
  canvasHeight: number,
  onProgress: (info: RenderProgress) => void,
  cancelSignal: { cancelled: boolean }
): Promise<Blob> {
  const duration = project.audio.duration || 30;
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // 1. Create off-screen rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // 2. Prepare Background Media
  let bgMedia: HTMLImageElement | HTMLVideoElement | null = null;
  if (project.background.type === 'image' && project.background.url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = project.background.url;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // proceed even if image fails
    });
    bgMedia = img;
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

  // 4. Setup MediaStream & MediaRecorder
  const videoStream = canvas.captureStream(fps);
  const audioStream = audioEngine.getAudioStream();

  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
  if (audioStream) {
    audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
  }

  // Pick supported mime type
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 6000000, // 6 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // 5. Start audio and recording
  audioEngine.seek(0);
  await audioEngine.play();
  recorder.start(500);

  return new Promise((resolve, reject) => {
    let frame = 0;
    const startTime = performance.now();

    const renderLoop = () => {
      if (cancelSignal.cancelled) {
        recorder.stop();
        audioEngine.pause();
        onProgress({
          progress: 0,
          currentTime: 0,
          totalDuration: duration,
          currentFrame: frame,
          totalFrames,
          status: 'cancelled',
        });
        return reject(new Error('Export was cancelled by user'));
      }

      const currentTime = audioEngine.getCurrentTime();
      const progress = Math.min(1, currentTime / duration);

      // Update particles
      for (const p of particles) {
        p.y -= p.speedY;
        if (p.y < 0) p.y = 1;
      }

      const freqData = audioEngine.getFrequencyData();

      // Render Frame
      drawLyricFrame(ctx, canvasWidth, canvasHeight, currentTime, project, bgMedia, freqData, particles);

      frame++;
      onProgress({
        progress,
        currentTime,
        totalDuration: duration,
        currentFrame: frame,
        totalFrames,
        status: progress >= 0.99 ? 'encoding' : 'rendering',
      });

      if (currentTime >= duration || progress >= 1.0) {
        audioEngine.pause();
        recorder.stop();
      } else {
        requestAnimationFrame(renderLoop);
      }
    };

    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: chosenMime });
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

    recorder.onerror = (err) => {
      audioEngine.pause();
      reject(err);
    };

    requestAnimationFrame(renderLoop);
  });
}
