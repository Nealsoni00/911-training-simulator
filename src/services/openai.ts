import { LiveKitService } from './livekit';

// API client for OpenAI requests through our backend
class OpenAIClient {
  async createChatCompletion(params: any) {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    return response.json();
  }

  audio = {
    speech: {
      create: async (params: any) => {
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'audio.speech',
            ...params
          })
        });
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        return {
          arrayBuffer: () => response.arrayBuffer()
        };
      }
    },
    transcriptions: {
      create: async (params: any) => {
        // For file uploads, we'll need to handle this differently
        // For now, keeping the structure
        const formData = new FormData();
        formData.append('file', params.file);
        formData.append('model', params.model);
        
        const response = await fetch('/api/openai-transcribe', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        return response.json();
      }
    }
  };

  chat = {
    completions: {
      create: async (params: any) => {
        return this.createChatCompletion(params);
      }
    }
  };
}

const openai = new OpenAIClient();

export class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioQueue: Array<() => Promise<void>> = [];
  private isPlaying: boolean = false;
  private liveKitService: LiveKitService | null = null;
  private audioContext: AudioContext | null = null;
  private selectedSpeakerDeviceId: string = 'default';
  private selectedMicrophoneDeviceId: string = 'default';

  constructor(liveKitService?: LiveKitService) {
    this.liveKitService = liveKitService || null;
    this.audioContext = new AudioContext();
  }

  // Set audio output device
  setSpeakerDevice(deviceId: string) {
    this.selectedSpeakerDeviceId = deviceId;
    console.log('🔊 Speaker device set to:', deviceId);
  }

  // Set audio input device
  setMicrophoneDevice(deviceId: string) {
    this.selectedMicrophoneDeviceId = deviceId;
    console.log('🎤 Microphone device set to:', deviceId);
  }

  async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<ArrayBuffer> {
    const response = await openai.audio.speech.create({
      model: 'tts-1-hd', // Use HD model for better quality
      voice: voice,
      input: text,
      speed: 1.1, // Slightly slower for better clarity
      response_format: 'mp3' // Explicit format
    });

    return response.arrayBuffer();
  }

  async queueAudio(audioBuffer: ArrayBuffer, volume: number = 1.0, onStart?: () => void, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.audioQueue.push(async () => {
        try {
          // Temporarily force Web Audio fallback until LiveKit connection is fixed
          const useLiveKit = false; // Set to true when LiveKit is working
          
          if (useLiveKit && this.liveKitService?.isConnected) {
            console.log('🎵 Playing audio via LiveKit');
            await this.liveKitService.playAIAudio(audioBuffer, onStart, onEnd);
          } else {
            console.log('🎵 Playing audio via Web Audio (fallback)');
            // Fallback to Web Audio API
            if (onStart) onStart();
            await this.playAudio(audioBuffer, volume);
            if (onEnd) onEnd();
          }
        } catch (error) {
          console.error('❌ Audio playback failed:', error);
          // Fallback to web audio on any error
          try {
            console.log('🔄 Retrying with Web Audio fallback');
            if (onStart) onStart();
            await this.playAudio(audioBuffer, volume);
            if (onEnd) onEnd();
          } catch (fallbackError) {
            console.error('❌ Fallback audio also failed:', fallbackError);
            if (onStart) onStart();
            if (onEnd) onEnd();
          }
        }
        
        resolve();
      });
      
      if (!this.isPlaying) {
        this.processAudioQueue();
      } else {
        // Still resolve the promise when audio is queued
        resolve();
      }
    });
  }

  private async processAudioQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const nextAudio = this.audioQueue.shift();
    if (nextAudio) {
      await nextAudio();
      await this.processAudioQueue();
    }
  }

  private async playAudio(audioBuffer: ArrayBuffer, volume: number = 1.0) {
    console.log('🎵 playAudio called with buffer size:', audioBuffer.byteLength, 'volume:', volume);
    console.log('🔊 Using speaker device:', this.selectedSpeakerDeviceId);

    // Use HTML Audio element for device selection when not using default
    if (this.selectedSpeakerDeviceId !== 'default') {
      return this.playAudioWithDeviceSelection(audioBuffer, volume);
    }

    // Fallback to Web Audio API for default device
    if (!this.audioContext) {
      console.log('🎵 Creating new AudioContext');
      this.audioContext = new AudioContext({
        sampleRate: 44100, // High quality sample rate
        latencyHint: 'interactive'
      });
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      console.log('🎵 Resuming suspended AudioContext');
      await this.audioContext.resume();
    }

    console.log('🎵 AudioContext state:', this.audioContext.state);

    try {
      // Create a fresh copy of the buffer to avoid memory issues
      const bufferCopy = audioBuffer.slice(0);
      console.log('🎵 Decoding audio data...');
      const audioBufferDecoded = await this.audioContext.decodeAudioData(bufferCopy);
      console.log('🎵 Audio decoded - duration:', audioBufferDecoded.duration, 'seconds');
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      // Set high-quality interpolation
      source.buffer = audioBufferDecoded;
      gainNode.gain.value = Math.max(0.1, Math.min(1.0, volume / 100)); // Clamp volume
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      console.log('🎵 Starting audio playback on default device');
      
      return new Promise<void>((resolve) => {
        const cleanup = () => {
          console.log('🎵 Audio playback finished');
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
          resolve();
        };
        
        source.onended = cleanup;
        
        try {
          source.start();
        } catch (error) {
          console.error('❌ Failed to start audio source:', error);
          cleanup();
        }
      });
    } catch (error) {
      console.error('❌ Audio decoding/playback failed:', error);
      throw error;
    }
  }

  private async playAudioWithDeviceSelection(audioBuffer: ArrayBuffer, volume: number = 1.0): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      console.log('🔊 Playing audio with device selection:', this.selectedSpeakerDeviceId);
      
      // Convert ArrayBuffer to Blob for HTML Audio element
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = Math.max(0.1, Math.min(1.0, volume / 100));
      
      // Set the audio output device
      if ('setSinkId' in audio) {
        (audio as any).setSinkId(this.selectedSpeakerDeviceId)
          .then(() => {
            console.log('✅ Audio output device set successfully');
            audio.play();
          })
          .catch((error: Error) => {
            console.warn('⚠️ Could not set audio output device, using default:', error);
            audio.play();
          });
      } else {
        console.warn('⚠️ setSinkId not supported, using default device');
        audio.play();
      }
      
      audio.onended = () => {
        console.log('🎵 HTML Audio playback finished');
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = () => {
        console.error('❌ HTML Audio playback failed');
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };
    });
  }

  clearAudioQueue() {
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Clean up audio context if it exists to prevent memory leaks
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // Don't close the context, just suspend it to avoid recreation overhead
      if (this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
    }
  }

  // Add method to properly clean up resources
  dispose() {
    this.clearAudioQueue();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('No recording in progress');
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await openai.audio.transcriptions.create({
      file: new File([audioBlob], 'audio.webm'),
      model: 'whisper-1',
    });

    return response.text;
  }
}

export class ConversationService {
  private conversationHistory: any[] = [];

  async generateCallerResponse(
    transcript: string,
    operatorMessage: string,
    cooperationLevel: number,
    currentContext: string
  ): Promise<string> {
    const systemPrompt = `You are a real person calling 911 experiencing a genuine emergency. You are in distress and need help.

    EMERGENCY SITUATION: ${transcript}
    Your stress/cooperation level: ${cooperationLevel}/100
    
    REALISTIC SPEECH PATTERNS - Use these authentic behaviors:
    - Repeat key details when panicked ("He's got a gun! He's got a gun!")
    - Use natural filler words ("um", "uh", "like") when stressed
    - Interrupt yourself with new urgent information
    - Give incomplete addresses/details when panicked, then correct
    - Use emotional exclamations ("Oh God!", "Please hurry!", "I'm scared!")
    - Breathe heavily or gasp between words when very distressed
    - Ask "Are they coming?" "How long?" when waiting for help
    
    COOPERATION LEVELS:
    - Low (0-30): Hysterical, sobbing, screaming, can barely speak coherently
      Example: "Oh God oh God... there's blood everywhere... I think... I think he's..."
    - Medium (30-70): Very upset but trying to help, scattered thoughts
      Example: "Um, okay, it's... it's 123 Main Street... no wait, 132... I'm shaking..."
    - High (70-100): Distressed but focused, gives clear information
      Example: "Yes, it's 123 Main Street, apartment 2B. There's been a shooting."
    
    REALISTIC BEHAVIORS:
    - Give address in pieces if panicked: "It's Main Street... um... 123 Main Street"
    - Provide cross streets or landmarks: "Near the McDonald's" "Corner of 5th and Oak"
    - Mention what you can see: "I can see police lights" "I'm hiding in the bathroom"
    - Ask practical questions: "Should I unlock the door?" "Is it safe to come out?"
    - Give updates: "Wait, I hear sirens" "Someone else is calling too"
    
    Stay completely in character as a real emergency caller. Never mention training, simulation, or AI.
    Current context: ${currentContext}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
        { role: 'user', content: operatorMessage }
      ],
      temperature: 0.9,
      max_tokens: 80,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    });

    const callerResponse = response.choices[0].message.content || '';
    
    this.conversationHistory.push(
      { role: 'user', content: operatorMessage },
      { role: 'assistant', content: callerResponse }
    );

    return callerResponse;
  }

  resetConversation() {
    this.conversationHistory = [];
  }
}