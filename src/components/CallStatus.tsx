import React, { useState, useEffect } from 'react';
import './CallStatus.css';

interface CallStatusProps {
  isActive: boolean;
  isPaused: boolean;
  onHangup: () => void;
  onPause: () => void;
  onResume: () => void;
}

export const CallStatus: React.FC<CallStatusProps> = ({
  isActive,
  isPaused,
  onHangup,
  onPause,
  onResume
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(Date.now());
      setCallDuration(0);
    } else if (!isActive) {
      setStartTime(null);
      setCallDuration(0);
    }
  }, [isActive, startTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime && !isPaused) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime, isPaused]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={`call-status ${isPaused ? 'paused' : 'active'}`}>
      <div className="call-info">
        <div className="call-indicator">
          <div className={`status-dot ${isPaused ? 'paused' : 'active'}`}></div>
          <span className="status-text">
            {isPaused ? 'CALL PAUSED' : 'CALL ACTIVE'}
          </span>
        </div>
        
        <div className="call-timer">
          <span className="timer-icon">⏱️</span>
          <span className="timer-text">{formatDuration(callDuration)}</span>
        </div>
      </div>

      <div className="call-controls">
        {isPaused ? (
          <button 
            className="control-button resume-button"
            onClick={onResume}
            title="Resume Call"
          >
            ▶️ Resume
          </button>
        ) : (
          <button 
            className="control-button pause-button"
            onClick={onPause}
            title="Pause Call"
          >
            ⏸️ Pause
          </button>
        )}
        
        <button 
          className="control-button hangup-button"
          onClick={onHangup}
          title="End Call"
        >
          📞 Hang Up
        </button>
      </div>
    </div>
  );
};