/**
 * Professional Web Audio Engine with AudioContext, AnalyserNode,
 * Synthesizer fallback, and MediaStream destination for export.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  // Synthesizer nodes for procedural sample playback
  private isSynthMode: boolean = false;
  private synthInterval: number | null = null;
  private synthStartTime: number = 0;
  private synthCurrentTime: number = 0;
  private synthDuration: number = 38;
  private isSynthPlaying: boolean = false;
  private synthPreset: 'acoustic' | 'synthwave' | 'chill' = 'acoustic';

  private dataArray: Uint8Array | null = null;
  private timeDataArray: Uint8Array | null = null;
  private onTimeUpdateCallbacks: Set<(time: number) => void> = new Set();
  private onEndedCallbacks: Set<() => void> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    // Lazy init context on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.ctx.createGain();
      this.streamDest = this.ctx.createMediaStreamDestination();

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.timeDataArray = new Uint8Array(bufferLength);

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDest);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public async loadAudioUrl(url: string): Promise<number> {
    this.initContext();
    this.stopSynth();
    this.isSynthMode = false;

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = url;

    return new Promise((resolve, reject) => {
      if (!this.audioElement) return reject(new Error('No audio element'));

      this.audioElement.onloadedmetadata = () => {
        if (!this.audioElement || !this.ctx || !this.gainNode) return;
        
        try {
          if (!this.sourceNode) {
            this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
            this.sourceNode.connect(this.gainNode);
          }
        } catch {
          // Already connected
        }

        this.setupAudioListeners();
        resolve(this.audioElement.duration || 0);
      };

      this.audioElement.onerror = () => {
        reject(new Error('Failed to load audio file'));
      };
    });
  }

  public loadSampleTrack(preset: 'acoustic' | 'synthwave' | 'chill', duration: number = 38) {
    this.initContext();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    this.isSynthMode = true;
    this.synthPreset = preset;
    this.synthDuration = duration;
    this.synthCurrentTime = 0;
  }

  private setupAudioListeners() {
    if (!this.audioElement) return;

    this.audioElement.onended = () => {
      this.stopProgressLoop();
      this.onEndedCallbacks.forEach(cb => cb());
    };
  }

  public async play(): Promise<void> {
    this.initContext();

    if (this.isSynthMode) {
      this.playSynth();
      this.startProgressLoop();
      return;
    }

    if (this.audioElement) {
      try {
        await this.audioElement.play();
        this.startProgressLoop();
      } catch (err) {
        console.warn('Playback error:', err);
      }
    }
  }

  public pause(): void {
    if (this.isSynthMode) {
      this.pauseSynth();
      this.stopProgressLoop();
      return;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.stopProgressLoop();
    }
  }

  public seek(timeInSeconds: number): void {
    const clamped = Math.max(0, Math.min(timeInSeconds, this.getDuration()));
    if (this.isSynthMode) {
      this.synthCurrentTime = clamped;
      this.synthStartTime = performance.now() - (clamped * 1000);
      this.notifyTime(clamped);
      return;
    }

    if (this.audioElement) {
      this.audioElement.currentTime = clamped;
      this.notifyTime(clamped);
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = clamped;
    }
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
  }

  public setPlaybackRate(rate: number): void {
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }

  public getCurrentTime(): number {
    if (this.isSynthMode) {
      return this.synthCurrentTime;
    }
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  public getDuration(): number {
    if (this.isSynthMode) {
      return this.synthDuration;
    }
    return this.audioElement ? (this.audioElement.duration || 0) : 0;
  }

  public isPlaying(): boolean {
    if (this.isSynthMode) {
      return this.isSynthPlaying;
    }
    return this.audioElement ? !this.audioElement.paused && !this.audioElement.ended : false;
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return new Uint8Array(64).fill(0);
  }

  public getWaveformData(): Uint8Array {
    if (this.analyser && this.timeDataArray) {
      this.analyser.getByteTimeDomainData(this.timeDataArray);
      return this.timeDataArray;
    }
    return new Uint8Array(64).fill(128);
  }

  public getAudioEnergy(): number {
    const freq = this.getFrequencyData();
    if (!freq || freq.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < freq.length; i++) {
      sum += freq[i];
    }
    return sum / (freq.length * 255);
  }

  public getAudioStream(): MediaStream | null {
    return this.streamDest ? this.streamDest.stream : null;
  }

  public onTimeUpdate(cb: (time: number) => void): () => void {
    this.onTimeUpdateCallbacks.add(cb);
    return () => this.onTimeUpdateCallbacks.delete(cb);
  }

  public onEnded(cb: () => void): () => void {
    this.onEndedCallbacks.add(cb);
    return () => this.onEndedCallbacks.delete(cb);
  }

  private notifyTime(time: number) {
    this.onTimeUpdateCallbacks.forEach(cb => cb(time));
  }

  private startProgressLoop() {
    this.stopProgressLoop();
    const tick = () => {
      if (this.isSynthMode && this.isSynthPlaying) {
        const elapsed = (performance.now() - this.synthStartTime) / 1000;
        this.synthCurrentTime = elapsed;
        this.notifyTime(elapsed);

        if (this.synthCurrentTime >= this.synthDuration) {
          this.pause();
          this.seek(0);
          this.onEndedCallbacks.forEach(cb => cb());
          return;
        }
      } else if (this.audioElement && !this.audioElement.paused) {
        this.notifyTime(this.audioElement.currentTime);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopProgressLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /* ---------------- Synth Implementation ---------------- */
  private playSynth() {
    this.isSynthPlaying = true;
    this.synthStartTime = performance.now() - (this.synthCurrentTime * 1000);
    this.startSynthNotes();
  }

  private pauseSynth() {
    this.isSynthPlaying = false;
    this.stopSynth();
  }

  private stopSynth() {
    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private startSynthNotes() {
    this.stopSynth();
    // Play warm melodic chord progression and pulse
    let step = 0;
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C Major
      [220.00, 261.63, 329.63, 440.00], // A Minor
      [174.61, 220.00, 261.63, 349.23], // F Major
      [196.00, 246.94, 293.66, 392.00], // G Major
    ];

    const playChordStep = () => {
      if (!this.ctx || !this.gainNode || !this.isSynthPlaying) return;

      const chord = chords[Math.floor(step / 4) % chords.length];
      const noteFreq = chord[step % chord.length];

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = this.synthPreset === 'synthwave' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);

      oscGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);

      // Bass note on downbeats
      if (step % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(chord[0] / 2, this.ctx.currentTime);

        bassGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

        bassOsc.connect(bassGain);
        bassGain.connect(this.gainNode);

        bassOsc.start();
        bassOsc.stop(this.ctx.currentTime + 0.85);
      }

      step++;
    };

    playChordStep();
    this.synthInterval = window.setInterval(playChordStep, 450);
  }
}

export const audioEngine = new AudioEngine();
