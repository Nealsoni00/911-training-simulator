import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { SimulationSelector } from './components/SimulationSelector';
import { ConfigurationPage } from './components/ConfigurationPage';
import { IncomingCallInterface } from './components/IncomingCallInterface';
import { SimulationInterface } from './components/SimulationInterface';
import { MicrophonePermission } from './components/MicrophonePermission';
import { DebugMenu } from './components/DebugMenu';
import { PresetManager } from './components/PresetManager';
import { VoiceService, ConversationService } from './services/openai';
import { LiveKitService } from './services/livekit';
import { BackgroundAudioService } from './services/backgroundAudio';
import { DeepgramService } from './services/deepgram';
import { CADAddressService } from './services/cadAddressService';
import { ConversationMessage, CADEntry, SimulationPreset } from './types';

type AppState = 'selection' | 'configuration' | 'incoming-call' | 'simulation';

function App() {
  const [appState, setAppState] = useState<AppState>('selection');
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset | null>(null);
  const [presets, setPresets] = useState<SimulationPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<SimulationPreset | null>(null);
  
  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  const [isSystemWarming, setIsSystemWarming] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  // Service references
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
  const transcriptBufferRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const shouldRestartRecognitionRef = useRef(true);

  // Initialize presets on app load
  useEffect(() => {
    PresetManager.initializeSamplePresets();
    setPresets(PresetManager.getPresets());
  }, []);

  // Navigation handlers
  const handleStartSimulation = async (preset: SimulationPreset) => {
    setSelectedPreset(preset);
    
    // Check microphone permission first
    if (!micPermissionGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
        setAppState('incoming-call');
      } catch (error) {
        setShowMicPermission(true);
        return;
      }
    } else {
      setAppState('incoming-call');
    }
  };

  const handleCreateNew = () => {
    setEditingPreset(null);
    setAppState('configuration');
  };

  const handleRestartSimulation = async () => {
    if (!selectedPreset) return;
    
    // End the current simulation first
    await handleEndSimulation();
    
    // Clear conversation history
    conversationServiceRef.current.resetConversation();
    
    // Reset address selection
    setSelectedAddress('');
    
    // Reset all state and restart with the same preset
    setTimeout(() => {
      setAppState('incoming-call');
    }, 500); // Small delay to ensure cleanup is complete
  };

  const handleEditPreset = async () => {
    if (!selectedPreset) return;
    
    // End the current simulation first
    await handleEndSimulation();
    
    // Set the preset for editing and go to configuration
    setEditingPreset(selectedPreset);
    setAppState('configuration');
  };

  const handleBackToSelection = () => {
    setAppState('selection');
    setEditingPreset(null);
    // Refresh presets in case they were updated
    setPresets(PresetManager.getPresets());
  };

  const handleSavePreset = (preset: SimulationPreset) => {
    try {
      PresetManager.savePreset(preset);
      setPresets(PresetManager.getPresets());
      alert('Preset saved successfully!');
    } catch (error) {
      alert('Failed to save preset: ' + (error as Error).message);
    }
  };

  const handleMicPermissionGranted = () => {
    setMicPermissionGranted(true);
    setShowMicPermission(false);
    setAppState('incoming-call');
  };

  const initializeServicesEarly = async () => {
    console.log('🚀 Pre-initializing services for faster call start...');
    
    try {
      // Initialize services early
      if (!liveKitServiceRef.current) {
        liveKitServiceRef.current = new LiveKitService();
        voiceServiceRef.current = new VoiceService(liveKitServiceRef.current);
      }
      
      if (!backgroundAudioServiceRef.current) {
        backgroundAudioServiceRef.current = new BackgroundAudioService();
      }
      
      if (!deepgramServiceRef.current) {
        deepgramServiceRef.current = new DeepgramService();
        console.log('✅ Deepgram service created during early initialization');
      }
      
      console.log('✅ Services pre-initialized successfully');
    } catch (error) {
      console.error('❌ Error pre-initializing services:', error);
    }
  };

  const handleCallAnswered = async () => {
    if (!selectedPreset) return;
    
    // Pre-initialize services first
    await initializeServicesEarly();
    
    // Select a consistent address for the entire conversation
    const emergencyType = CADAddressService.extractEmergencyTypeFromTranscript(selectedPreset.transcript);
    const defaultAddresses = CADAddressService.getAddressesForEmergencyType(
      emergencyType, 
      selectedPreset.config.city, 
      selectedPreset.config.state
    );
    const consistentAddress = defaultAddresses[0] || '123 Main Street';
    setSelectedAddress(consistentAddress);
    console.log('🏠 Selected consistent address for conversation:', consistentAddress);
    
    setAppState('simulation');
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
        
        const apiBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
        const configResponse = await fetch(`${apiBaseUrl}/api/livekit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getConfig' })
        });
        
        if (configResponse.ok) {
          const config = await configResponse.json();
          const roomName = `911-sim-${Date.now()}`;
          await liveKitServiceRef.current.connectToRoom(roomName, 'dispatcher');
          await liveKitServiceRef.current.enableMicrophone();
          
          liveKitServiceRef.current.onAudioLevel((level) => {
            setMicrophoneLevel(level);
          });
          
          liveKitServiceRef.current.onInterruption((isInterrupting) => {
            if (isInterrupting && isCallerSpeaking) {
              console.log('🚨 Dispatcher interrupting caller - stopping caller audio');
              voiceServiceRef.current?.clearAudioQueue();
              setIsCallerSpeaking(false);
              isProcessingRef.current = false;
            }
          });
          
          setLiveKitConnected(true);
          setParticipantCount(liveKitServiceRef.current.participantCount);
        } else {
          throw new Error('Failed to fetch LiveKit configuration');
        }
      }
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      setLiveKitConnected(false);
      setParticipantCount(0);
      await setupMicrophoneAnalyser();
    }
    
    // Start background sounds
    if (selectedPreset.config.backgroundNoise !== 'none') {
      backgroundAudioServiceRef.current?.startBackgroundSound(
        selectedPreset.config.backgroundNoise as any,
        selectedPreset.config.backgroundNoiseLevel
      );
    }
    
    // Start listening for dispatcher to speak immediately
    setWaitingForDispatcher(true);
    setIsSystemWarming(false);
    
    // Start transcription immediately - no delays
    console.log('🎯 Starting Deepgram transcription immediately');
    startDeepgramTranscription();
  };

  const handleEndSimulation = async () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    isProcessingRef.current = false;
    shouldRestartRecognitionRef.current = false;
    setIsRecording(false);
    setWaitingForDispatcher(false);
    setIsCallerSpeaking(false);
    setIsSystemWarming(false);
    stopDeepgramTranscription();
    voiceServiceRef.current?.clearAudioQueue();
    
    // Stop background sounds
    backgroundAudioServiceRef.current?.stopBackgroundSound();
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (transcriptBufferRef.current) {
      clearTimeout(transcriptBufferRef.current);
      transcriptBufferRef.current = null;
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

    // Return to selection screen
    setAppState('selection');
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    shouldRestartRecognitionRef.current = false;
    
    if (deepgramServiceRef.current && deepgramServiceRef.current.isTranscribing) {
      deepgramServiceRef.current.pauseTranscription();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (transcriptBufferRef.current) {
      clearTimeout(transcriptBufferRef.current);
      transcriptBufferRef.current = null;
    }
    
    voiceServiceRef.current?.clearAudioQueue();
    setIsCallerSpeaking(false);
    isProcessingRef.current = false;
    setMicrophoneLevel(0);
  };

  const handleResume = async () => {
    setIsPaused(false);
    isPausedRef.current = false;
    shouldRestartRecognitionRef.current = true;
    isProcessingRef.current = false;
    
    if (!analyserRef.current || !micStreamRef.current) {
      await setupMicrophoneAnalyser();
    }
    
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

  // Audio device handlers
  const handleMicrophoneChange = (deviceId: string) => {
    voiceServiceRef.current?.setMicrophoneDevice(deviceId);
  };

  const handleSpeakerChange = (deviceId: string) => {
    voiceServiceRef.current?.setSpeakerDevice(deviceId);
  };


  // Enhanced caller response system using preset instructions with streaming
  const generateEnhancedCallerResponse = async (
    operatorTranscript: string,
    useStreaming: boolean = true
  ): Promise<string> => {
    if (!selectedPreset) return '';

    // Use the consistent address selected at the start of the conversation
    const cadAddresses: string[] = [];
    
    if (selectedAddress) {
      // Use the consistent address selected at conversation start
      cadAddresses.push(selectedAddress);
      console.log('🏠 Using consistent address throughout conversation:', selectedAddress);
    } else if (cadEntry && cadEntry.location) {
      // Fallback to CAD-configured address if available
      cadAddresses.push(cadEntry.location);
    } else {
      // Final fallback - should not happen if address selection worked properly
      const emergencyType = CADAddressService.extractEmergencyTypeFromTranscript(selectedPreset.transcript);
      const defaultAddresses = CADAddressService.getAddressesForEmergencyType(
        emergencyType, 
        selectedPreset.config.city, 
        selectedPreset.config.state
      );
      cadAddresses.push(...defaultAddresses);
      console.warn('⚠️ Fallback: using emergency addresses because selectedAddress is empty');
    }

    // Create enhanced context with custom instructions
    const enhancedContext = {
      transcript: selectedPreset.transcript,
      callerInstructions: selectedPreset.callerInstructions,
      cooperationLevel: selectedPreset.config.cooperationLevel,
      location: `${selectedPreset.config.city}, ${selectedPreset.config.state}`,
      cadInfo: cadEntry ? JSON.stringify(cadEntry) : ''
    };

    let fullResponse = '';
    let cleanedFullResponse = '';
    let hasStartedSpeaking = false;
    let sentenceQueue: { text: string; audioBuffer?: ArrayBuffer }[] = [];
    let isProcessingQueue = false;
    let isGeneratingAudio = false;
    
    if (useStreaming) {
      console.log('🚀 Using streaming response generation');
      
      // Function to pre-generate audio for upcoming sentences
      const preGenerateAudio = async () => {
        if (isGeneratingAudio) return;
        
        // Find all sentences without audio (batch generate for speed)
        const sentencesNeedingAudio = sentenceQueue.filter(item => !item.audioBuffer);
        if (sentencesNeedingAudio.length === 0) return;
        
        isGeneratingAudio = true;
        
        try {
          // Batch generate up to 3 sentences at once for maximum speed
          const batchSize = Math.min(3, sentencesNeedingAudio.length);
          const batchToGenerate = sentencesNeedingAudio.slice(0, batchSize);
          
          console.log('🚀 Batch pre-generating audio for', batchSize, 'sentences');
          
          const texts = batchToGenerate.map(item => item.text);
          const audioBuffers = await voiceServiceRef.current?.batchTextToSpeech(texts);
          
          if (audioBuffers) {
            // Assign the generated audio back to the sentence items
            batchToGenerate.forEach((item, index) => {
              if (audioBuffers[index] && audioBuffers[index].byteLength > 0) {
                item.audioBuffer = audioBuffers[index];
                console.log('✅ Audio pre-generated for:', item.text.substring(0, 30) + '...');
              }
            });
          }
        } catch (error) {
          console.error('❌ Error batch pre-generating audio:', error);
          // Fallback to individual generation for the first sentence
          const firstSentence = sentencesNeedingAudio[0];
          try {
            const audioBuffer = await voiceServiceRef.current?.textToSpeech(firstSentence.text);
            if (audioBuffer) {
              firstSentence.audioBuffer = audioBuffer;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback audio generation also failed:', fallbackError);
          }
        } finally {
          isGeneratingAudio = false;
          // Continue pre-generating if there are more sentences
          if (sentenceQueue.some(item => !item.audioBuffer)) {
            setTimeout(() => preGenerateAudio(), 100);
          }
        }
      };
      
      const processNextSentence = async () => {
        if (isProcessingQueue || sentenceQueue.length === 0) return;
        
        isProcessingQueue = true;
        const nextSentenceItem = sentenceQueue.shift()!;
        
        console.log('🎵 Processing sentence in order:', nextSentenceItem.text.substring(0, 30) + '...');
        
        if (!hasStartedSpeaking) {
          console.log('🎵 Starting caller speaking animation');
          setIsCallerSpeaking(true);
          hasStartedSpeaking = true;
        }
        
        try {
          let audioBuffer = nextSentenceItem.audioBuffer;
          
          // If audio not pre-generated, generate it now (fallback)
          if (!audioBuffer) {
            console.log('⚡ Generating audio on-demand for:', nextSentenceItem.text.substring(0, 30) + '...');
            audioBuffer = await voiceServiceRef.current?.textToSpeech(nextSentenceItem.text);
          } else {
            console.log('⚡ Using pre-generated audio - instant playback!');
          }
          
          if (audioBuffer) {
            // Play the audio directly using the audio service
            await voiceServiceRef.current?.queueAudio(
              audioBuffer,
              selectedPreset.config.volumeLevel,
              undefined, // onStart
              () => {
                // Sentence audio completed, process next
                console.log('🎵 Sentence completed, remaining in queue:', sentenceQueue.length);
                isProcessingQueue = false;
                
                // Start pre-generating audio for upcoming sentences
                if (!isGeneratingAudio) {
                  preGenerateAudio();
                }
                
                // Process next sentence in queue immediately (no delay for speed)
                if (sentenceQueue.length > 0) {
                  // Check if the next sentence already has audio ready
                  const nextItem = sentenceQueue[0];
                  if (nextItem?.audioBuffer) {
                    // Audio is ready, play immediately
                    processNextSentence();
                  } else {
                    // Wait a bit for audio to be ready, then play
                    setTimeout(() => {
                      if (sentenceQueue.length > 0) {
                        processNextSentence();
                      }
                    }, 50);
                  }
                } else {
                  // All sentences complete - stop speaking animation
                  console.log('🎵 All sentences complete, stopping caller speaking animation');
                  setIsCallerSpeaking(false);
                }
              }
            );
          }
        } catch (error) {
          console.error('Error processing sentence:', error);
          isProcessingQueue = false;
          // Stop speaking animation on error
          setIsCallerSpeaking(false);
        }
      };
      
      const response = await conversationServiceRef.current.generateCallerResponse(
        selectedPreset.transcript,
        operatorTranscript,
        selectedPreset.config.cooperationLevel,
        JSON.stringify(enhancedContext),
        selectedPreset.realTranscript,
        cadAddresses, // Always pass addresses (we ensure they're available above)
        (token: string) => {
          // Handle streaming tokens - clean as we go
          fullResponse += token;
          // Show cleaned version in real-time for consistency
          const cleanedForDisplay = fullResponse
            .replace(/\[[\w\s]*\]/g, '') // Remove [action] immediately
            .replace(/\([\w\s]*\)/g, '') // Remove (action) immediately
            .replace(/\*[\w\s]*\*/g, '') // Remove *action* immediately
            .trim();
          setPendingCallerMessage(cleanedForDisplay);
        },
        async (sentence: string) => {
          // Queue sentences for ordered processing
          console.log('📝 Queueing sentence:', sentence);
          sentenceQueue.push({ text: sentence, audioBuffer: undefined });
          
          // Build the cleaned full response for the final message
          cleanedFullResponse += (cleanedFullResponse ? ' ' : '') + sentence;
          
          // Immediately start pre-generating audio for this and upcoming sentences
          if (!isGeneratingAudio) {
            preGenerateAudio();
          }
          
          // If this is the first sentence, start processing immediately
          if (!isProcessingQueue && sentenceQueue.length === 1) {
            // Give a tiny delay to allow for potential batching, then start
            setTimeout(() => {
              if (!isProcessingQueue) {
                processNextSentence();
              }
            }, 50);
          }
        }
      );
      
      // Final message update with complete cleaned response
      setMessages(prev => [
        ...prev,
        {
          role: 'caller',
          content: cleanedFullResponse || response, // Use cleaned version if available
          timestamp: new Date()
        }
      ]);
      
      // Safety timeout to ensure speaking animation stops even if callbacks fail
      setTimeout(() => {
        if (sentenceQueue.length === 0 && !isProcessingQueue) {
          console.log('🔧 Safety fallback: stopping caller speaking animation');
          setIsCallerSpeaking(false);
        }
      }, 10000); // 10 second timeout (longer due to pre-generation)
      
      return cleanedFullResponse || response;
    } else {
      // Non-streaming fallback
      return await conversationServiceRef.current.generateCallerResponse(
        selectedPreset.transcript,
        operatorTranscript,
        selectedPreset.config.cooperationLevel,
        JSON.stringify(enhancedContext),
        selectedPreset.realTranscript,
        cadAddresses // Always pass addresses (we ensure they're available above)
      );
    }
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
      
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let lastUpdate = 0;
      const checkLevel = () => {
        const now = Date.now();
        
        if (now - lastUpdate < 100) {
          if (isRunningRef.current && !isPausedRef.current) {
            requestAnimationFrame(checkLevel);
          }
          return;
        }
        lastUpdate = now;
        
        if (analyserRef.current && isRunningRef.current && !isPausedRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          const sampleRate = 4;
          for (let i = 0; i < bufferLength; i += sampleRate) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / (bufferLength / sampleRate));
          const volume = Math.min(100, (rms / 128) * 100);
          
          setMicrophoneLevel(volume);
          requestAnimationFrame(checkLevel);
        } else if (isRunningRef.current && !isPausedRef.current) {
          setMicrophoneLevel(0);
          setTimeout(() => requestAnimationFrame(checkLevel), 100);
        } else {
          setMicrophoneLevel(0);
        }
      };
      
      checkLevel();
    } catch (error) {
      console.error('Error setting up microphone analyser:', error);
    }
  };

  const startDeepgramTranscription = async () => {
    console.log('🎯 startDeepgramTranscription called');
    console.log('🎯 Current state:', {
      deepgramExists: !!deepgramServiceRef.current,
      isPaused: isPausedRef.current,
      isTranscribing: deepgramServiceRef.current?.isTranscribing,
      shouldRestart: shouldRestartRecognitionRef.current,
      isRunning: isRunningRef.current,
      hasCallbacks: deepgramServiceRef.current?.hasCallbacks
    });

    if (!deepgramServiceRef.current) {
      console.error('❌ Deepgram service not initialized');
      return;
    }

    if (isPausedRef.current) {
      console.log('⏸️ Skipping transcription - simulation is paused');
      return;
    }
    
    if (deepgramServiceRef.current.isTranscribing) {
      console.log('⚠️ Deepgram already transcribing, skipping start');
      return;
    }
    
    if (!shouldRestartRecognitionRef.current && !isRunningRef.current) {
      console.log('⚠️ Skipping transcription - should not restart or not running');
      return;
    }

    console.log('🎯 Starting Deepgram transcription...');

    try {
      // Only set up callbacks once when the service is created
      if (!deepgramServiceRef.current.hasCallbacks) {
        deepgramServiceRef.current.onTranscript(async (operatorTranscript: string, isFinal: boolean) => {
          console.log('🎯 App received transcript:', operatorTranscript, 'isFinal:', isFinal);
          
          if (!isFinal) {
            setPartialTranscript(operatorTranscript);
            
            if (isCallerSpeaking && operatorTranscript.trim().length > 2) {
              console.log('🚨 Dispatcher interrupting with partial speech:', operatorTranscript);
              voiceServiceRef.current?.clearAudioQueue();
              setIsCallerSpeaking(false);
              isProcessingRef.current = false;
            }
          } else {
            setPartialTranscript('');
            console.log('✅ Final Deepgram transcript:', operatorTranscript);
            
            if (!isPausedRef.current && !isProcessingRef.current && operatorTranscript.trim()) {
              // Process transcript immediately - no buffering delays
              console.log('🔄 Processing transcript immediately:', operatorTranscript);
              await handleFinalTranscript(operatorTranscript);
            }
          }
        });

        deepgramServiceRef.current.onError((error: string) => {
          console.error('Deepgram error:', error);
          setIsRecording(false);
          
          // Only retry if we haven't exceeded retry attempts
          if (deepgramServiceRef.current && deepgramServiceRef.current.reconnectAttempts < 3) {
            setTimeout(() => {
              if (isRunningRef.current && !isPausedRef.current && !isProcessingRef.current) {
                console.log('🔄 Retrying Deepgram connection...');
                startDeepgramTranscription();
              }
            }, 3000);
          } else {
            console.error('❌ Max Deepgram reconnection attempts reached');
          }
        });

        deepgramServiceRef.current.hasCallbacks = true;
      }

      console.log('🚀 Calling deepgramService.startTranscription()...');
      await deepgramServiceRef.current.startTranscription();
      setIsRecording(true);
      setDeepgramStatus(deepgramServiceRef.current.connectionStatus);
      console.log('✅ Started Deepgram transcription successfully');
      console.log('📊 Recording status:', true);
      console.log('📊 Connection status:', deepgramServiceRef.current.connectionStatus);

    } catch (error) {
      console.error('Failed to start Deepgram transcription:', error);
      setIsRecording(false);
    }
  };

  const stopDeepgramTranscription = () => {
    shouldRestartRecognitionRef.current = false;
    
    if (deepgramServiceRef.current) {
      deepgramServiceRef.current.stopTranscription();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
  };

  const handleFinalTranscript = async (operatorTranscript: string) => {
    setLastTranscript(operatorTranscript);
    setWaitingForDispatcher(false);
    isProcessingRef.current = true;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
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
      shouldRestartRecognitionRef.current = false;

      // Generate caller response immediately using enhanced context with streaming
      const callerResponse = await generateEnhancedCallerResponse(operatorTranscript, true);
      
      // Clean up the pending message since we now have the final response
      setPendingCallerMessage('');
      
      // Allow a brief moment for audio to start, then reset processing state
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
      
      // Audio will stop automatically when all queued audio finishes
      // The isCallerSpeaking state will be managed by the audio queue

      shouldRestartRecognitionRef.current = true;

      const timeoutDuration = selectedPreset!.config.cooperationLevel < 30 ? 3000 : 
                            selectedPreset!.config.cooperationLevel < 70 ? 5000 : 8000;
      
      setTimeout(() => {
        if (isRunningRef.current && !isCallerSpeaking && !isPausedRef.current && !isProcessingRef.current) {
          silenceTimeoutRef.current = setTimeout(async () => {
            if (isRunningRef.current && !isCallerSpeaking && !isPausedRef.current) {
              await handleCallerContinuation();
            }
          }, timeoutDuration);
        }
      }, 1000);
    } catch (error) {
      console.error('Error generating caller response:', error);
      setIsCallerSpeaking(false);
      isProcessingRef.current = false;
      
      if (isRunningRef.current && !isPausedRef.current) {
        shouldRestartRecognitionRef.current = true;
      }
    }
  };

  const handleCallerContinuation = async () => {
    if (!isRunning || isCallerSpeaking || isPaused || !selectedPreset) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      const continuationPrompt = selectedPreset.config.cooperationLevel < 30 
        ? "The dispatcher hasn't responded. You're panicked - repeat urgently or add more panicked details."
        : selectedPreset.config.cooperationLevel < 70
        ? "The dispatcher hasn't responded. Add more information or ask if they're still there."
        : "The dispatcher hasn't responded. Politely check if they heard you or provide additional helpful details.";

      const callerResponse = await generateEnhancedCallerResponse(continuationPrompt, true);
      
      // The streaming callbacks handle audio generation and message updates
      // Just wait a bit for completion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Deepgram should already be running - don't restart it
    } catch (error) {
      console.error('Error generating caller continuation:', error);
      setIsCallerSpeaking(false);
      // Deepgram should already be running - don't restart it
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

  // Render based on app state
  const renderCurrentView = () => {
    switch (appState) {
      case 'selection':
        return (
          <SimulationSelector
            presets={presets}
            onStartSimulation={handleStartSimulation}
            onCreateNew={handleCreateNew}
          />
        );

      case 'configuration':
        return (
          <ConfigurationPage
            onSavePreset={handleSavePreset}
            onLoadPreset={() => {}} // Not needed in this flow
            existingPresets={presets}
            editingPreset={editingPreset}
            onBack={handleBackToSelection}
          />
        );

      case 'incoming-call':
        return (
          <IncomingCallInterface
            onAnswer={handleCallAnswered}
            onDecline={() => setAppState('selection')}
            callerLocation={selectedPreset ? `${selectedPreset.config.city}, ${selectedPreset.config.state}` : undefined}
          />
        );

      case 'simulation':
        return selectedPreset ? (
          <SimulationInterface
            preset={selectedPreset}
            isRunning={isRunning}
            isPaused={isPaused}
            isRecording={isRecording}
            isCallerSpeaking={isCallerSpeaking}
            microphoneLevel={microphoneLevel}
            messages={messages}
            pendingCallerMessage={pendingCallerMessage}
            partialTranscript={partialTranscript}
            waitingForDispatcher={waitingForDispatcher}
            isSystemWarming={isSystemWarming}
            onEnd={handleEndSimulation}
            onPause={handlePause}
            onResume={handleResume}
            onRestart={handleRestartSimulation}
            onEdit={handleEditPreset}
            onCADUpdate={setCadEntry}
            onMicrophoneChange={handleMicrophoneChange}
            onSpeakerChange={handleSpeakerChange}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
      
      {/* Microphone Permission Modal */}
      {showMicPermission && (
        <MicrophonePermission onPermissionGranted={handleMicPermissionGranted} />
      )}
      
      {/* Floating Debug Menu */}
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
  );
}

export default App;