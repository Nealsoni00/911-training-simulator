import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { TranscriptInput } from './components/TranscriptInput';
import { CADInterface } from './components/CADInterface';
import { SimulatorControls } from './components/SimulatorControls';
import { ConversationView } from './components/ConversationView';
import { CallAnswerInterface } from './components/CallAnswerInterface';
import { MicrophonePermission } from './components/MicrophonePermission';
import { SpeakingIndicator } from './components/SpeakingIndicator';
import { AudioDeviceSelector } from './components/AudioDeviceSelector';
import { CallStatus } from './components/CallStatus';
import { DebugMenu } from './components/DebugMenu';
import { VoiceService, ConversationService } from './services/openai';
import { LiveKitService } from './services/livekit';
import { BackgroundAudioService } from './services/backgroundAudio';
import { DeepgramService } from './services/deepgram';
import { SimulatorConfig, ConversationMessage, CADEntry } from './types';

function App() {
  const [transcript, setTranscript] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCallAnswer, setShowCallAnswer] = useState(false);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [waitingForDispatcher, setWaitingForDispatcher] = useState(false);
  const [isCallerSpeaking, setIsCallerSpeaking] = useState(false);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [deepgramStatus, setDeepgramStatus] = useState<string>('disconnected');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pendingCallerMessage, setPendingCallerMessage] = useState<string>('');
  const [cadEntry, setCadEntry] = useState<CADEntry | null>(null);
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [config, setConfig] = useState<SimulatorConfig>({
    cooperationLevel: 70,
    volumeLevel: 80,
    backgroundNoise: 'none',
    backgroundNoiseLevel: 30,
    city: 'Columbus',
    state: 'OH'
  });

  const liveKitServiceRef = useRef<LiveKitService | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationServiceRef = useRef(new ConversationService());
  const backgroundAudioServiceRef = useRef<BackgroundAudioService | null>(null);
  const deepgramServiceRef = useRef<DeepgramService | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const shouldRestartRecognitionRef = useRef(true);

  const handleTranscriptSubmit = (newTranscript: string) => {
    setTranscript(newTranscript);
    setMessages([]);
    conversationServiceRef.current.resetConversation();
  };

  const handleConfigChange = (newConfig: SimulatorConfig) => {
    const oldConfig = config;
    setConfig(newConfig);
    
    // Update background sounds in real-time if running
    if (isRunning && backgroundAudioServiceRef.current) {
      if (oldConfig.backgroundNoise !== newConfig.backgroundNoise) {
        // Background noise type changed
        backgroundAudioServiceRef.current.stopBackgroundSound();
        if (newConfig.backgroundNoise !== 'none') {
          backgroundAudioServiceRef.current.startBackgroundSound(
            newConfig.backgroundNoise as 'traffic' | 'crowd' | 'home' | 'outdoor',
            newConfig.backgroundNoiseLevel
          );
        }
      } else if (oldConfig.backgroundNoiseLevel !== newConfig.backgroundNoiseLevel) {
        // Just volume changed
        backgroundAudioServiceRef.current.updateVolume(newConfig.backgroundNoiseLevel);
      }
    }
  };

  const handleStart = async () => {
    if (!transcript) {
      alert('Please load a transcript first');
      return;
    }

    // Initialize services if not already done
    if (!liveKitServiceRef.current) {
      liveKitServiceRef.current = new LiveKitService();
      voiceServiceRef.current = new VoiceService(liveKitServiceRef.current);
    }
    
    if (!backgroundAudioServiceRef.current) {
      backgroundAudioServiceRef.current = new BackgroundAudioService();
    }
    
    if (!deepgramServiceRef.current) {
      deepgramServiceRef.current = new DeepgramService();
    }

    // Check microphone permission first
    if (!micPermissionGranted) {
      try {
        // Test if we already have permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
      } catch (error) {
        setShowMicPermission(true);
        return;
      }
    }

    setShowCallAnswer(true);
    voiceServiceRef.current?.clearAudioQueue();
  };

  const handleMicPermissionGranted = () => {
    setMicPermissionGranted(true);
    setShowMicPermission(false);
    setShowCallAnswer(true);
  };

  const handleCallAnswered = async () => {
    setShowCallAnswer(false);
    setIsRunning(true);
    isRunningRef.current = true;
    isProcessingRef.current = false;
    shouldRestartRecognitionRef.current = true;
    setMessages([]);
    setWaitingForDispatcher(true);
    
    try {
      // Connect to LiveKit room
      if (liveKitServiceRef.current) {
        console.log('Attempting to connect to LiveKit...');
        
        // Fetch LiveKit configuration from backend
        const configResponse = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getConfig' })
        });
        
        if (!configResponse.ok) {
          throw new Error('Failed to fetch LiveKit configuration');
        }
        
        const config = await configResponse.json();
        const wsUrl = config.wsUrl;
        const token = config.token;
        
        if (!wsUrl) {
          throw new Error('LiveKit WS URL not configured');
        }
        if (!token) {
          throw new Error('LiveKit token not configured');
        }
        
        console.log('LiveKit config found - WS URL:', wsUrl);
        console.log('LiveKit token configured:', token ? 'Yes' : 'No');
        
        const roomName = `911-sim-${Date.now()}`;
        await liveKitServiceRef.current.connectToRoom(roomName, 'dispatcher');
        
        // Enable microphone through LiveKit
        await liveKitServiceRef.current.enableMicrophone();
        
        // Set up audio level monitoring
        liveKitServiceRef.current.onAudioLevel((level) => {
          setMicrophoneLevel(level);
        });
        
        // Set up interruption detection
        liveKitServiceRef.current.onInterruption((isInterrupting) => {
          if (isInterrupting && isCallerSpeaking) {
            console.log('🚨 Dispatcher interrupting caller - stopping caller audio');
            voiceServiceRef.current?.clearAudioQueue();
            setIsCallerSpeaking(false);
            isProcessingRef.current = false;
          }
        });
        
        // Update connection status
        setLiveKitConnected(true);
        setParticipantCount(liveKitServiceRef.current.participantCount);
        
        console.log('✅ Successfully connected to LiveKit room for high-quality audio');
      } else {
        console.log('LiveKit service not initialized, using fallback');
        await setupMicrophoneAnalyser();
      }
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      console.log('🔄 Falling back to web audio system');
      setLiveKitConnected(false);
      setParticipantCount(0);
      // Fallback to original microphone setup
      await setupMicrophoneAnalyser();
    }
    
    // Start background sounds
    if (config.backgroundNoise !== 'none') {
      backgroundAudioServiceRef.current?.startBackgroundSound(
        config.backgroundNoise as 'traffic' | 'crowd' | 'home' | 'outdoor',
        config.backgroundNoiseLevel
      );
    }
    
    // Start listening for dispatcher to speak first
    // The dispatcher should naturally start with "911, what's the address of your emergency?"
    setWaitingForDispatcher(true);
    startDeepgramTranscription();
  };

  const handleEnd = async () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    isProcessingRef.current = false;
    shouldRestartRecognitionRef.current = false;
    setIsRecording(false);
    setWaitingForDispatcher(false);
    setIsCallerSpeaking(false);
    stopDeepgramTranscription();
    voiceServiceRef.current?.clearAudioQueue();
    
    // Stop background sounds
    backgroundAudioServiceRef.current?.stopBackgroundSound();
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Disconnect from LiveKit room
    if (liveKitServiceRef.current) {
      await liveKitServiceRef.current.disconnect();
      setLiveKitConnected(false);
      setParticipantCount(0);
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    shouldRestartRecognitionRef.current = false;
    
    // For pause, we can temporarily pause Deepgram to save resources
    if (deepgramServiceRef.current && deepgramServiceRef.current.isTranscribing) {
      deepgramServiceRef.current.pauseTranscription();
    }
    
    // Stop WebKit recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    
    // Clear any pending timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Clear audio queue and stop caller speech
    voiceServiceRef.current?.clearAudioQueue();
    setIsCallerSpeaking(false);
    isProcessingRef.current = false;
    
    // Keep microphone monitoring active during pause, just reset level display
    setMicrophoneLevel(0);
  };

  const handleResume = async () => {
    setIsPaused(false);
    isPausedRef.current = false;
    shouldRestartRecognitionRef.current = true;
    isProcessingRef.current = false;
    
    // Make sure microphone monitoring is still active
    if (!analyserRef.current || !micStreamRef.current) {
      await setupMicrophoneAnalyser();
    }
    
    // Resume Deepgram transcription after a small delay
    setTimeout(() => {
      if (isRunningRef.current && !isPausedRef.current && !isCallerSpeaking) {
        if (deepgramServiceRef.current && deepgramServiceRef.current.connectionStatus === 'connected') {
          deepgramServiceRef.current.resumeTranscription();
        } else {
          startDeepgramTranscription();
        }
      }
    }, 200);
  };

  const setupMicrophoneAnalyser = async () => {
    try {
      // Don't set up if already exists
      if (analyserRef.current && micStreamRef.current) {
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      // Create new audio context if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      
      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 512; // Increased for better sensitivity
      analyserRef.current.smoothingTimeConstant = 0.3;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let lastUpdate = 0;
      const checkLevel = () => {
        const now = Date.now();
        
        // Throttle to 10 FPS instead of 60 FPS to reduce CPU load
        if (now - lastUpdate < 100) {
          if (isRunningRef.current && !isPausedRef.current) {
            requestAnimationFrame(checkLevel);
          }
          return;
        }
        lastUpdate = now;
        
        if (analyserRef.current && isRunningRef.current && !isPausedRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // More efficient calculation - sample fewer points
          let sum = 0;
          const sampleRate = 4; // Sample every 4th point to reduce calculations
          for (let i = 0; i < bufferLength; i += sampleRate) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / (bufferLength / sampleRate));
          const volume = Math.min(100, (rms / 128) * 100);
          
          setMicrophoneLevel(volume);
          
          requestAnimationFrame(checkLevel);
        } else if (isRunningRef.current && !isPausedRef.current) {
          // Continue checking even if analyser not ready yet
          setMicrophoneLevel(0);
          setTimeout(() => requestAnimationFrame(checkLevel), 100);
        } else {
          // Exercise stopped or paused, reset level
          setMicrophoneLevel(0);
        }
      };
      
      checkLevel();
    } catch (error) {
      console.error('Error setting up microphone analyser:', error);
    }
  };

  const startDeepgramTranscription = async () => {
    if (!deepgramServiceRef.current) {
      console.error('Deepgram service not initialized');
      return;
    }

    // Don't start if paused
    if (isPausedRef.current) {
      return;
    }

    // Check if already transcribing
    if (deepgramServiceRef.current.isTranscribing) {
      return;
    }

    // Check if we should restart (but allow during resume)
    if (!shouldRestartRecognitionRef.current && !isRunningRef.current) {
      return;
    }

    try {
      // Set up callbacks
      deepgramServiceRef.current.onTranscript(async (operatorTranscript: string, isFinal: boolean) => {
        console.log('🎯 App received transcript:', operatorTranscript, 'isFinal:', isFinal);
        
        // Handle partial results for real-time interruption
        if (!isFinal) {
          setPartialTranscript(operatorTranscript);
          console.log('📝 Set partial transcript:', operatorTranscript);
          
          // If caller is speaking and we detect speech, interrupt them
          if (isCallerSpeaking && operatorTranscript.trim().length > 2) {
            console.log('🚨 Dispatcher interrupting with partial speech:', operatorTranscript);
            voiceServiceRef.current?.clearAudioQueue();
            setIsCallerSpeaking(false);
            isProcessingRef.current = false;
          }
        } else {
          // Clear partial transcript on final result
          setPartialTranscript('');
          console.log('✅ Final Deepgram transcript:', operatorTranscript);
          
          if (!isPausedRef.current && !isProcessingRef.current && operatorTranscript.trim()) {
            console.log('🔄 Processing final transcript...');
            await handleFinalTranscript(operatorTranscript);
          } else {
            console.log('⏸️ Skipping transcript processing - paused:', isPausedRef.current, 'processing:', isProcessingRef.current, 'empty:', !operatorTranscript.trim());
          }
        }
      });

      deepgramServiceRef.current.onError((error: string) => {
        console.error('Deepgram error:', error);
        setIsRecording(false);
        
        // Attempt to restart on error
        setTimeout(() => {
          if (isRunningRef.current && !isPausedRef.current && !isProcessingRef.current) {
            startDeepgramTranscription();
          }
        }, 2000);
      });

      // Start transcription
      await deepgramServiceRef.current.startTranscription();
      setIsRecording(true);
      setDeepgramStatus(deepgramServiceRef.current.connectionStatus);
      console.log('✅ Started Deepgram transcription');

    } catch (error) {
      console.error('Failed to start Deepgram transcription:', error);
      setIsRecording(false);
      
      // Fallback to WebKit if Deepgram fails
      console.log('🔄 Falling back to WebKit Speech Recognition');
      startContinuousRecognition();
    }
  };

  const handleFinalTranscript = async (operatorTranscript: string) => {
    setLastTranscript(operatorTranscript);
    setWaitingForDispatcher(false);
    isProcessingRef.current = true;
    
    // Clear any pending caller continuation
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Stop any ongoing caller speech
    if (isCallerSpeaking) {
      voiceServiceRef.current?.clearAudioQueue();
      setIsCallerSpeaking(false);
    }
    
    // Add operator message
    setMessages(prev => [...prev, {
      role: 'operator',
      content: operatorTranscript,
      timestamp: new Date()
    }]);

    try {
      // Keep Deepgram running continuously - don't pause it
      // This maintains persistent connection for better transcription
      shouldRestartRecognitionRef.current = false;

      // Generate caller response (start this immediately for faster response)
      const callerResponse = await conversationServiceRef.current.generateCallerResponse(
        transcript,
        operatorTranscript,
        config.cooperationLevel,
        cadEntry ? JSON.stringify(cadEntry) : ''
      );

      // Store pending message but don't show in conversation yet
      setPendingCallerMessage(callerResponse);

      // Convert to speech and play it
      setIsCallerSpeaking(true);
      const audioBuffer = await voiceServiceRef.current!.textToSpeech(callerResponse);
      
      // Queue the audio with callbacks
      await voiceServiceRef.current!.queueAudio(
        audioBuffer, 
        config.volumeLevel,
        () => {
          // On audio start - show the transcript
          setMessages(prev => [...prev, {
            role: 'caller',
            content: callerResponse,
            timestamp: new Date()
          }]);
          setPendingCallerMessage('');
        },
        () => {
          // On audio end
          setIsCallerSpeaking(false);
          isProcessingRef.current = false;
        }
      );

      // Enable interruption - Deepgram stays connected so dispatcher can interrupt immediately
      shouldRestartRecognitionRef.current = true;

      // Set up timeout for caller continuation after audio finishes
      const timeoutDuration = config.cooperationLevel < 30 ? 3000 : 
                            config.cooperationLevel < 70 ? 5000 : 8000;
      
      setTimeout(() => {
        if (isRunningRef.current && !isCallerSpeaking && !isPausedRef.current && !isProcessingRef.current) {
          silenceTimeoutRef.current = setTimeout(async () => {
            if (isRunningRef.current && !isCallerSpeaking && !isPausedRef.current) {
              await handleCallerContinuation();
            }
          }, timeoutDuration);
        }
      }, 1000); // Wait for audio to start before setting up continuation timeout
    } catch (error) {
      console.error('Error generating caller response:', error);
      setIsCallerSpeaking(false);
      isProcessingRef.current = false;
      
      // Keep transcription running even on error - no need to resume
      if (isRunningRef.current && !isPausedRef.current) {
        shouldRestartRecognitionRef.current = true;
      }
    }
  };

  // Keep the old WebKit function as fallback
  const startContinuousRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    // Don't start if paused
    if (isPausedRef.current) {
      return;
    }

    // Prevent multiple instances
    if (recognitionRef.current) {
      return;
    }

    // Check if we should restart (but allow during resume)
    if (!shouldRestartRecognitionRef.current && !isRunningRef.current) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const operatorTranscript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;

      // Handle partial results for real-time interruption
      if (!isFinal) {
        setPartialTranscript(operatorTranscript);
        
        // If caller is speaking and we detect speech, interrupt them
        if (isCallerSpeaking && operatorTranscript.trim().length > 2) {
          console.log('🚨 Dispatcher interrupting with partial speech:', operatorTranscript);
          voiceServiceRef.current?.clearAudioQueue();
          setIsCallerSpeaking(false);
          isProcessingRef.current = false;
        }
      } else {
        // Clear partial transcript on final result
        setPartialTranscript('');
        console.log('Final WebKit transcript:', operatorTranscript);
      }
      
      if (event.results[last].isFinal && !isPausedRef.current && !isProcessingRef.current) {
        await handleFinalTranscript(operatorTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      // Restart recognition on recoverable errors
      const recoverableErrors = ['no-speech', 'audio-capture', 'network', 'aborted'];
      if (recoverableErrors.includes(event.error)) {
        setTimeout(() => {
          if (isRunningRef.current && !isPausedRef.current && !isProcessingRef.current) {
            startContinuousRecognition();
          }
        }, 2000);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      
      // Only restart if explicitly requested
      if (shouldRestartRecognitionRef.current && isRunningRef.current && !isPausedRef.current && !isCallerSpeaking && !isProcessingRef.current) {
        setTimeout(() => {
          if (shouldRestartRecognitionRef.current && isRunningRef.current && !isPausedRef.current && !isProcessingRef.current) {
            startContinuousRecognition();
          }
        }, 1500);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopDeepgramTranscription = () => {
    shouldRestartRecognitionRef.current = false;
    
    if (deepgramServiceRef.current) {
      deepgramServiceRef.current.stopTranscription();
    }
    
    // Also stop WebKit recognition if it's running
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
  };

  const stopContinuousRecognition = () => {
    shouldRestartRecognitionRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
  };

  const handleCallerContinuation = async () => {
    if (!isRunning || isCallerSpeaking || isPaused) return;

    try {
      // Keep Deepgram running continuously - don't pause for caller continuation
      // Only stop WebKit recognition if it's running as fallback
      if (recognitionRef.current) {
        stopContinuousRecognition();
      }

      // Generate continuation based on cooperation level
      const continuationPrompt = config.cooperationLevel < 30 
        ? "The dispatcher hasn't responded. You're panicked - repeat urgently or add more panicked details."
        : config.cooperationLevel < 70
        ? "The dispatcher hasn't responded. Add more information or ask if they're still there."
        : "The dispatcher hasn't responded. Politely check if they heard you or provide additional helpful details.";

      const callerResponse = await conversationServiceRef.current.generateCallerResponse(
        transcript,
        continuationPrompt,
        config.cooperationLevel,
        cadEntry ? JSON.stringify(cadEntry) : ''
      );

      setMessages(prev => [...prev, {
        role: 'caller',
        content: callerResponse,
        timestamp: new Date()
      }]);

      // Play the continuation
      setIsCallerSpeaking(true);
      const audioBuffer = await voiceServiceRef.current!.textToSpeech(callerResponse);
      await voiceServiceRef.current!.queueAudio(audioBuffer, config.volumeLevel);
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsCallerSpeaking(false);

      // Deepgram stays connected - no need to resume
      // Only restart if connection was lost
      if (isRunning && deepgramServiceRef.current && deepgramServiceRef.current.connectionStatus !== 'connected') {
        startDeepgramTranscription();
      }
    } catch (error) {
      console.error('Error generating caller continuation:', error);
      setIsCallerSpeaking(false);
      // Deepgram stays connected - only restart if connection was lost
      if (isRunning && deepgramServiceRef.current && deepgramServiceRef.current.connectionStatus !== 'connected') {
        startDeepgramTranscription();
      }
    }
  };

  // Monitor Deepgram status
  useEffect(() => {
    const interval = setInterval(() => {
      if (deepgramServiceRef.current) {
        setDeepgramStatus(deepgramServiceRef.current.connectionStatus);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (backgroundAudioServiceRef.current) {
        backgroundAudioServiceRef.current.dispose();
      }
      if (deepgramServiceRef.current) {
        deepgramServiceRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>911 Training Simulator</h1>
      </header>
      
      <div className="app-container">
        {!transcript ? (
          <TranscriptInput onTranscriptSubmit={handleTranscriptSubmit} />
        ) : (
          <>
            {showMicPermission && (
              <MicrophonePermission onPermissionGranted={handleMicPermissionGranted} />
            )}
            {showCallAnswer && (
              <CallAnswerInterface onAnswer={handleCallAnswered} />
            )}
            <div className="simulator-layout">
              <div className="left-panel">
                <CallStatus
                  isActive={isRunning}
                  isPaused={isPaused}
                  onHangup={handleEnd}
                  onPause={handlePause}
                  onResume={handleResume}
                />
                <SimulatorControls 
                  config={config}
                  onConfigChange={handleConfigChange}
                  onStart={handleStart}
                  onEnd={handleEnd}
                  onPause={handlePause}
                  onResume={handleResume}
                  isRunning={isRunning}
                  isPaused={isPaused}
                />
                <AudioDeviceSelector
                  onMicrophoneChange={(deviceId) => {
                    voiceServiceRef.current?.setMicrophoneDevice(deviceId);
                  }}
                  onSpeakerChange={(deviceId) => {
                    voiceServiceRef.current?.setSpeakerDevice(deviceId);
                  }}
                />
                {isRunning && !isPaused && (
                  <SpeakingIndicator
                    isCallerSpeaking={isCallerSpeaking}
                    isDispatcherSpeaking={isRecording}
                    microphoneLevel={microphoneLevel}
                  />
                )}
                <ConversationView 
                  messages={messages}
                  isRecording={isRecording}
                  pendingCallerMessage={pendingCallerMessage}
                  partialTranscript={partialTranscript}
                />
                {waitingForDispatcher && !isPaused && (
                  <div className="waiting-message">
                    Waiting for dispatcher to speak...
                  </div>
                )}
                {isPaused && (
                  <div className="paused-message">
                    Exercise Paused
                  </div>
                )}
              </div>
              
              <div className="right-panel">
                <CADInterface 
                  onCADUpdate={setCadEntry}
                  city={config.city}
                  state={config.state}
                />
              </div>
            </div>
          </>
        )}
        
        <DebugMenu
          isRecording={isRecording}
          isRunning={isRunning}
          isPaused={isPaused}
          lastTranscript={lastTranscript}
          microphoneLevel={microphoneLevel}
          liveKitConnected={liveKitConnected}
          participantCount={participantCount}
          deepgramStatus={deepgramStatus}
        />
      </div>
    </div>
  );
}

export default App;