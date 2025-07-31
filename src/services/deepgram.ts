export class DeepgramService {
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onErrorCallback?: (error: string) => void;
  private isConnected: boolean = false;
  public reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;
  public hasCallbacks: boolean = false;
  private startTime: number = 0;

  private apiKey: string | null = null;

  constructor() {
    // Check for API key in environment first (for local development)
    const localApiKey = process.env.REACT_APP_DEEPGRAM_API_KEY;
    console.log('🔍 Checking for REACT_APP_DEEPGRAM_API_KEY:', localApiKey ? 'Found' : 'Not found');
    console.log('🔍 Environment variables available:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
    
    if (localApiKey) {
      console.log('🔑 Using local Deepgram API key for development');
      this.apiKey = localApiKey;
    } else {
      console.warn('⚠️ No REACT_APP_DEEPGRAM_API_KEY found in environment');
    }
  }

  // Set up callbacks
  onTranscript(callback: (transcript: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  // Connect to Deepgram WebSocket API
  private async connectWebSocket(): Promise<void> {
    // Fetch API key from backend if not already fetched
    if (!this.apiKey) {
      try {
        const apiBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
        const response = await fetch(`${apiBaseUrl}/api/deepgram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getToken' })
        });
        
        if (!response.ok) {
          // For local development, try to use environment variable directly
          if (process.env.NODE_ENV === 'development') {
            const envKey = process.env.REACT_APP_DEEPGRAM_API_KEY;
            if (envKey) {
              console.log('Using REACT_APP_DEEPGRAM_API_KEY from environment for local development');
              this.apiKey = envKey;
              return; // Skip the API call, use env var directly
            } else {
              console.warn('API endpoint not available in development. Add REACT_APP_DEEPGRAM_API_KEY to your .env file for local testing.');
              throw new Error('Deepgram API not available in development mode. Add REACT_APP_DEEPGRAM_API_KEY to .env file.');
            }
          }
          throw new Error('Failed to fetch Deepgram API key');
        }
        
        const data = await response.json();
        this.apiKey = data.apiKey;
      } catch (error) {
        console.error('Failed to fetch Deepgram API key:', error);
        if (process.env.NODE_ENV === 'development') {
          throw new Error('Deepgram API not available in development mode. The app will use browser speech recognition as fallback.');
        }
        throw new Error('Deepgram API key is required. Failed to fetch from server.');
      }
    }
    
    const apiKey = this.apiKey;
    console.log('🔑 API Key status:', apiKey ? 'Available' : 'Missing');
    
    if (!apiKey) {
      console.error('❌ No Deepgram API key available. Check environment variable REACT_APP_DEEPGRAM_API_KEY');
      throw new Error('Deepgram API key is required.');
    }
    
    // Validate API key format (Deepgram keys are usually 32+ characters)
    if (apiKey.length < 32) {
      console.warn('⚠️ API key seems too short:', apiKey.length, 'characters');
    }
    
    // Check if it looks like a Deepgram key (they can be hex or contain other characters)
    console.log('🔍 API key length:', apiKey.length);
    console.log('🔍 API key format check - first char:', apiKey.charAt(0));

    // Try the correct Deepgram authentication method
    console.log('🧪 Testing Deepgram WebSocket with proper authentication...');
    const wsUrl = new URL('wss://api.deepgram.com/v1/listen');
    
    // Add essential parameters
    wsUrl.searchParams.set('encoding', 'linear16');
    wsUrl.searchParams.set('sample_rate', '16000');
    wsUrl.searchParams.set('channels', '1');
    wsUrl.searchParams.set('language', 'en-US');
    
    console.log('🔗 Building WebSocket URL without token (will use subprotocol auth)...');

    console.log('🔗 Connecting to Deepgram WebSocket...');
    console.log('🌐 WebSocket URL:', wsUrl.toString());
    console.log('🔐 Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    // Use the correct Deepgram authentication method with subprotocols
    console.log('🚀 Attempting WebSocket connection with token subprotocol...');
    this.websocket = new WebSocket(wsUrl.toString(), ['token', apiKey]);

    return new Promise((resolve, reject) => {
      if (!this.websocket) {
        reject(new Error('Failed to create WebSocket'));
        return;
      }

      this.websocket.onopen = () => {
        console.log('✅ Connected to Deepgram WebSocket - ready for immediate transcription');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Deepgram message:', data);
          
          if (data.type === 'Results') {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final;
            
            console.log('📝 Transcript received:', transcript, 'isFinal:', isFinal);
            
            if (transcript && this.onTranscriptCallback) {
              this.onTranscriptCallback(transcript, isFinal);
            }
          } else if (data.type === 'SpeechStarted') {
            console.log('🎤 Speech started detected by Deepgram');
          } else if (data.type === 'UtteranceEnd') {
            console.log('🎤 Utterance ended detected by Deepgram');
          } else if (data.type === 'Metadata') {
            console.log('📊 Deepgram metadata:', data);
          } else {
            console.log('🔍 Unknown Deepgram message type:', data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing Deepgram message:', error, 'Raw data:', event.data);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error);
        console.error('❌ WebSocket readyState:', this.websocket?.readyState);
        console.error('❌ Error details:', {
          type: error.type,
          target: error.target,
          currentTarget: error.currentTarget
        });
        this.isConnected = false;
        if (this.onErrorCallback) {
          this.onErrorCallback('WebSocket connection error: ' + error.type);
        }
        reject(error);
      };

      this.websocket.onclose = (event) => {
        console.log('🔌 Deepgram WebSocket closed:', event.code, event.reason);
        console.log('🔌 Close details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.isConnected = false;
        
        // Log common WebSocket close codes
        const closeReasons: { [key: number]: string } = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure',
          1011: 'Server error',
          1012: 'Service restart',
          1013: 'Try again later',
          1014: 'Bad gateway',
          1015: 'TLS handshake'
        };
        console.log('🔌 Close reason:', closeReasons[event.code] || 'Unknown');
        
        // Specific diagnostic for 1006 error
        if (event.code === 1006) {
          console.error('💡 Code 1006 usually indicates:');
          console.error('   • Invalid API key or authentication failure');
          console.error('   • Network connectivity issues');
          console.error('   • Deepgram service temporarily unavailable');
          console.error('   • Incorrect WebSocket URL or parameters');
          console.error('🔍 Suggestions:');
          console.error('   1. Verify your Deepgram API key is valid and active');
          console.error('   2. Check if your Deepgram account has credits');
          console.error('   3. Try a different authentication method');
        }
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };
    });
  }

  // Attempt to reconnect with exponential backoff
  private async attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect to Deepgram (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.connectWebSocket();
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          // Resume streaming if we were recording
          console.log('📡 Resuming audio streaming after reconnect');
        }
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts && this.onErrorCallback) {
          this.onErrorCallback('Failed to reconnect to Deepgram after multiple attempts');
        }
      }
    }, delay);
  }

  // Start real-time transcription
  async startTranscription(): Promise<void> {
    try {
      // Record start time for warmup period
      this.startTime = Date.now();
      
      // Connect to Deepgram WebSocket
      await this.connectWebSocket();

      // Get user media with specific constraints for Deepgram
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Use Web Audio API to convert to raw PCM for Deepgram
      await this.setupAudioProcessing(stream);
      
      console.log('🎤 Started Deepgram real-time transcription');

    } catch (error) {
      console.error('❌ Failed to start Deepgram transcription:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to start transcription: ' + (error as Error).message);
      }
      throw error;
    }
  }

  // Set up Web Audio API processing for real-time PCM streaming
  private async setupAudioProcessing(stream: MediaStream): Promise<void> {
    const audioContext = new AudioContext({
      sampleRate: 16000
    });

    const source = audioContext.createMediaStreamSource(stream);
    
    // Create a ScriptProcessorNode for real-time audio processing
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (this.websocket && this.isConnected) {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Convert from [-1, 1] to [-32768, 32767]
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        // Send PCM data to Deepgram
        this.websocket.send(pcmData.buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // Store references for cleanup
    this.mediaRecorder = {
      stream,
      audioContext,
      processor,
      source,
      state: 'recording',
      stop: () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
      },
      pause: () => {
        processor.disconnect();
      },
      resume: () => {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        source.connect(processor);
        processor.connect(audioContext.destination);
      }
    } as any;
  }

  // Stop transcription
  stopTranscription(): void {
    console.log('🛑 Stopping Deepgram transcription');

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      
      // Stop all tracks
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }

    if (this.websocket && this.isConnected) {
      // Send close frame to Deepgram
      this.websocket.send(JSON.stringify({ type: 'CloseStream' }));
      this.websocket.close(1000, 'Transcription stopped');
    }

    this.isConnected = false;
    this.websocket = null;
    this.mediaRecorder = null;
  }

  // Pause transcription (keep connection open)
  pauseTranscription(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      console.log('⏸️ Paused Deepgram transcription');
    }
  }

  // Resume transcription
  resumeTranscription(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      console.log('▶️ Resumed Deepgram transcription');
    }
  }

  // Check if currently transcribing
  get isTranscribing(): boolean {
    return this.mediaRecorder?.state === 'recording' && this.isConnected;
  }

  // Get connection status
  get connectionStatus(): string {
    if (!this.websocket) return 'disconnected';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  // Clean up resources
  dispose(): void {
    this.stopTranscription();
    this.onTranscriptCallback = undefined;
    this.onErrorCallback = undefined;
  }
}