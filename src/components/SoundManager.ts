// Procedural Sound Manager using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  
  // Continuous buzzing sound of the fly
  private buzzOsc: OscillatorNode | null = null;
  private buzzGain: GainNode | null = null;
  private targetBuzzFreq: number = 100;
  private currentBuzzFreq: number = 100;
  private buzzFilter: BiquadFilterNode | null = null;

  constructor() {
    // Lazy initialize when first sound is played (due to browser security)
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('fly_game_muted');
      this.muted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('fly_game_muted', String(this.muted));
    if (this.muted) {
      this.stopBuzz();
    } else {
      this.startBuzz();
    }
    return this.muted;
  }

  // Plays a simple beep at specified frequency and duration
  public playBeep(freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play beep', e);
    }
  }

  // Synthesizes a noise explosion for swatter slam
  public playSlam() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Lowpass filter to make it a deep thud
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseNode.start();
    } catch (e) {
      console.warn('Failed to play slam sound', e);
    }
  }

  // Food pickup sound: cheerful arpeggio
  public playEat() {
    this.playBeep(440, 0.08, 'triangle', 0.15);
    setTimeout(() => {
      this.playBeep(660, 0.12, 'triangle', 0.15);
    }, 60);
  }

  // Dash whoosh sound
  public playDash() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

      // Filter to smooth out the sawtooth and make it a "whoosh"
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Failed to play dash sound', e);
    }
  }

  // Hit sound: dissonant descending pulse
  public playHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.3);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(225, this.ctx.currentTime); // dissonant
      osc2.frequency.linearRampToValueAtTime(65, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.3);
      osc2.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Failed to play hit sound', e);
    }
  }

  public playClick() {
    this.playBeep(600, 0.05, 'sine', 0.1);
  }

  // Game over sound: sad descending sequence
  public playGameOver() {
    this.stopBuzz();
    const notes = [330, 294, 261, 196]; // Mi, Re, Do, Sol
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playBeep(freq, 0.25, 'sawtooth', 0.1);
      }, i * 200);
    });
  }

  // Start continuous fly buzzing sound
  public startBuzz() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || this.buzzOsc) return;

    try {
      this.buzzOsc = this.ctx.createOscillator();
      this.buzzGain = this.ctx.createGain();
      this.buzzFilter = this.ctx.createBiquadFilter();

      this.buzzOsc.type = 'sawtooth';
      this.buzzOsc.frequency.setValueAtTime(this.currentBuzzFreq, this.ctx.currentTime);

      this.buzzFilter.type = 'lowpass';
      this.buzzFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      // Low volume constant buzz
      this.buzzGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.buzzOsc.connect(this.buzzFilter);
      this.buzzFilter.connect(this.buzzGain);
      this.buzzGain.connect(this.ctx.destination);

      this.buzzOsc.start();
    } catch (e) {
      console.warn('Failed to start buzz sound', e);
    }
  }

  // Update buzzing pitch depending on speed and proximity to danger
  public updateBuzz(speedRatio: number, dangerLevel: number) {
    if (this.muted || !this.buzzOsc || !this.ctx || !this.buzzFilter) return;

    // Normal speed buzz is around 100-140Hz. High speed/panic goes up to 250Hz.
    this.targetBuzzFreq = 100 + speedRatio * 80 + dangerLevel * 100;
    
    // Smooth transition
    this.currentBuzzFreq += (this.targetBuzzFreq - this.currentBuzzFreq) * 0.1;
    
    try {
      this.buzzOsc.frequency.setValueAtTime(this.currentBuzzFreq, this.ctx.currentTime);
      // Open filter slightly on high tension to make it sound buzzier and louder!
      const filterFreq = 200 + speedRatio * 150 + dangerLevel * 300;
      this.buzzFilter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    } catch (e) {
      // Ignore audio update errors during rapid frame changes
    }
  }

  // Stop continuous fly buzzing sound
  public stopBuzz() {
    if (this.buzzOsc) {
      try {
        this.buzzOsc.stop();
        this.buzzOsc.disconnect();
      } catch (e) {}
      this.buzzOsc = null;
    }
    if (this.buzzGain) {
      try {
        this.buzzGain.disconnect();
      } catch (e) {}
      this.buzzGain = null;
    }
    this.buzzFilter = null;
  }
}

export const soundManager = new SoundManager();
