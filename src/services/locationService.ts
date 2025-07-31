export interface LocationSuggestion {
  address: string;
  type: 'street' | 'intersection' | 'landmark' | 'business';
}

export class LocationService {
  private commonPlaces = [
    'Fire Station', 'Police Station', 'Hospital', 'School', 'Library', 'Park', 'Mall',
    'Walmart', 'McDonalds', 'Starbucks', 'Gas Station', 'Bank', 'Post Office',
    'City Hall', 'Airport', 'Train Station', 'Bus Station', 'Hotel', 'Church'
  ];

  private streetSuffixes = [
    'St', 'Street', 'Ave', 'Avenue', 'Rd', 'Road', 'Blvd', 'Boulevard', 
    'Dr', 'Drive', 'Ln', 'Lane', 'Ct', 'Court', 'Way', 'Place', 'Pl'
  ];

  private commonStreetNames = [
    'Main', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Park', 'Oak', 'Pine', 'Maple',
    'Cedar', 'Elm', 'Washington', 'Lincoln', 'Madison', 'Jefferson', 'Adams', 'Jackson',
    'Roosevelt', 'Kennedy', 'King', 'Church', 'School', 'Center', 'High', 'Broad'
  ];

  generateLocationSuggestions(query: string, city: string, state: string): LocationSuggestion[] {
    if (!query || query.length < 2) return [];

    const suggestions: LocationSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Generate street addresses
    if (this.isNumericStart(query)) {
      // If query starts with numbers, suggest street addresses
      const number = query.match(/^\d+/)?.[0] || '';
      this.commonStreetNames.forEach(streetName => {
        this.streetSuffixes.forEach(suffix => {
          const address = `${number} ${streetName} ${suffix}, ${city}, ${state}`;
          if (address.toLowerCase().includes(queryLower)) {
            suggestions.push({
              address,
              type: 'street'
            });
          }
        });
      });
    } else {
      // Suggest based on street names
      this.commonStreetNames.forEach(streetName => {
        if (streetName.toLowerCase().includes(queryLower)) {
          this.streetSuffixes.forEach(suffix => {
            suggestions.push({
              address: `${streetName} ${suffix}, ${city}, ${state}`,
              type: 'street'
            });
          });
        }
      });
    }

    // Generate intersections
    if (queryLower.includes('and') || queryLower.includes('&')) {
      const parts = query.split(/\s+(?:and|&)\s+/i);
      if (parts.length === 2) {
        const [street1, street2] = parts;
        suggestions.push({
          address: `${street1.trim()} and ${street2.trim()}, ${city}, ${state}`,
          type: 'intersection'
        });
      }
    }

    // Generate business/landmark suggestions
    this.commonPlaces.forEach(place => {
      if (place.toLowerCase().includes(queryLower)) {
        suggestions.push({
          address: `${place}, ${city}, ${state}`,
          type: place.includes('Station') || place.includes('Hospital') || place.includes('Hall') ? 'landmark' : 'business'
        });
      }
    });

    // Generate numbered locations
    if (this.isNumericStart(query)) {
      const number = query.match(/^\d+/)?.[0] || '';
      this.commonPlaces.forEach(place => {
        suggestions.push({
          address: `${number} ${place}, ${city}, ${state}`,
          type: 'business'
        });
      });
    }

    // Sort by relevance and return top 8
    return suggestions
      .slice(0, 8)
      .sort((a, b) => {
        const aScore = this.getRelevanceScore(a.address, query);
        const bScore = this.getRelevanceScore(b.address, query);
        return bScore - aScore;
      });
  }

  private isNumericStart(query: string): boolean {
    return /^\d/.test(query);
  }

  private getRelevanceScore(address: string, query: string): number {
    const addressLower = address.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (addressLower.startsWith(queryLower)) return 3;
    if (addressLower.includes(queryLower)) return 2;
    
    // Check for partial word matches
    const queryWords = queryLower.split(' ');
    let score = 0;
    queryWords.forEach(word => {
      if (addressLower.includes(word)) score += 1;
    });
    
    return score;
  }
}