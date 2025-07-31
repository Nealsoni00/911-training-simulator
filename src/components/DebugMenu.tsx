import React, { useState } from 'react';
import { LiveKitSetup } from './LiveKitSetup';
import { LiveKitStatus } from './LiveKitStatus';
import { RecognitionDebug } from './RecognitionDebug';
import './DebugMenu.css';

interface DebugMenuProps {
  isRecording: boolean;
  isRunning: boolean;
  isPaused: boolean;
  lastTranscript?: string;
  microphoneLevel?: number;
  liveKitConnected: boolean;
  participantCount: number;
  deepgramStatus?: string;
}

export const DebugMenu: React.FC<DebugMenuProps> = ({
  isRecording,
  isRunning,
  isPaused,
  lastTranscript,
  microphoneLevel,
  liveKitConnected,
  participantCount,
  deepgramStatus
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) {
    return (
      <div className="floating-debug-toggle">
        <button 
          className="debug-floating-button"
          onClick={() => setIsOpen(true)}
          title="Open Debug Console"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.7 19L13.6 9.9C14.5 7.6 14 4.9 12.1 3C10.1 1 7.1 0.6 4.7 1.7L9 6L6 9L1.6 4.7C0.4 7.1 0.9 10.1 2.9 12.1C4.8 14 7.5 14.5 9.8 13.6L18.9 22.7C19.3 23.1 19.9 23.1 20.3 22.7L22.6 20.4C23.1 20 23.1 19.3 22.7 19Z"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="debug-menu-overlay">
      <div className="debug-menu">
        <div className="debug-menu-header">
          <h3>🛠️ Debug Menu</h3>
          <p className="debug-subtitle">Developer tools and technical settings</p>
          <button 
            className="debug-close-button"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="debug-menu-content">
          <div className="debug-section">
            <h4>🎤 Speech Recognition Debug</h4>
            <RecognitionDebug
              isRecording={isRecording}
              isRunning={isRunning}
              isPaused={isPaused}
              lastTranscript={lastTranscript}
              microphoneLevel={microphoneLevel}
            />
          </div>

          <div className="debug-section">
            <h4>🔊 LiveKit Audio System</h4>
            <LiveKitSetup />
            <LiveKitStatus
              isConnected={liveKitConnected}
              participantCount={participantCount}
            />
          </div>

          <div className="debug-section">
            <h4>🎤 Deepgram Transcription</h4>
            <div className="debug-info">
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">{deepgramStatus || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">API Key:</span>
                <span className="info-value">
                  {process.env.REACT_APP_DEEPGRAM_API_KEY ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          <div className="debug-section">
            <h4>📊 System Information</h4>
            <div className="debug-info">
              <div className="info-item">
                <span className="info-label">Browser:</span>
                <span className="info-value">{navigator.userAgent.split(' ')[0]}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Platform:</span>
                <span className="info-value">{navigator.platform}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Audio Context:</span>
                <span className="info-value">
                  {typeof AudioContext !== 'undefined' ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Speech Recognition:</span>
                <span className="info-value">
                  {typeof (window as any).webkitSpeechRecognition !== 'undefined' ? 'Supported' : 'Not Supported'}
                </span>
              </div>
            </div>
          </div>

          <div className="debug-section">
            <h4>⚙️ Advanced Actions</h4>
            <div className="debug-actions">
              <button 
                className="debug-action-button"
                onClick={() => {
                  console.clear();
                  console.log('🧹 Console cleared');
                }}
              >
                🧹 Clear Console
              </button>
              
              <button 
                className="debug-action-button"
                onClick={() => {
                  const info = {
                    timestamp: new Date().toISOString(),
                    isRecording,
                    isRunning,
                    isPaused,
                    liveKitConnected,
                    participantCount,
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                  };
                  console.log('📋 Debug Info:', info);
                  navigator.clipboard?.writeText(JSON.stringify(info, null, 2));
                }}
              >
                📋 Copy Debug Info
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};