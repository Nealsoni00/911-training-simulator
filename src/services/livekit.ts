import { 
  Room, 
  RoomEvent, 
  Track, 
  RemoteAudioTrack,
  LocalAudioTrack,
  AudioCaptureOptions,
  RoomOptions,
  RoomConnectOptions,
  createLocalAudioTrack
} from 'livekit-client';
// import { AccessToken } from 'livekit-server-sdk'; // Causes webpack issues in browser

export class LiveKitService {
  private room: Room | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private onRemoteAudioCallback?: (audio: RemoteAudioTrack) => void;
  private onAudioLevelCallback?: (level: number) => void;
  private onInterruptionCallback?: (isInterrupting: boolean) => void;
  private audioAnalyser?: AnalyserNode;
  private speechDetectionThreshold: number = 15; // Audio level threshold for speech
  private speechDetectionTimeout: NodeJS.Timeout | null = null;
  private isCurrentlySpeaking: boolean = false;

  constructor() {
    // Initialize with room options for optimal audio quality
    const roomOptions: RoomOptions = {
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
        channelCount: 1
      },
      publishDefaults: {
        audioPreset: {
          maxBitrate: 128_000, // High quality audio bitrate
          priority: 'high'
        }
      },
      adaptiveStream: true,
      dynacast: true
    };

    this.room = new Room(roomOptions);
    this.setupEventListeners();
  }

  // Generate access token for LiveKit room via API call
  private async generateAccessToken(roomName: string, participantName: string): Promise<string> {
    console.log('🔑 Generating access token...');
    
    // Check for local environment variables first (for development)
    const localWsUrl = process.env.REACT_APP_LIVEKIT_WS_URL;
    const localApiKey = process.env.REACT_APP_LIVEKIT_API_KEY;
    const localApiSecret = process.env.REACT_APP_LIVEKIT_API_SECRET;
    const localPreGeneratedToken = process.env.REACT_APP_LIVEKIT_TOKEN;
    
    if (localPreGeneratedToken) {
      console.log('🔑 Using local LiveKit token for development');
      return localPreGeneratedToken;
    }
    
    // Fallback to API endpoint for production or local dev server
    try {
      const apiBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
      const response = await fetch(`${apiBaseUrl}/api/livekit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getConfig' })
      });
      
      if (!response.ok) {
        if (response.status === 404 && process.env.NODE_ENV === 'development') {
          throw new Error('LiveKit API not available in development mode. Audio features may be limited.');
        }
        throw new Error('Failed to fetch LiveKit configuration');
      }
      
      const config = await response.json();
      const { wsUrl, apiKey, apiSecret, token: preGeneratedToken } = config;
      
      console.log('📋 Environment check:');
      console.log('  - WS URL:', wsUrl ? '✓ Set' : '❌ Missing');
      console.log('  - API Key:', apiKey ? '✓ Set' : '❌ Missing');
      console.log('  - API Secret:', apiSecret ? '✓ Set' : '❌ Missing');
      console.log('  - Pre-generated Token:', preGeneratedToken ? '✓ Set' : '❌ Missing');

      // For now, we'll use a pre-generated token from environment
      // This is not secure for production but works for development
      if (preGeneratedToken) {
        console.log('🎫 Using pre-generated token');
        return preGeneratedToken;
      }

      throw new Error('Please provide LIVEKIT_TOKEN in your environment variables. Generate one at https://livekit.io/token-generator');
    } catch (error) {
      console.error('Failed to fetch LiveKit config:', error);
      throw error;
    }
  }

  // Connect to LiveKit room
  async connectToRoom(roomName: string, participantName: string): Promise<void> {
    if (!this.room) {
      throw new Error('Room not initialized');
    }

    // Check for local environment variables first (for development)
    const localWsUrl = process.env.REACT_APP_LIVEKIT_WS_URL;
    let wsUrl = localWsUrl;
    
    if (!wsUrl) {
      // Fallback to API endpoint for production or local dev server
      const apiBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
      const configResponse = await fetch(`${apiBaseUrl}/api/livekit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getConfig' })
      });
      
      if (!configResponse.ok) {
        if (configResponse.status === 404 && process.env.NODE_ENV === 'development') {
          throw new Error('LiveKit API not available in development mode. Audio features may be limited.');
        }
        throw new Error('Failed to fetch LiveKit configuration');
      }
      
      const config = await configResponse.json();
      wsUrl = config.wsUrl;
    } else {
      console.log('🔑 Using local LiveKit WS URL for development');
    }
    if (!wsUrl) {
      throw new Error('LiveKit WebSocket URL must be provided in environment variables');
    }

    console.log('🔗 Attempting to connect to:', wsUrl);
    console.log('🏠 Room name:', roomName);
    console.log('👤 Participant:', participantName);

    try {
      const token = await this.generateAccessToken(roomName, participantName);
      console.log('🎫 Token generated successfully, length:', token.length);
      
      // Decode token to verify (basic JWT decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', {
          issuer: payload.iss,
          subject: payload.sub,
          expires: new Date(payload.exp * 1000).toISOString(),
          permissions: payload.video
        });
      } catch (e) {
        console.warn('⚠️ Could not decode token for inspection');
      }

      const connectOptions: RoomConnectOptions = {
        autoSubscribe: true,
        maxRetries: 5,
        peerConnectionTimeout: 30_000,
        websocketTimeout: 15_000
      };

      console.log('🚀 Connecting with options:', connectOptions);
      await this.room.connect(wsUrl, token, connectOptions);
      console.log('✅ Successfully connected to LiveKit room:', roomName);
    } catch (error) {
      console.error('❌ LiveKit connection failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      throw error;
    }
  }

  // Enable microphone and start publishing audio
  async enableMicrophone(): Promise<void> {
    if (!this.room) {
      throw new Error('Room not connected');
    }

    const audioOptions: AudioCaptureOptions = {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000,
      channelCount: 1
    };

    // Create local audio track
    this.localAudioTrack = await createLocalAudioTrack(audioOptions);
    
    // Set up audio level monitoring
    this.setupAudioLevelMonitoring();
    
    // Publish the track
    if (this.localAudioTrack) {
      await this.room.localParticipant.publishTrack(this.localAudioTrack, {
        name: 'dispatcher-audio',
        source: Track.Source.Microphone
      });
    }

    console.log('Microphone enabled and published');
  }

  // Disable microphone
  async disableMicrophone(): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.stop();
      if (this.room) {
        await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
      }
      this.localAudioTrack = null;
    }
    
    if (this.audioAnalyser) {
      this.audioAnalyser = undefined;
    }
  }

  // Play AI-generated audio through LiveKit
  async playAIAudio(audioBuffer: ArrayBuffer, onStart?: () => void, onEnd?: () => void): Promise<void> {
    if (!this.room) {
      throw new Error('Room not connected');
    }

    // Convert ArrayBuffer to AudioBuffer for playback
    const audioContext = new AudioContext();
    const audioBufferDecoded = await audioContext.decodeAudioData(audioBuffer.slice(0));
    
    // Create a MediaStreamTrack from the audio buffer
    const destination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    
    source.buffer = audioBufferDecoded;
    source.connect(destination);
    
    // Create LocalAudioTrack from the MediaStream
    const aiAudioTrack = new LocalAudioTrack(
      destination.stream.getAudioTracks()[0],
      undefined,
      false // Don't use user media constraints
    );

    if (onStart) onStart();

    // Publish the AI audio track
    await this.room.localParticipant.publishTrack(aiAudioTrack, {
      name: 'ai-caller-audio',
      source: Track.Source.Unknown
    });

    // Start playback
    source.start();

    // Handle completion
    return new Promise<void>((resolve) => {
      source.onended = async () => {
        // Unpublish and clean up
        await this.room!.localParticipant.unpublishTrack(aiAudioTrack);
        await aiAudioTrack.stop();
        await audioContext.close();
        
        if (onEnd) onEnd();
        resolve();
      };
    });
  }

  // Set up audio level monitoring for dispatcher microphone
  private setupAudioLevelMonitoring(): void {
    if (!this.localAudioTrack) return;

    // Create audio context and analyser for level monitoring
    const audioContext = new AudioContext();
    this.audioAnalyser = audioContext.createAnalyser();
    
    // Connect the local audio track to the analyser
    const mediaStreamTrack = this.localAudioTrack.mediaStreamTrack;
    if (mediaStreamTrack) {
      const stream = new MediaStream([mediaStreamTrack]);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(this.audioAnalyser);
    }
    
    this.audioAnalyser.fftSize = 256;
    const bufferLength = this.audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const monitorLevels = () => {
      if (this.audioAnalyser && this.onAudioLevelCallback) {
        this.audioAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const normalizedLevel = Math.min(100, (rms / 128) * 100);
        
        this.onAudioLevelCallback(normalizedLevel);
        
        // Speech detection for interruption
        this.detectSpeechInterruption(normalizedLevel);
      }
      
      if (this.audioAnalyser) {
        requestAnimationFrame(monitorLevels);
      }
    };
    
    monitorLevels();
  }

  // Speech detection for interruption
  private detectSpeechInterruption(audioLevel: number): void {
    const isSpeaking = audioLevel > this.speechDetectionThreshold;
    
    if (isSpeaking && !this.isCurrentlySpeaking) {
      // Speech started - potential interruption
      this.isCurrentlySpeaking = true;
      if (this.onInterruptionCallback) {
        this.onInterruptionCallback(true);
      }
      
      // Clear any existing timeout
      if (this.speechDetectionTimeout) {
        clearTimeout(this.speechDetectionTimeout);
      }
    } else if (!isSpeaking && this.isCurrentlySpeaking) {
      // Speech might have stopped - wait a bit before confirming
      if (this.speechDetectionTimeout) {
        clearTimeout(this.speechDetectionTimeout);
      }
      
      this.speechDetectionTimeout = setTimeout(() => {
        this.isCurrentlySpeaking = false;
        if (this.onInterruptionCallback) {
          this.onInterruptionCallback(false);
        }
      }, 500); // 500ms delay to avoid false stops
    }
  }

  // Set callback for audio level updates
  onAudioLevel(callback: (level: number) => void): void {
    this.onAudioLevelCallback = callback;
  }

  // Set callback for speech interruption detection
  onInterruption(callback: (isInterrupting: boolean) => void): void {
    this.onInterruptionCallback = callback;
  }

  // Set callback for remote audio tracks
  onRemoteAudio(callback: (audio: RemoteAudioTrack) => void): void {
    this.onRemoteAudioCallback = callback;
  }

  // Set up event listeners for the room
  private setupEventListeners(): void {
    if (!this.room) return;

    // Handle track subscriptions
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio && track instanceof RemoteAudioTrack) {
        console.log('Subscribed to remote audio track from:', participant.identity);
        if (this.onRemoteAudioCallback) {
          this.onRemoteAudioCallback(track);
        }
      }
    });

    // Handle track unsubscriptions
    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('Unsubscribed from audio track from:', participant.identity);
      }
    });

    // Handle participant connections
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity);
    });

    // Handle participant disconnections
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity);
    });

    // Handle connection quality changes
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log('Connection quality changed:', quality, 'for:', participant?.identity || 'local');
    });

    // Handle disconnection
    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('🔌 Disconnected from room:', reason);
    });

    // Handle connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('🔄 Connection state changed:', state);
    });

    // Handle reconnection attempts
    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('🔄 Reconnecting to room...');
    });

    // Handle reconnection success
    this.room.on(RoomEvent.Reconnected, () => {
      console.log('✅ Reconnected to room');
    });

    // Handle any room errors
    this.room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
      console.log('📝 Room metadata changed:', metadata);
    });
  }

  // Get current room state
  get isConnected(): boolean {
    return this.room?.state === 'connected';
  }

  get isMicrophoneEnabled(): boolean {
    return this.localAudioTrack !== null;
  }

  // Disconnect from room and clean up
  async disconnect(): Promise<void> {
    if (this.localAudioTrack) {
      await this.disableMicrophone();
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  // Mute/unmute local audio
  async setMicrophoneMuted(muted: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.mute();
    }
  }

  // Get room participants count
  get participantCount(): number {
    return this.room ? this.room.remoteParticipants.size + 1 : 0;
  }
}