import React, { useState } from 'react';
import { ConversationView } from './ConversationView';
import { CallStatus } from './CallStatus';
import { SpeakingIndicator } from './SpeakingIndicator';
import { CADInterface } from './CADInterface';
import { CompactAudioSelector } from './CompactAudioSelector';
import { ResizableSplitter } from './ResizableSplitter';
import { SimulationPreset, ConversationMessage, CADEntry } from '../types';
import './SimulationInterface.css';

interface SimulationInterfaceProps {
  preset: SimulationPreset;
  isRunning: boolean;
  isPaused: boolean;
  isRecording: boolean;
  isCallerSpeaking: boolean;
  microphoneLevel: number;
  messages: ConversationMessage[];
  pendingCallerMessage: string;
  partialTranscript: string;
  waitingForDispatcher: boolean;
  isSystemWarming: boolean;
  onEnd: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart?: () => void;
  onEdit?: () => void;
  onCADUpdate: (entry: CADEntry) => void;
  onMicrophoneChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
}

export const SimulationInterface: React.FC<SimulationInterfaceProps> = ({
  preset,
  isRunning,
  isPaused,
  isRecording,
  isCallerSpeaking,
  microphoneLevel,
  messages,
  pendingCallerMessage,
  partialTranscript,
  waitingForDispatcher,
  isSystemWarming,
  onEnd,
  onPause,
  onResume,
  onRestart,
  onEdit,
  onCADUpdate,
  onMicrophoneChange,
  onSpeakerChange
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [startTime] = useState(new Date());

  const getCallDuration = () => {
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCooperationLabel = (level: number) => {
    if (level <= 30) return { label: 'Low', color: '#dc3545' };
    if (level <= 70) return { label: 'Medium', color: '#ffc107' };
    return { label: 'High', color: '#28a745' };
  };

  const cooperation = getCooperationLabel(preset.config.cooperationLevel);

  return (
    <div className="simulation-interface">
      {/* Main Header */}
      <div className="sim-header">
        <div className="call-info">
          <div className="call-indicator">
            <div className="status-dot active"></div>
            <span className="status-text">ACTIVE CALL</span>
          </div>
          <div className="call-duration">{getCallDuration()}</div>
        </div>
        
        <div className="scenario-title">
          <h2>{preset.name}</h2>
        </div>
        
        <div className="header-controls">
          <CompactAudioSelector
            onMicrophoneChange={onMicrophoneChange}
            onSpeakerChange={onSpeakerChange}
          />
          
          {onRestart && (
            <button
              className="restart-simulation-button"
              onClick={onRestart}
              title="Restart Simulation"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
          )}
          
          {onEdit && (
            <button
              className="edit-preset-button"
              onClick={onEdit}
              title="Edit Preset"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/>
              </svg>
            </button>
          )}
          
          <button
            className="config-toggle"
            onClick={() => setShowConfig(!showConfig)}
            title={showConfig ? 'Hide Details' : 'Show Scenario Details'}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8C13.1 8 14 8.9 14 10S13.1 12 12 12 10 11.1 10 10 10.9 8 12 8ZM12 14C13.1 14 14 14.9 14 16S13.1 18 12 18 10 17.1 10 16 10.9 14 12 14ZM12 2C13.1 2 14 2.9 14 4S13.1 6 12 6 10 5.1 10 4 10.9 2 12 2Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Configuration Panel (Expandable) */}
      {showConfig && (
        <div className="config-panel">
          <div className="config-content">
            <div className="config-section">
              <h4>Scenario</h4>
              <p className="scenario-text">{preset.transcript}</p>
              {preset.callerInstructions && (
                <>
                  <h4>Caller Instructions</h4>
                  <p className="instructions-text">{preset.callerInstructions}</p>
                </>
              )}
            </div>
            
            <div className="config-stats">
              <div className="stat-item">
                <span className="stat-label">Cooperation</span>
                <span className="stat-value" style={{ color: cooperation.color }}>
                  {preset.config.cooperationLevel}% ({cooperation.label})
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Background</span>
                <span className="stat-value">
                  {preset.config.backgroundNoise === 'none' 
                    ? 'Silent' 
                    : `${preset.config.backgroundNoise} (${preset.config.backgroundNoiseLevel}%)`
                  }
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Location</span>
                <span className="stat-value">{preset.config.city}, {preset.config.state}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Volume</span>
                <span className="stat-value">{preset.config.volumeLevel}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Simulation Area */}
      <div className="sim-content">
        <ResizableSplitter 
          defaultSplit={65}
          minSize={250}
          storageKey="911-sim-splitter"
        >
          <div className="left-panel">
            {/* Call Status */}
            <CallStatus
              isActive={isRunning}
              isPaused={isPaused}
              onHangup={onEnd}
              onPause={onPause}
              onResume={onResume}
            />

            {/* Speaking Indicator */}
            {isRunning && !isPaused && (
              <SpeakingIndicator
                isCallerSpeaking={isCallerSpeaking}
                isDispatcherSpeaking={isRecording}
                microphoneLevel={microphoneLevel}
              />
            )}

            {/* Conversation */}
            <ConversationView 
              messages={messages}
              isRecording={isRecording}
              pendingCallerMessage={pendingCallerMessage}
              partialTranscript={partialTranscript}
            />

            {/* Status Messages */}
            {isSystemWarming && (
              <div className="status-message warming">
                <div className="status-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2V4.26C7.83 4.89 4.89 7.83 4.26 12H2C2.68 6.5 6.5 2.68 12 2M20 12H17.74C17.11 16.17 14.17 19.11 10 19.74V22C15.5 21.32 19.32 17.5 20 12M12 6V12L15.5 15.5L14.08 16.92L10 12.84V6H12Z"/>
                  </svg>
                </div>
                <div className="status-text">
                  <span className="status-title">System initializing...</span>
                  <span className="status-subtitle">Please wait a moment before speaking</span>
                </div>
              </div>
            )}
            
            {waitingForDispatcher && !isPaused && !isSystemWarming && (
              <div className="status-message waiting">
                <div className="status-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12S10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10M12 19V22H16V24H8V22H12V19Z"/>
                  </svg>
                </div>
                <div className="status-text">
                  <span className="status-title">Waiting for dispatcher...</span>
                  <span className="status-subtitle">Answer the call to begin</span>
                </div>
              </div>
            )}

            {isPaused && (
              <div className="status-message paused">
                <div className="status-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 19H18V5H14M6 19H10V5H6V19Z"/>
                  </svg>
                </div>
                <div className="status-text">
                  <span className="status-title">Exercise Paused</span>
                  <span className="status-subtitle">Click Resume to continue</span>
                </div>
              </div>
            )}
          </div>

          {/* CAD Interface */}
          <CADInterface 
            onCADUpdate={onCADUpdate}
            city={preset.config.city}
            state={preset.config.state}
          />
        </ResizableSplitter>
      </div>
    </div>
  );
};