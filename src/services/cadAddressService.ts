export class CADAddressService {
  private static defaultAddresses = [
    '125 Main Street',
    '847 Oak Avenue', 
    '1542 Pine Road',
    '673 Maple Boulevard',
    '2158 Cedar Lane',
    '934 Elm Street',
    '421 Washington Avenue',
    '1789 Lincoln Drive',
    '356 Madison Street',
    '2047 Jefferson Road',
    '518 Park Avenue',
    '1223 High Street',
    '767 Broad Street',
    '1445 Center Avenue',
    '892 Church Street',
    '1657 School Road',
    '234 First Street',
    '345 Second Avenue',
    '456 Third Street',
    '567 Fourth Avenue'
  ];

  /**
   * Get default CAD addresses for a specific city and state
   * Format addresses as callers would naturally say them (just street address)
   */
  static getDefaultAddresses(city: string, state: string): string[] {
    return this.defaultAddresses; // Return just the street addresses
  }

  /**
   * Get a random subset of default addresses
   */
  static getRandomAddresses(city: string, state: string, count: number = 5): string[] {
    const allAddresses = this.getDefaultAddresses(city, state);
    const shuffled = [...allAddresses].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get addresses suitable for a specific emergency type
   * Returns realistic street addresses without city/state (as callers would naturally say them)
   */
  static getAddressesForEmergencyType(emergencyType: string, city: string, state: string): string[] {
    let specificAddresses: string[] = [];
    
    switch (emergencyType.toLowerCase()) {
      case 'medical emergency':
      case 'medical':
        specificAddresses = [
          '1234 Residential Lane',
          '5678 Senior Living Drive',
          '9012 Family Court'
        ];
        break;
      case 'fire':
      case 'structure fire':
        specificAddresses = [
          '3456 Apartment Complex Way',
          '7890 Business District Street',
          '1357 Industrial Boulevard'
        ];
        break;
      case 'traffic accident':
      case 'accident':
        specificAddresses = [
          'Highway 71 and Main Street',
          'Interstate 270 Mile Marker 15',
          'Broad Street and High Street'
        ];
        break;
      case 'burglary':
      case 'domestic disturbance':
      case 'assault':
        specificAddresses = [
          '2468 Quiet Neighborhood Lane',
          '1357 Suburban Drive',
          '9876 Residential Court'
        ];
        break;
      default:
        return this.getRandomAddresses(city, state, 3);
    }
    
    // Add some random addresses to the specific ones
    const randomAddresses = this.getRandomAddresses(city, state, 2);
    return [...specificAddresses, ...randomAddresses];
  }

  /**
   * Extract emergency type from transcript
   */
  static extractEmergencyTypeFromTranscript(transcript: string): string {
    const medicalKeywords = ['heart attack', 'chest pain', 'unconscious', 'breathing', 'medical', 'ambulance', 'hurt', 'injured', 'bleeding'];
    const fireKeywords = ['fire', 'smoke', 'burning', 'flames', 'explosion'];
    const crimeKeywords = ['robbery', 'burglary', 'break', 'breaking in', 'intruder', 'assault', 'fight', 'domestic', 'violence'];
    const trafficKeywords = ['accident', 'crash', 'collision', 'highway', 'road', 'traffic', 'vehicle'];

    const transcriptLower = transcript.toLowerCase();

    if (medicalKeywords.some(keyword => transcriptLower.includes(keyword))) {
      return 'medical emergency';
    }
    if (fireKeywords.some(keyword => transcriptLower.includes(keyword))) {
      return 'fire';
    }
    if (crimeKeywords.some(keyword => transcriptLower.includes(keyword))) {
      return 'burglary';
    }
    if (trafficKeywords.some(keyword => transcriptLower.includes(keyword))) {
      return 'traffic accident';
    }

    return 'other';
  }
}