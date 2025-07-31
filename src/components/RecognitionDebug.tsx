import React, { useState, useEffect } from 'react';
import './RecognitionDebug.css';

interface RecognitionDebugProps {
  isRecording: boolean;
  isRunning: boolean;
  isPaused: boolean;
  lastTranscript?: string;
  microphoneLevel?: number;
}

export const RecognitionDebug: React.FC<RecognitionDebugProps> = ({
  isRecording,
  isRunning,
  isPaused,
  lastTranscript,
  microphoneLevel = 0
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const status = `${timestamp} - Recording: ${isRecording}, Running: ${isRunning}, Paused: ${isPaused}`;
    
    setLogs(prev => {
      const newLogs = [...prev, status];
      return newLogs.slice(-10); // Keep only last 10 logs
    });
  }, [isRecording, isRunning, isPaused]);

  useEffect(() => {
    if (lastTranscript) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const transcriptLog = `${timestamp} - Transcript: "${lastTranscript}"`;
      
      setLogs(prev => {
        const newLogs = [...prev, transcriptLog];
        return newLogs.slice(-10);
      });
    }
  }, [lastTranscript]);

  if (!isVisible) {
    return (
      <button 
        className="debug-toggle"
        onClick={() => setIsVisible(true)}
      >
        Show Debug
      </button>
    );
  }

  return (
    <div className="recognition-debug">
      <div className="debug-header">
        <h4>Recognition Debug</h4>
        <button 
          className="debug-close"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>
      
      <div className="debug-status">
        <div className={`status-item ${isRecording ? 'active' : ''}`}>
          Recording: {isRecording ? 'ON' : 'OFF'}
        </div>
        <div className={`status-item ${isRunning ? 'active' : ''}`}>
          Running: {isRunning ? 'ON' : 'OFF'}
        </div>
        <div className={`status-item ${isPaused ? 'paused' : ''}`}>
          Paused: {isPaused ? 'YES' : 'NO'}
        </div>
      </div>

      <div className="debug-logs">
        <h5>Recent Activity:</h5>
        {logs.map((log, index) => (
          <div key={index} className="log-entry">
            {log}
          </div>
        ))}
      </div>

      <div className="debug-status">
        <div className="status-item">
          Microphone Level: {microphoneLevel?.toFixed(1) || '0.0'}
        </div>
      </div>

      <div className="debug-test">
        <p>🎤 <strong>Test:</strong> If recording is ON, speak now. You should see your words appear in the conversation.</p>
        <p>🔊 <strong>Mic Level:</strong> Should show values above 5 when speaking (current: {microphoneLevel?.toFixed(1) || '0.0'})</p>
      </div>
    </div>
  );
};