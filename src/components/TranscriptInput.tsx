import React, { useState, useEffect } from 'react';
import { TranscriptStorageService, SavedTranscript } from '../services/transcriptStorage';
import './TranscriptInput.css';

interface TranscriptInputProps {
  onTranscriptSubmit: (transcript: string) => void;
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ onTranscriptSubmit }) => {
  const [transcript, setTranscript] = useState('');
  const [transcriptName, setTranscriptName] = useState('');
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>([]);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const storageService = new TranscriptStorageService();

  useEffect(() => {
    loadSavedTranscripts();
  }, []);

  const loadSavedTranscripts = () => {
    const transcripts = storageService.getAllTranscripts();
    setSavedTranscripts(transcripts.sort((a, b) => 
      b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    ));
  };

  const handleSubmit = () => {
    if (transcript.trim()) {
      if (selectedTranscriptId) {
        storageService.updateLastUsed(selectedTranscriptId);
      }
      onTranscriptSubmit(transcript);
    }
  };

  const handleSave = () => {
    if (transcript.trim() && transcriptName.trim()) {
      const saved = storageService.saveTranscript(transcriptName, transcript);
      setSelectedTranscriptId(saved.id);
      loadSavedTranscripts();
      setShowSaveDialog(false);
      setTranscriptName('');
    }
  };

  const handleLoadTranscript = (id: string) => {
    const saved = savedTranscripts.find(t => t.id === id);
    if (saved) {
      setTranscript(saved.content);
      setSelectedTranscriptId(id);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this transcript?')) {
      storageService.deleteTranscript(id);
      if (selectedTranscriptId === id) {
        setSelectedTranscriptId('');
        setTranscript('');
      }
      loadSavedTranscripts();
    }
  };

  return (
    <div className="transcript-input-container">
      <h2>911 Call Transcript</h2>
      
      {savedTranscripts.length > 0 && (
        <div className="saved-transcripts">
          <h3>Saved Transcripts</h3>
          <div className="transcript-list">
            {savedTranscripts.map(saved => (
              <div 
                key={saved.id}
                className={`saved-transcript-item ${selectedTranscriptId === saved.id ? 'selected' : ''}`}
                onClick={() => handleLoadTranscript(saved.id)}
              >
                <div className="transcript-info">
                  <div className="transcript-name">{saved.name}</div>
                  <div className="transcript-date">
                    Last used: {saved.lastUsedAt.toLocaleDateString()}
                  </div>
                </div>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDelete(saved.id, e)}
                  title="Delete transcript"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        className="transcript-textarea"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste the 911 call transcript here or select a saved transcript above..."
        rows={15}
      />
      
      <div className="button-group">
        <button 
          className="save-button"
          onClick={() => setShowSaveDialog(true)}
          disabled={!transcript.trim()}
        >
          Save Transcript
        </button>
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={!transcript.trim()}
        >
          Load Transcript
        </button>
      </div>

      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save Transcript</h3>
            <input
              type="text"
              placeholder="Enter a name for this transcript..."
              value={transcriptName}
              onChange={(e) => setTranscriptName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className="dialog-buttons">
              <button onClick={() => setShowSaveDialog(false)}>Cancel</button>
              <button 
                onClick={handleSave}
                disabled={!transcriptName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};