import React from 'react';
import './LiveKitStatus.css';

interface LiveKitStatusProps {
  isConnected: boolean;
  participantCount: number;
  connectionQuality?: 'excellent' | 'good' | 'poor';
}

export const LiveKitStatus: React.FC<LiveKitStatusProps> = ({
  isConnected,
  participantCount,
  connectionQuality = 'good'
}) => {
  return (
    <div className={`livekit-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-header">
        <span className="status-icon">
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span className="status-text">
          {isConnected ? 'LiveKit Connected' : 'LiveKit Disconnected'}
        </span>
      </div>
      
      {isConnected && (
        <div className="status-details">
          <div className="detail-item">
            <span className="detail-label">Participants:</span>
            <span className="detail-value">{participantCount}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Quality:</span>
            <span className={`detail-value quality-${connectionQuality}`}>
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
            </span>
          </div>
        </div>
      )}
      
      {!isConnected && (
        <div className="status-message">
          Using fallback audio system
        </div>
      )}
    </div>
  );
};