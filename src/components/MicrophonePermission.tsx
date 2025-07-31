import React, { useState } from 'react';
import './MicrophonePermission.css';

interface MicrophonePermissionProps {
  onPermissionGranted: () => void;
}

export const MicrophonePermission: React.FC<MicrophonePermissionProps> = ({ onPermissionGranted }) => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>('');

  const checkMicrophonePermission = async () => {
    setChecking(true);
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
      
      // Permission granted
      onPermissionGranted();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone access to use the simulator.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Error accessing microphone. Please check your browser settings.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="microphone-permission-overlay">
      <div className="permission-container">
        <div className="microphone-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        
        <h2>Microphone Permission Required</h2>
        <p>The 911 Training Simulator needs access to your microphone to transcribe your responses as the dispatcher.</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <button 
          className="permission-button"
          onClick={checkMicrophonePermission}
          disabled={checking}
        >
          {checking ? 'Checking...' : 'Allow Microphone Access'}
        </button>
        
        <div className="permission-note">
          <p>Note: Make sure you're using Google Chrome for the best experience.</p>
        </div>
      </div>
    </div>
  );
};