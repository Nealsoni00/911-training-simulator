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
    console.log('🔧 Setting up Deepgram transcript callback');
    this.onTranscriptCallback = callback;
  }

  onError(callback: (error: string) => void) {
    console.log('🔧 Setting up Deepgram error callback');
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
    
    // Add essential parameters - try different settings for better compatibility
    wsUrl.searchParams.set('encoding', 'linear16');
    wsUrl.searchParams.set('sample_rate', '16000');
    wsUrl.searchParams.set('channels', '1');
    wsUrl.searchParams.set('language', 'en-US');
    
    // Add additional parameters that might help with transcription
    wsUrl.searchParams.set('model', 'nova-2');  // Use latest model
    wsUrl.searchParams.set('smart_format', 'true');  // Enable smart formatting
    wsUrl.searchParams.set('interim_results', 'true');  // Enable interim results
    wsUrl.searchParams.set('utterance_end_ms', '1000');  // Shorter utterance end
    wsUrl.searchParams.set('vad_events', 'true');  // Enable voice activity detection
    wsUrl.searchParams.set('punctuate', 'true');  // Enable punctuation
    
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
        
        // Send a test ping to verify connection
        setTimeout(() => {
          this.sendTestAudio();
        }, 1000);
        
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          console.log('🌊 RAW Deepgram message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('📨 PARSED Deepgram message:', JSON.stringify(data, null, 2));
          
          if (data.type === 'Results') {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            const confidence = data.channel?.alternatives?.[0]?.confidence;
            const isFinal = data.is_final;
            const duration = data.duration;
            const start = data.start;
            
            console.log('📝 TRANSCRIPT DETAILS:');
            console.log('   📄 Text:', transcript || '[EMPTY]');
            console.log('   🎯 Final:', isFinal);
            console.log('   📊 Confidence:', confidence);
            console.log('   ⏱️ Duration:', duration);
            console.log('   🕐 Start:', start);
            console.log('   📋 Full alternatives:', data.channel?.alternatives);
            console.log('   🔗 Callback exists:', !!this.onTranscriptCallback);
            
            if (transcript && this.onTranscriptCallback) {
              console.log('✅ CALLING transcript callback with:', transcript);
              this.onTranscriptCallback(transcript, isFinal);
            } else if (!transcript) {
              console.log('⚠️ NO TRANSCRIPT TEXT in response');
            } else if (!this.onTranscriptCallback) {
              console.log('⚠️ NO CALLBACK REGISTERED for transcript');
            }
          } else if (data.type === 'SpeechStarted') {
            console.log('🎤 SPEECH STARTED detected by Deepgram');
          } else if (data.type === 'UtteranceEnd') {
            console.log('🎤 UTTERANCE ENDED detected by Deepgram');
          } else if (data.type === 'Metadata') {
            console.log('📊 DEEPGRAM METADATA:', JSON.stringify(data, null, 2));
          } else if (data.type === 'Warning') {
            console.warn('⚠️ DEEPGRAM WARNING:', JSON.stringify(data, null, 2));
          } else if (data.type === 'Error') {
            console.error('❌ DEEPGRAM ERROR:', JSON.stringify(data, null, 2));
          } else {
            console.log('🔍 UNKNOWN Deepgram message type:', data.type);
            console.log('🔍 Full unknown message:', JSON.stringify(data, null, 2));
          }
        } catch (error) {
          console.error('❌ ERROR parsing Deepgram message:', error);
          console.error('❌ Raw data that failed to parse:', event.data);
          console.error('❌ Data type:', typeof event.data);
          console.error('❌ Data length:', event.data?.length);
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

  // Pre-warm the WebSocket connection
  async preWarmConnection(): Promise<void> {
    try {
      console.log('🔥 Pre-warming Deepgram WebSocket connection...');
      
      // Just establish the WebSocket connection without starting audio
      await this.connectWebSocket();
      
      console.log('✅ Deepgram WebSocket pre-warmed and ready');
    } catch (error) {
      console.error('❌ Failed to pre-warm Deepgram connection:', error);
      // Don't throw - this is just optimization
    }
  }

  // Start real-time transcription with optional existing stream
  async startTranscription(existingStream?: MediaStream): Promise<void> {
    try {
      // Record start time
      this.startTime = Date.now();
      
      console.log('🎯 Deepgram startTranscription called with:', {
        existingStream: !!existingStream,
        isConnected: this.isConnected,
        websocketState: this.websocket?.readyState,
        apiKeyExists: !!this.apiKey
      });
      
      // Connect to Deepgram WebSocket if not already connected
      if (!this.isConnected) {
        console.log('🔌 Connecting to Deepgram WebSocket...');
        await this.connectWebSocket();
      } else {
        console.log('✅ Using pre-warmed Deepgram connection');
      }

      let stream: MediaStream | undefined;
      
      if (existingStream) {
        console.log('🎤 Using existing audio stream for Deepgram');
        stream = existingStream;
      } else {
        console.log('🎤 Creating new audio stream for Deepgram');
        
        // Try different audio constraints for better Deepgram compatibility
        const audioConstraints = [
          // First try: Optimal settings for Deepgram
          {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: false,  // Turn off processing that might interfere
            noiseSuppression: false,
            autoGainControl: false
          },
          // Fallback: More permissive settings
          {
            sampleRate: { ideal: 16000 },
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          // Last resort: Let browser choose
          {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        ];
        
        let streamCreated = false;
        for (let i = 0; i < audioConstraints.length && !streamCreated; i++) {
          try {
            console.log(`🎤 Trying audio constraints ${i + 1}:`, audioConstraints[i]);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints[i]
            });
            console.log('✅ Audio stream created with constraints', i + 1);
            streamCreated = true;
          } catch (error) {
            console.warn(`⚠️ Audio constraints ${i + 1} failed:`, error);
            if (i === audioConstraints.length - 1) {
              throw error; // Re-throw if this was the last attempt
            }
          }
        }
      }

      // Use Web Audio API to convert to raw PCM for Deepgram
      if (!stream) {
        throw new Error('Failed to obtain audio stream');
      }
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
    // Try to create AudioContext with 16kHz sample rate, fallback to default
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContext({ sampleRate: 16000 });
      console.log('✅ Created AudioContext with 16kHz sample rate');
    } catch (error) {
      console.warn('⚠️ Failed to create 16kHz AudioContext, using default:', error);
      audioContext = new AudioContext();
    }
    
    console.log('🎵 AUDIO CONTEXT SETUP:');
    console.log('   📊 Sample rate:', audioContext.sampleRate);
    console.log('   🔊 State:', audioContext.state);
    console.log('   🎤 Stream tracks:', stream.getTracks().length);
    console.log('   🎧 Audio tracks:', stream.getAudioTracks().length);
    
    // Log stream details
    stream.getAudioTracks().forEach((track, index) => {
      console.log(`   🎼 Track ${index}:`, {
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      });
    });

    const source = audioContext.createMediaStreamSource(stream);
    
    // Create a ScriptProcessorNode for real-time audio processing
    // Use smaller buffer size (1024) for lower latency at start
    const processor = audioContext.createScriptProcessor(1024, 1, 1);
    
    let audioChunkCount = 0;
    let lastLogTime = Date.now();
    
    processor.onaudioprocess = (event) => {
      if (this.websocket && this.isConnected) {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Calculate audio level for debugging
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const audioLevel = sum / inputData.length;
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Convert from [-1, 1] to [-32768, 32767]
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        audioChunkCount++;
        const now = Date.now();
        
        // Log audio data being sent every 2 seconds
        if (now - lastLogTime > 2000) {
          console.log('🎵 AUDIO DATA SENT TO DEEPGRAM:');
          console.log('   📊 Chunks sent:', audioChunkCount);
          console.log('   🎚️ Audio level:', audioLevel.toFixed(4));
          console.log('   📏 Buffer size:', inputData.length);
          console.log('   🔗 WebSocket state:', this.websocket.readyState);
          console.log('   ✅ Connected:', this.isConnected);
          
          // Check if audio level is too low
          if (audioLevel < 0.001) {
            console.warn('⚠️ VERY LOW AUDIO LEVEL - microphone might be muted or not working');
          } else if (audioLevel < 0.01) {
            console.warn('⚠️ LOW AUDIO LEVEL - try speaking louder');
          } else if (audioLevel > 0.1) {
            console.log('✅ GOOD AUDIO LEVEL detected');
          } else {
            console.log('🔊 MODERATE AUDIO LEVEL detected');
          }
          
          // Show sample of PCM data
          console.log('   🔢 PCM sample (first 10 values):', Array.from(pcmData.slice(0, 10)));
          const pcmArray = Array.from(pcmData);
          console.log('   📈 PCM range:', Math.min(...pcmArray), 'to', Math.max(...pcmArray));
          
          lastLogTime = now;
        }
        
        // Send PCM data to Deepgram
        try {
          this.websocket.send(pcmData.buffer);
        } catch (error) {
          console.error('❌ ERROR sending audio to Deepgram:', error);
        }
      } else {
        console.log('⚠️ SKIPPING AUDIO - WebSocket not ready:', {
          websocketExists: !!this.websocket,
          isConnected: this.isConnected,
          readyState: this.websocket?.readyState
        });
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

  // Send test audio to verify Deepgram is responding
  private sendTestAudio(): void {
    if (!this.websocket || !this.isConnected) {
      console.log('⚠️ Cannot send test audio - WebSocket not connected');
      return;
    }
    
    console.log('🧪 SENDING TEST AUDIO to Deepgram...');
    
    // Generate a simple sine wave test audio (440Hz tone for 1 second at 16kHz)
    const sampleRate = 16000;
    const duration = 1; // 1 second
    const frequency = 440; // A4 note
    const samples = sampleRate * duration;
    const testAudio = new Int16Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      const amplitude = 0.3; // 30% volume
      testAudio[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude * 32767;
    }
    
    console.log('🎵 Generated test audio:', {
      samples: samples,
      duration: duration,
      frequency: frequency,
      sampleRate: sampleRate,
      firstSamples: Array.from(testAudio.slice(0, 10))
    });
    
    try {
      this.websocket.send(testAudio.buffer);
      console.log('✅ Test audio sent to Deepgram');
    } catch (error) {
      console.error('❌ Failed to send test audio:', error);
    }
  }

  // Clean up resources
  dispose(): void {
    this.stopTranscription();
    this.onTranscriptCallback = undefined;
    this.onErrorCallback = undefined;
  }
}