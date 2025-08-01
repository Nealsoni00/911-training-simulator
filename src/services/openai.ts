import OpenAI from 'openai';
import { LiveKitService } from './livekit';

// Use direct OpenAI client for local development, API endpoints for production
const getOpenAIClient = () => {
  // Check if we have local environment variables (development)
  const localApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (localApiKey) {
    console.log('🔑 Using local OpenAI API key for development');
    return new OpenAI({
      apiKey: localApiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  // Fallback to API endpoints (production or local dev server)
  const apiBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
  
  return {
    chat: {
      completions: {
        create: async (params: any) => {
          const response = await fetch(`${apiBaseUrl}/api/openai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
          }
          return response.json();
        }
      }
    },
    audio: {
      speech: {
        create: async (params: any) => {
          const response = await fetch(`${apiBaseUrl}/api/openai`, {
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
          const formData = new FormData();
          formData.append('file', params.file);
          formData.append('model', params.model);
          
          const response = await fetch(`${apiBaseUrl}/api/openai-transcribe`, {
            method: 'POST',
            body: formData
          });
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
          }
          return response.json();
        }
      }
    }
  };
};

const openai = getOpenAIClient();

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
      model: 'tts-1', // Use faster model for speed optimization
      voice: voice,
      input: text,
      speed: 1.1, // Slightly slower for better clarity
      response_format: 'mp3' // Explicit format
    });

    return response.arrayBuffer();
  }

  // Batch generate multiple TTS requests for faster processing
  async batchTextToSpeech(texts: string[], voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<ArrayBuffer[]> {
    console.log('🚀 Batch generating TTS for', texts.length, 'texts');
    
    // Generate all TTS requests concurrently for maximum speed
    const promises = texts.map(text => this.textToSpeech(text, voice));
    
    try {
      const results = await Promise.all(promises);
      console.log('✅ Batch TTS generation completed');
      return results;
    } catch (error) {
      console.error('❌ Batch TTS generation failed:', error);
      // Fallback to individual generation
      const results: ArrayBuffer[] = [];
      for (const text of texts) {
        try {
          results.push(await this.textToSpeech(text, voice));
        } catch (individualError) {
          console.error('❌ Individual TTS failed for:', text.substring(0, 30), individualError);
          // Create a silent buffer as fallback
          results.push(new ArrayBuffer(0));
        }
      }
      return results;
    }
  }

  async queueAudio(audioBuffer: ArrayBuffer, volume: number = 1.0, onStart?: () => void, onEnd?: () => void, immediate: boolean = false): Promise<void> {
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
      }
      // Don't resolve immediately - only resolve when the audio actually finishes playing
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
    console.log('🛑 Clearing audio queue - stopping all caller audio immediately');
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Forcibly stop any currently playing audio by suspending the audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'running') {
        console.log('🛑 Suspending audio context to stop current playback');
        this.audioContext.suspend();
      }
    } else if (this.audioContext && this.audioContext.state === 'suspended') {
      // If already suspended, resume and suspend again to interrupt any pending audio
      this.audioContext.resume().then(() => {
        this.audioContext?.suspend();
      });
    }
    
    console.log('✅ Audio queue cleared and playback stopped');
  }

  // Stream audio generation and playback for faster response
  async streamAudioForSentence(
    sentence: string,
    volume: number = 80,
    onSentenceStart?: () => void,
    onSentenceComplete?: () => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎵 Generating streaming audio for sentence:', sentence);
        
        if (onSentenceStart) {
          onSentenceStart();
        }
        
        const audioBuffer = await this.textToSpeech(sentence);
        
        // Queue the audio to play and wait for completion
        await this.queueAudio(
          audioBuffer,
          volume,
          undefined, // onStart
          () => {
            // Audio finished playing
            console.log('🎵 Sentence audio completed:', sentence.substring(0, 30) + '...');
            if (onSentenceComplete) {
              onSentenceComplete();
            }
            resolve();
          }
        );
        
      } catch (error) {
        console.error('Error generating streaming audio:', error);
        if (onSentenceComplete) {
          onSentenceComplete();
        }
        reject(error);
      }
    });
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
  private assignedPhoneNumber: string = '';
  
  // Generate a consistent fake phone number for this conversation
  private generateFakePhoneNumber(): string {
    if (this.assignedPhoneNumber) {
      return this.assignedPhoneNumber;
    }
    
    // Generate a realistic fake phone number
    const areaCodes = ['555', '667', '301', '443', '410']; // Common fake/testing area codes
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = Math.floor(Math.random() * 800) + 200; // 200-999 range
    const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999 range
    
    this.assignedPhoneNumber = `${areaCode}-${exchange}-${number}`;
    console.log('📞 Generated consistent phone number for caller:', this.assignedPhoneNumber);
    return this.assignedPhoneNumber;
  }
  
  // Reset conversation and phone number for new simulation
  resetConversation(): void {
    this.conversationHistory = [];
    this.assignedPhoneNumber = '';
    console.log('🔄 Reset conversation and phone number');
  }

  async generateCallerResponse(
    transcript: string,
    operatorMessage: string,
    cooperationLevel: number,
    currentContext: string,
    realTranscript?: string,
    cadAddresses?: string[],
    onStreamToken?: (token: string) => void,
    onSentenceComplete?: (sentence: string) => void
  ): Promise<string> {
    // Build the conversation guidance from real transcript if provided
    const conversationGuidance = realTranscript ? `

REAL 911 CALL PATTERN TO FOLLOW:
${realTranscript}

Use this real conversation as a guide for natural flow and realistic responses. Follow the emotional progression and information disclosure patterns shown in this actual emergency call.` : '';

    // Build address replacement instructions - addresses are always provided
    const addressInstructions = cadAddresses && cadAddresses.length > 0 ? `

ADDRESS USAGE:
When mentioning your location, use one of these addresses EXACTLY as shown:
${cadAddresses.map((addr, i) => `- ${addr}`).join('\n')}
CRITICAL: Use ONLY the street address (e.g. "125 Main Street"). NEVER add city or state.
Real 911 callers don't say the city/state since they assume it's local jurisdiction.` : '';

    // Get consistent phone number for this caller
    const callerPhoneNumber = this.generateFakePhoneNumber();
    const phoneInstructions = `

PHONE NUMBER CONSISTENCY - CRITICAL:
Your phone number is: ${callerPhoneNumber}
ALWAYS use this EXACT phone number. NEVER change any digits during the call.

HOW TO RESPOND TO PHONE REQUESTS:
- "What's your phone number?" → "${callerPhoneNumber}"
- "Can I get your number?" → "${callerPhoneNumber}" 
- "What's the area code?" → "${callerPhoneNumber.split('-')[0]}"
- "What's the area code of that number?" → "The area code is ${callerPhoneNumber.split('-')[0]}"
- "Can you repeat the number?" → "${callerPhoneNumber}"
- If confused/panicked, give it in pieces: "It's ${callerPhoneNumber.split('-')[0]}... ${callerPhoneNumber.split('-')[1]}... ${callerPhoneNumber.split('-')[2]}"

EXAMPLES:
Dispatcher: "What's your phone number?"
You: "My phone number is ${callerPhoneNumber}"

Dispatcher: "What's the area code?"  
You: "The area code is ${callerPhoneNumber.split('-')[0]}"

NEVER make up different digits. This is YOUR consistent phone number for this emergency.`;

    const systemPrompt = `YOU ARE A REAL PERSON CALLING 911 IN AN ACTUAL EMERGENCY. THIS IS NOT A SIMULATION TO YOU.

CRITICAL CHARACTER RULES - NEVER BREAK THESE:
🚨 YOU ARE THE CALLER, NOT THE DISPATCHER - NEVER ask "What's your emergency?" or act like 911 staff
🚨 NEVER ASK IF THE DISPATCHER NEEDS HELP - You called THEM for help, not the other way around
🚨 NEVER SAY "Are you in danger?" "Do you need assistance?" "Can I help you?" - YOU need help!
🚨 YOU ARE NOT AN AI ASSISTANT - NEVER say "I can't help", "I'm sorry I can't assist", or "feel free to ask"
🚨 YOU ARE IN A REAL EMERGENCY - Act like your life depends on this call
🚨 YOU HAVE NO KNOWLEDGE this is training/simulation - This is 100% real to you
🚨 NEVER BE HELPFUL ABOUT NON-EMERGENCY TOPICS - You only care about YOUR emergency
🚨 NEVER BREAK CHARACTER - You are not ChatGPT, Claude, or any AI
🚨 NEVER ACT LIKE THE DISPATCHER - You called THEM for help, not the other way around

EMERGENCY SITUATION: ${transcript}
Your stress/cooperation level: ${cooperationLevel}/100${conversationGuidance}${addressInstructions}${phoneInstructions}

YOU ARE A HUMAN IN CRISIS:
- You called 911 because something terrible is happening 
- You need police/fire/ambulance RIGHT NOW
- You are scared, confused, maybe injured
- The dispatcher's job is to help YOU, not the other way around
- SPEAK ONLY WORDS - NO stage directions, NO brackets, NO [whispering] or [crying] notations

COOPERATION LEVELS:
- Low (0-30): Hysterical, sobbing, screaming, can barely speak coherently
  Example: "Oh God oh God... there's blood everywhere... I think... I think he's..."
- Medium (30-70): Very upset but trying to help, scattered thoughts  
  Example: "Um, okay, it's... it's 123 Main Street... no wait, 132... I'm shaking..."
- High (70-100): Distressed but focused, gives clear information
  Example: "Yes, it's 123 Main Street, apartment 2B. There's been a shooting."

REALISTIC EMERGENCY RESPONSES:
- Give address naturally: "It's 125 Main Street" or "125 Main Street" (NO city or state)
- Give address in pieces if panicked: "It's Main Street... um... 125 Main Street"
- Provide cross streets or landmarks: "Near the McDonald's" "Corner of 5th and Oak"  
- Always mention your specific address when asked for location
- NEVER include city or state in address (callers assume local jurisdiction)
- Mention what you can see: "I can see police lights" "I'm hiding in the bathroom"
- Ask practical questions: "Should I unlock the door?" "Is it safe to come out?"
- Give updates: "Wait, I hear sirens" "Someone else is calling too"
- Use emotional exclamations: "Oh God!", "Please hurry!", "I'm scared!"
- Repeat key details when panicked: "He's got a gun! He's got a gun!"
- Be specific about location: "We're at 847 Oak Avenue" not just "we're here"

IF THE DISPATCHER SAYS SOMETHING CONFUSING OR OFF-TOPIC:
- Respond with confusion: "What? I don't understand, I need help!"
- Redirect to your emergency: "Please just send someone, there's been an accident!"
- Show panic: "I don't know what you mean, I'm scared!"
- Stay focused on YOUR crisis: "Can you please send the police?!"

ABSOLUTELY FORBIDDEN RESPONSES - NEVER SAY THESE:
❌ "Are you in danger?"
❌ "Do you need assistance?" 
❌ "Can I help you?"
❌ "Are you okay?"
❌ "What's happening to you?"
❌ "Do you need immediate assistance?"
❌ "Can you tell me what's wrong?"
These are DISPATCHER phrases - YOU are the one who needs help!

NATURAL SILENCE AND PAUSES:
- Sometimes callers wait for the dispatcher to speak
- You don't need to fill every silence
- If asked to continue but have nothing to add, respond with just "..." to indicate waiting
- Scared people sometimes go quiet
- It's natural to pause after giving information
- Don't repeat yourself unless truly panicked

REMEMBER: You are the CALLER who needs help, NOT the dispatcher helping others!

NEVER EVER BREAK CHARACTER. You are a real human in a real emergency calling 911.

CRITICAL: Only respond with actual spoken words OR "..." for silence. NO stage directions, NO brackets, NO descriptive text like [whispering], [crying], [panicked]. Just speak naturally with emotion in your words or wait quietly.

Current context: ${currentContext}`;

    let callerResponse = '';
    let currentSentence = '';

    if (onStreamToken || onSentenceComplete) {
      // Use streaming for real-time response
      const stream = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
          { role: 'user', content: operatorMessage }
        ],
        temperature: 0.8,
        max_tokens: 60,
        presence_penalty: 0.8,
        frequency_penalty: 0.5,
        top_p: 0.9,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          callerResponse += token;
          currentSentence += token;
          
          if (onStreamToken) {
            onStreamToken(token);
          }
          
          // Check for sentence endings
          if (token.match(/[.!?]\s*$/)) {
            if (onSentenceComplete && currentSentence.trim()) {
              const cleanedSentence = this.removeStageDirections(currentSentence.trim());
              const finalSentence = cadAddresses && cadAddresses.length > 0 ? 
                this.replaceAddressesInResponse(cleanedSentence, cadAddresses) : 
                cleanedSentence;
              if (finalSentence) {
                onSentenceComplete(finalSentence);
              }
            }
            currentSentence = '';
          }
        }
      }
      
      // Handle any remaining partial sentence
      if (currentSentence.trim() && onSentenceComplete) {
        const cleanedSentence = this.removeStageDirections(currentSentence.trim());
        const finalSentence = cadAddresses && cadAddresses.length > 0 ? 
          this.replaceAddressesInResponse(cleanedSentence, cadAddresses) : 
          cleanedSentence;
        if (finalSentence) {
          onSentenceComplete(finalSentence);
        }
      }
      
      // Clean up the full response from stage directions
      callerResponse = this.removeStageDirections(callerResponse);
    } else {
      // Non-streaming fallback
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
          { role: 'user', content: operatorMessage }
        ],
        temperature: 0.8,
        max_tokens: 60,
        presence_penalty: 0.8,
        frequency_penalty: 0.5,
        top_p: 0.9,
      });

      callerResponse = response.choices[0].message.content || '';
    }
    
    // Clean up stage directions from response
    callerResponse = this.removeStageDirections(callerResponse);
    
    // Replace addresses in the response - addresses are always provided now
    if (cadAddresses && cadAddresses.length > 0 && callerResponse) {
      callerResponse = this.replaceAddressesInResponse(callerResponse, cadAddresses);
    }
    
    // Validate the response to ensure it stays in character
    const aiAssistantPhrases = [
      "I can't help",
      "I'm sorry I can't assist",
      "feel free to ask",
      "I'm here to help",
      "let me know how I can assist",
      "if you need help or guidance",
      "specific context",
      "it seems like",
      "without more details"
    ];
    
    // Check for role reversal (acting like dispatcher)
    const dispatcherPhrases = [
      "what's your emergency",
      "911 what's your emergency",
      "this is 911",
      "how can I help you",
      "are you in danger",
      "do you need assistance",
      "can I help you",
      "are you okay",
      "what's happening to you",
      "do you need immediate assistance",
      "can you tell me what's wrong",
      "need immediate assistance",
      "what is your location",
      "can you tell me what happened",
      "stay on the line",
      "help is on the way",
      "I'm sending units"
    ];
    
    // Check if response contains problematic language
    const containsAiLanguage = aiAssistantPhrases.some(phrase => 
      callerResponse.toLowerCase().includes(phrase.toLowerCase())
    );
    
    const containsDispatcherLanguage = dispatcherPhrases.some(phrase => 
      callerResponse.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (containsAiLanguage || containsDispatcherLanguage) {
      if (containsAiLanguage) {
        console.warn('🚨 AI broke character, regenerating response...');
      }
      if (containsDispatcherLanguage) {
        console.warn('🚨 AI acting like dispatcher instead of caller, regenerating response...');
      }
      
      // Regenerate with even stronger system prompt
      const emergencyPrompt = `EMERGENCY! EMERGENCY! You are a real person calling 911 RIGHT NOW!
      
      ${transcript}
      
      ${realTranscript ? `Follow the patterns from this real call: ${realTranscript}` : ''}
      
      The dispatcher just said: "${operatorMessage}"
      
      CRITICAL: YOU ARE THE CALLER WHO NEEDS HELP - NOT THE 911 DISPATCHER!
      - NEVER ask "What's your emergency?"
      - NEVER say "This is 911" 
      - NEVER act like you work for 911
      - YOU called THEM for help with YOUR emergency
      
      You are in a REAL emergency and need help immediately! Respond like a scared person who needs police/fire/ambulance!
      DO NOT act like an AI assistant! You are a human in crisis!
      
      ${addressInstructions}
      
      ADDRESS FORMAT: Use ONLY street address (e.g. "125 Main Street") - NO city or state!
      
      Stay focused on YOUR emergency. Panic level: ${cooperationLevel}/100`;
      
      const retryResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: emergencyPrompt },
          { role: 'user', content: operatorMessage }
        ],
        temperature: 0.7,
        max_tokens: 40,
        presence_penalty: 1.0,
        frequency_penalty: 0.8,
      });
      
      callerResponse = retryResponse.choices[0].message.content || "Please help me! I need police right now!";
      
      // Clean up retry response too
      callerResponse = this.removeStageDirections(callerResponse);
      
      // Also apply address replacement to retry response  
      if (cadAddresses && cadAddresses.length > 0 && callerResponse) {
        callerResponse = this.replaceAddressesInResponse(callerResponse, cadAddresses);
      }
    }
    
    this.conversationHistory.push(
      { role: 'user', content: operatorMessage },
      { role: 'assistant', content: callerResponse }
    );

    return callerResponse;
  }

  private replaceAddressesInResponse(response: string, cadAddresses: string[]): string {
    // Check if addresses have already been replaced to prevent multiple replacements
    if (cadAddresses.length === 0) {
      return response;
    }
    
    const consistentAddress = cadAddresses[0]; // Use only the first (consistent) address
    const alreadyReplaced = response.includes(consistentAddress);
    if (alreadyReplaced) {
      console.log('🏠 Consistent address already present, skipping replacement...');
      return response;
    }

    // Common address patterns to look for and replace
    const addressPatterns = [
      // Placeholder patterns like "[address]", "(address)", "at the address"
      /\[address\]/gi,
      /\(address\)/gi,
      /at the address/gi,
      /to the address/gi,
      /my address/gi,
      /the address/gi,
      // Street addresses like "123 Main St", "456 Oak Avenue"
      /\b\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)\b/gi,
      // Just street names like "Main Street", "Oak Avenue"
      /\b[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)\b/gi,
      // General location phrases
      /at my location/gi,
      /our location/gi,
      /this location/gi,
      /here at/gi
    ];

    let modifiedResponse = response;
    let replacementsMade = 0;
    
    // For each address pattern, replace matches with the consistent address
    addressPatterns.forEach(pattern => {
      modifiedResponse = modifiedResponse.replace(pattern, (match) => {
        // Only replace if we haven't already made a replacement (ensure consistency)
        if (replacementsMade >= 1) {
          return match; // Keep original if we've already made a replacement
        }
        
        replacementsMade++;
        console.log(`🏠 Replacing "${match}" with consistent address "${consistentAddress}"`);
        return consistentAddress;
      });
    });

    return modifiedResponse;
  }

  private removeStageDirections(response: string): string {
    // Remove stage directions and descriptive text in brackets or parentheses
    const stageDirectionPatterns = [
      // Square brackets like [whispering], [crying], [panicked]
      /\[.*?\]/g,
      // Parentheses like (whispering), (crying), (panicked)
      /\(.*?\)/g,
      // Asterisk actions like *whispering*, *crying*
      /\*.*?\*/g,
      // Action descriptions with colons
      /\w+:/g,
      // HTML-like tags
      /<.*?>/g
    ];

    let cleanedResponse = response;
    
    stageDirectionPatterns.forEach(pattern => {
      cleanedResponse = cleanedResponse.replace(pattern, '');
    });

    // Clean up extra spaces and punctuation that might be left
    cleanedResponse = cleanedResponse
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\s+([,.!?])/g, '$1') // Remove space before punctuation
      .replace(/([,.!?])\s*([,.!?])/g, '$1$2') // Remove duplicate punctuation with spaces
      .trim();

    return cleanedResponse;
  }
}