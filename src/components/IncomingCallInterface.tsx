import React, { useState, useEffect, useRef } from 'react';
import './IncomingCallInterface.css';

interface IncomingCallInterfaceProps {
  onAnswer: () => void;
  onDecline: () => void;
  callerLocation?: string;
}

export const IncomingCallInterface: React.FC<IncomingCallInterfaceProps> = ({
  onAnswer,
  onDecline,
  callerLocation = "Unknown Location"
}) => {
  const [isRinging, setIsRinging] = useState(true);
  const [ringCount, setRingCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Start ringing animation and sound
    const ringInterval = setInterval(() => {
      setRingCount(prev => prev + 1);
    }, 2000); // Ring every 2 seconds

    // Create audio element for ring tone (optional - can use CSS animations only)
    const playRingTone = () => {
      try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Ring frequency
        gainNode.gain.value = 0.1; // Volume
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 300); // 300ms beep
      } catch (error) {
        console.log('Audio not available:', error);
      }
    };

    // Play ring tone on each ring
    const soundInterval = setInterval(playRingTone, 2000);

    return () => {
      clearInterval(ringInterval);
      clearInterval(soundInterval);
    };
  }, []);

  const handleAnswer = () => {
    console.log('Answer button clicked');
    setIsRinging(false);
    setTimeout(() => {
      onAnswer();
    }, 500); // Brief delay for answer animation
  };

  const handleDecline = () => {
    console.log('Decline button clicked');
    setIsRinging(false);
    setTimeout(() => {
      onDecline();
    }, 300);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="incoming-call-overlay">
      <div className={`incoming-call-interface ${isRinging ? 'ringing' : 'answered'}`}>
        {/* Call Status Header */}
        <div className="call-header">
          <div className="call-status">
            <span className="status-indicator">
              {isRinging ? 'INCOMING CALL' : 'CONNECTING...'}
            </span>
            <span className="call-time">{formatTime()}</span>
          </div>
        </div>

        {/* Caller Information */}
        <div className="caller-info">
          <div className={`caller-avatar ${isRinging ? 'pulsing' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
            </svg>
          </div>
          
          <div className="caller-details">
            <h2 className="caller-name">Emergency Call</h2>
            <p className="caller-location">{callerLocation}</p>
            <div className="call-type">
              <span className="priority-badge">911</span>
              <span className="emergency-text">Emergency Line</span>
            </div>
          </div>
        </div>

        {/* Ring Counter */}
        <div className="ring-info">
          <div className="ring-counter">Ring {ringCount}</div>
          <div className="wait-time">
            {Math.floor(ringCount * 2 / 60)}:{String((ringCount * 2) % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Answer Controls */}
        <div className="call-controls">
          <div className="control-hint">
            <p>Answer the emergency call to begin training simulation</p>
          </div>
          
          <div className="call-buttons">
            <button 
              className="decline-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Decline clicked!');
                handleDecline();
              }}
              title="Decline Call"
              style={{ zIndex: 100 }}
            >
              <div className="button-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                </svg>
              </div>
            </button>
            
            <button 
              className="answer-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Answer clicked!');
                handleAnswer();
              }}
              title="Answer Call"
              style={{ zIndex: 100 }}
            >
              <div className="button-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                </svg>
              </div>
            </button>
          </div>
          
          <div className="button-labels">
            <span className="decline-label">Decline</span>
            <span className="answer-label">
              {isRinging ? 'Answer' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Visual Ring Effects */}
        {isRinging && (
          <>
            <div className="ring-pulse ring-1"></div>
            <div className="ring-pulse ring-2"></div>
            <div className="ring-pulse ring-3"></div>
          </>
        )}
      </div>
    </div>
  );
};