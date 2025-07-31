export interface CallTranscript {
  id: string;
  content: string;
  timestamp: Date;
}

export interface CADEntry {
  id: string;
  timestamp: Date;
  callType: string;
  priority: string;
  location: string;
  callerName: string;
  callerPhone: string;
  description: string;
  units: string[];
  status: 'pending' | 'dispatched' | 'resolved';
  notes: string;
}

export interface SimulatorConfig {
  cooperationLevel: number; // 0-100
  volumeLevel: number; // 0-100
  backgroundNoise: 'none' | 'traffic' | 'crowd' | 'home' | 'outdoor';
  backgroundNoiseLevel: number; // 0-100
  city: string;
  state: string;
}

export interface ConversationMessage {
  role: 'operator' | 'caller';
  content: string;
  timestamp: Date;
}

export interface SimulationPreset {
  id: string;
  name: string;
  transcript: string;
  realTranscript?: string; // Optional real 911 call transcript to guide conversation
  callerInstructions: string;
  config: SimulatorConfig;
  createdAt: Date;
  updatedAt: Date;
}