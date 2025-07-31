export class BackgroundAudioService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  constructor() {
    this.audioContext = new AudioContext();
    this.preloadSounds();
  }

  private async preloadSounds() {
    const sounds = {
      traffic: this.generateTrafficNoise(),
      crowd: this.generateCrowdNoise(),
      home: this.generateHomeNoise(),
      outdoor: this.generateOutdoorNoise()
    };

    for (const [name, audioBuffer] of Object.entries(sounds)) {
      this.audioBuffers.set(name, await audioBuffer);
    }
    
    console.log('🔊 Background sounds preloaded');
  }

  private async generateTrafficNoise(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const duration = 30; // 30 seconds of audio, will loop
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate complex traffic noise with varying frequencies
    for (let i = 0; i < length; i++) {
      let sample = 0;
      
      // Low rumble (engines)
      sample += Math.sin(2 * Math.PI * (40 + Math.random() * 20) * i / sampleRate) * 0.3;
      sample += Math.sin(2 * Math.PI * (60 + Math.random() * 30) * i / sampleRate) * 0.2;
      
      // Mid frequency (tires, wind)
      sample += Math.sin(2 * Math.PI * (200 + Math.random() * 400) * i / sampleRate) * 0.15;
      
      // High frequency details (brakes, horns occasionally)
      if (Math.random() < 0.001) { // Occasional horn
        sample += Math.sin(2 * Math.PI * 800 * i / sampleRate) * 0.4;
      }
      
      // Add some noise
      sample += (Math.random() - 0.5) * 0.1;
      
      // Apply envelope for realism
      const envelope = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.1 * i / sampleRate);
      data[i] = sample * envelope * 0.3; // Keep volume reasonable
    }

    return buffer;
  }

  private async generateCrowdNoise(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const duration = 25;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      let sample = 0;
      
      // Multiple voices chattering
      for (let voice = 0; voice < 8; voice++) {
        const freq = 150 + voice * 50 + Math.sin(i * 0.001) * 30;
        sample += Math.sin(2 * Math.PI * freq * i / sampleRate) * (0.05 + Math.random() * 0.05);
      }
      
      // Occasional laughter or exclamations
      if (Math.random() < 0.0005) {
        sample += Math.sin(2 * Math.PI * (400 + Math.random() * 200) * i / sampleRate) * 0.3;
      }
      
      // General murmur
      sample += (Math.random() - 0.5) * 0.2;
      
      // Vary the crowd density
      const density = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.05 * i / sampleRate);
      data[i] = sample * density * 0.25;
    }

    return buffer;
  }

  private async generateHomeNoise(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const duration = 20;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      let sample = 0;
      
      // HVAC/ventilation hum
      sample += Math.sin(2 * Math.PI * 60 * i / sampleRate) * 0.1;
      sample += Math.sin(2 * Math.PI * 120 * i / sampleRate) * 0.05;
      
      // Occasional household sounds
      if (Math.random() < 0.0002) { // Door closing
        sample += Math.sin(2 * Math.PI * 200 * i / sampleRate) * 0.4 * Math.exp(-(i % 1000) / 100);
      }
      
      if (Math.random() < 0.0001) { // Footsteps
        sample += Math.sin(2 * Math.PI * 80 * i / sampleRate) * 0.3;
      }
      
      // TV/radio in background (very quiet)
      sample += Math.sin(2 * Math.PI * (300 + Math.random() * 100) * i / sampleRate) * 0.03;
      
      // General home ambience
      sample += (Math.random() - 0.5) * 0.05;
      
      data[i] = sample * 0.2;
    }

    return buffer;
  }

  private async generateOutdoorNoise(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const duration = 35;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      let sample = 0;
      
      // Wind noise (filtered noise)
      const windNoise = (Math.random() - 0.5) * 0.3;
      sample += windNoise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * i / sampleRate));
      
      // Birds (occasional)
      if (Math.random() < 0.0003) {
        const birdFreq = 1000 + Math.random() * 2000;
        sample += Math.sin(2 * Math.PI * birdFreq * i / sampleRate) * 0.2 * Math.exp(-(i % 500) / 100);
      }
      
      // Distant traffic
      sample += Math.sin(2 * Math.PI * (50 + Math.random() * 20) * i / sampleRate) * 0.08;
      
      // Leaves rustling (high frequency)
      sample += (Math.random() - 0.5) * 0.1 * Math.sin(2 * Math.PI * 0.3 * i / sampleRate);
      
      data[i] = sample * 0.25;
    }

    return buffer;
  }

  async startBackgroundSound(type: 'traffic' | 'crowd' | 'home' | 'outdoor', volume: number) {
    if (!this.audioContext) return;
    
    // Stop current sound
    this.stopBackgroundSound();
    
    const buffer = this.audioBuffers.get(type);
    if (!buffer) {
      console.warn(`Background sound ${type} not loaded yet`);
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create source and gain nodes
    this.currentSource = this.audioContext.createBufferSource();
    this.currentGain = this.audioContext.createGain();
    
    this.currentSource.buffer = buffer;
    this.currentSource.loop = true; // Loop the background sound
    this.currentGain.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.3; // Cap at 30% of full volume
    
    // Connect the nodes
    this.currentSource.connect(this.currentGain);
    this.currentGain.connect(this.audioContext.destination);
    
    // Start playing
    this.currentSource.start();
    this.isPlaying = true;
    
    console.log(`🔊 Started background sound: ${type} at ${volume}% volume`);
  }

  stopBackgroundSound() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Ignore errors from stopping already stopped sources
      }
      this.currentSource = null;
    }
    
    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.currentGain = null;
    }
    
    this.isPlaying = false;
    console.log('🔇 Stopped background sound');
  }

  updateVolume(volume: number) {
    if (this.currentGain) {
      this.currentGain.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.3;
      console.log(`🔊 Updated background volume to ${volume}%`);
    }
  }

  dispose() {
    this.stopBackgroundSound();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}