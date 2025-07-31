import { SimulationPreset } from '../types';

export class PresetManager {
  private static readonly STORAGE_KEY = '911-sim-presets';

  static getPresets(): SimulationPreset[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const presets = JSON.parse(stored);
      // Convert date strings back to Date objects
      return presets.map((preset: any) => ({
        ...preset,
        createdAt: new Date(preset.createdAt),
        updatedAt: new Date(preset.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading presets:', error);
      return [];
    }
  }

  static savePreset(preset: SimulationPreset): void {
    try {
      const presets = this.getPresets();
      const existingIndex = presets.findIndex(p => p.id === preset.id);
      
      if (existingIndex >= 0) {
        // Update existing preset
        presets[existingIndex] = preset;
      } else {
        // Add new preset
        presets.push(preset);
      }
      
      // Sort by update date (newest first)
      presets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving preset:', error);
      throw new Error('Failed to save preset');
    }
  }

  static deletePreset(presetId: string): void {
    try {
      const presets = this.getPresets();
      const filtered = presets.filter(p => p.id !== presetId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw new Error('Failed to delete preset');
    }
  }

  static exportPresets(): string {
    const presets = this.getPresets();
    return JSON.stringify(presets, null, 2);
  }

  static importPresets(jsonData: string): SimulationPreset[] {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: Expected array of presets');
      }
      
      const presets = imported.map((preset: any) => ({
        ...preset,
        createdAt: new Date(preset.createdAt),
        updatedAt: new Date(preset.updatedAt),
        id: preset.id || Date.now().toString() // Ensure ID exists
      }));
      
      // Validate preset structure
      presets.forEach(preset => {
        if (!preset.name || !preset.transcript || !preset.config) {
          throw new Error('Invalid preset structure');
        }
      });
      
      return presets;
    } catch (error) {
      console.error('Error importing presets:', error);
      throw new Error('Failed to import presets: Invalid format');
    }
  }

  static createSamplePresets(): SimulationPreset[] {
    const samples: SimulationPreset[] = [
      {
        id: 'sample-home-invasion',
        name: 'Home Invasion - High Panic',
        transcript: "There's someone breaking into my house right now! I can hear them downstairs breaking things. I'm hiding in my bedroom with my two kids. Please send help immediately! I think they have a weapon!",
        callerInstructions: "Caller is extremely panicked, whispering to avoid detection. Has young children with them. Occasionally hears noises from downstairs and becomes more frantic.",
        config: {
          cooperationLevel: 25,
          volumeLevel: 60,
          backgroundNoise: 'home',
          backgroundNoiseLevel: 40,
          city: 'Columbus',
          state: 'OH'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-car-accident',
        name: 'Multi-Vehicle Accident',
        transcript: "I just witnessed a terrible car accident on Highway 71 near the Main Street exit. Two cars collided head-on and there's a third car that rear-ended one of them. I can see people trapped inside and there's smoke coming from one of the vehicles. Traffic is backing up fast.",
        callerInstructions: "Caller is a good samaritan who stopped to help. Cooperative but concerned about safety. Can provide good details but is worried about approaching the vehicles.",
        config: {
          cooperationLevel: 85,
          volumeLevel: 75,
          backgroundNoise: 'traffic',
          backgroundNoiseLevel: 60,
          city: 'Columbus',
          state: 'OH'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-medical-emergency',
        name: 'Cardiac Event - Elderly',
        transcript: "My husband collapsed in the kitchen and he's not responding! He was complaining about chest pain and then he just fell down. He's 72 years old and has a history of heart problems. I think he's having a heart attack! He's still breathing but barely.",
        callerInstructions: "Elderly caller, somewhat hard of hearing. Needs instructions repeated. Very worried but trying to follow directions. May struggle with CPR due to age.",
        config: {
          cooperationLevel: 65,
          volumeLevel: 85,
          backgroundNoise: 'home',
          backgroundNoiseLevel: 20,
          city: 'Columbus',
          state: 'OH'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-structure-fire',
        name: 'Apartment Fire - Multiple Victims',
        transcript: "My apartment building is on fire! I'm on the third floor and I can see flames coming from the second floor. The hallways are filling with smoke and I can't get down the stairs. There are families with children trapped up here! The fire alarm is going off and people are screaming!",
        callerInstructions: "Caller is trapped with others. Panic increases as smoke gets worse. Sometimes has to cough or move away from smoke. Can hear other people in background.",
        config: {
          cooperationLevel: 40,
          volumeLevel: 70,
          backgroundNoise: 'crowd',
          backgroundNoiseLevel: 50,
          city: 'Columbus',
          state: 'OH'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-domestic-violence',
        name: 'Domestic Violence - Whispering',
        transcript: "I need help but I have to whisper. My boyfriend came home drunk and he's been hitting me. He's passed out now but I'm scared he'll wake up. I'm locked in the bathroom with my baby. I have bruises and my lip is bleeding. I need someone to come but please don't use sirens - he'll get violent if he wakes up.",
        callerInstructions: "Caller speaks very quietly, almost whispering. Extremely scared and jumpy. Worried about retaliation. May hang up if she hears noises. Has been abused before.",
        config: {
          cooperationLevel: 55,
          volumeLevel: 30,
          backgroundNoise: 'home',
          backgroundNoiseLevel: 15,
          city: 'Columbus',
          state: 'OH'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return samples;
  }

  static initializeSamplePresets(): void {
    const existing = this.getPresets();
    if (existing.length === 0) {
      const samples = this.createSamplePresets();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(samples));
    }
  }
}