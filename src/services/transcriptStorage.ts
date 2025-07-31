export interface SavedTranscript {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  lastUsedAt: Date;
}

export class TranscriptStorageService {
  private readonly STORAGE_KEY = '911_training_transcripts';

  getAllTranscripts(): SavedTranscript[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const transcripts = JSON.parse(stored);
      // Convert date strings back to Date objects
      return transcripts.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastUsedAt: new Date(t.lastUsedAt)
      }));
    } catch {
      return [];
    }
  }

  saveTranscript(name: string, content: string): SavedTranscript {
    const transcripts = this.getAllTranscripts();
    
    // Check if transcript with this name already exists
    const existingIndex = transcripts.findIndex(t => t.name === name);
    
    const newTranscript: SavedTranscript = {
      id: existingIndex >= 0 ? transcripts[existingIndex].id : Date.now().toString(),
      name,
      content,
      createdAt: existingIndex >= 0 ? transcripts[existingIndex].createdAt : new Date(),
      lastUsedAt: new Date()
    };

    if (existingIndex >= 0) {
      transcripts[existingIndex] = newTranscript;
    } else {
      transcripts.push(newTranscript);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transcripts));
    return newTranscript;
  }

  deleteTranscript(id: string): void {
    const transcripts = this.getAllTranscripts();
    const filtered = transcripts.filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  updateLastUsed(id: string): void {
    const transcripts = this.getAllTranscripts();
    const transcript = transcripts.find(t => t.id === id);
    if (transcript) {
      transcript.lastUsedAt = new Date();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transcripts));
    }
  }

  getTranscriptByName(name: string): SavedTranscript | null {
    const transcripts = this.getAllTranscripts();
    return transcripts.find(t => t.name === name) || null;
  }
}