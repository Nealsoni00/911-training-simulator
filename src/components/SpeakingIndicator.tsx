import React, { useEffect, useState } from 'react';
import './SpeakingIndicator.css';

interface SpeakingIndicatorProps {
  isCallerSpeaking: boolean;
  isDispatcherSpeaking: boolean;
  microphoneLevel?: number;
}

export const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({
  isCallerSpeaking,
  isDispatcherSpeaking,
  microphoneLevel = 0
}) => {
  const [animatedLevel, setAnimatedLevel] = useState(0);

  useEffect(() => {
    // Show microphone level whenever there's audio input (above a threshold)
    if (microphoneLevel > 5) {
      setAnimatedLevel(microphoneLevel);
    } else {
      setAnimatedLevel(0);
    }
  }, [microphoneLevel]);

  return (
    <div className="speaking-indicators">
      <div className={`speaker-indicator ${isCallerSpeaking ? 'active' : ''}`}>
        <div className="speaker-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <span className="speaker-label">Caller</span>
        <div className="sound-bars">
          <div className={`sound-bar ${isCallerSpeaking ? 'active' : ''}`} style={{ animationDelay: '0ms' }}></div>
          <div className={`sound-bar ${isCallerSpeaking ? 'active' : ''}`} style={{ animationDelay: '150ms' }}></div>
          <div className={`sound-bar ${isCallerSpeaking ? 'active' : ''}`} style={{ animationDelay: '300ms' }}></div>
          <div className={`sound-bar ${isCallerSpeaking ? 'active' : ''}`} style={{ animationDelay: '450ms' }}></div>
        </div>
      </div>

      <div className={`speaker-indicator dispatcher ${animatedLevel > 5 ? 'active' : ''}`}>
        <div className="speaker-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span className="speaker-label">Dispatcher</span>
        <div className="sound-bars">
          <div 
            className="sound-bar dynamic" 
            style={{ height: `${Math.max(10, animatedLevel * 0.8)}%` }}
          ></div>
          <div 
            className="sound-bar dynamic" 
            style={{ height: `${Math.max(10, animatedLevel)}%` }}
          ></div>
          <div 
            className="sound-bar dynamic" 
            style={{ height: `${Math.max(10, animatedLevel * 0.9)}%` }}
          ></div>
          <div 
            className="sound-bar dynamic" 
            style={{ height: `${Math.max(10, animatedLevel * 0.7)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};