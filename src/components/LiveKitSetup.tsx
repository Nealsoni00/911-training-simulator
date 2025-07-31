import React, { useState } from 'react';
import './LiveKitSetup.css';

export const LiveKitSetup: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);

  const currentConfig = {
    wsUrl: process.env.REACT_APP_LIVEKIT_WS_URL,
    token: process.env.REACT_APP_LIVEKIT_TOKEN
  };

  if (!showSetup) {
    return (
      <div className="livekit-setup-prompt">
        <button 
          className="setup-button"
          onClick={() => setShowSetup(true)}
        >
          🔧 Setup LiveKit for HD Audio
        </button>
      </div>
    );
  }

  return (
    <div className="livekit-setup">
      <div className="setup-header">
        <h3>LiveKit Setup for High-Quality Audio</h3>
        <button 
          className="close-button"
          onClick={() => setShowSetup(false)}
        >
          ×
        </button>
      </div>

      <div className="setup-content">
        <div className="current-status">
          <h4>Current Configuration:</h4>
          <div className={`config-item ${currentConfig.wsUrl ? 'configured' : 'missing'}`}>
            <span className="config-label">WebSocket URL:</span>
            <span className="config-value">
              {currentConfig.wsUrl || 'Not configured'}
            </span>
          </div>
          <div className={`config-item ${currentConfig.token ? 'configured' : 'missing'}`}>
            <span className="config-label">Access Token:</span>
            <span className="config-value">
              {currentConfig.token ? 'Configured ✓' : 'Not configured'}
            </span>
          </div>
        </div>

        <div className="setup-steps">
          <h4>Setup Steps:</h4>
          <ol>
            <li>
              <strong>Create LiveKit Cloud Account:</strong>
              <br />
              <a href="https://cloud.livekit.io/" target="_blank" rel="noopener noreferrer">
                Sign up at cloud.livekit.io
              </a>
            </li>
            <li>
              <strong>Create a Project:</strong>
              <br />
              Create a new project and note your project URL (e.g., wss://your-project.livekit.cloud)
            </li>
            <li>
              <strong>Generate Access Token:</strong>
              <br />
              <a href="https://livekit.io/token-generator" target="_blank" rel="noopener noreferrer">
                Use the token generator
              </a>
              <br />
              <small>Required permissions: Room Join, Publish Audio, Subscribe Audio</small>
            </li>
            <li>
              <strong>Create .env file:</strong>
              <div className="code-block">
                <code>
                  REACT_APP_OPENAI_API_KEY=your-openai-key<br />
                  REACT_APP_LIVEKIT_WS_URL=wss://your-project.livekit.cloud<br />
                  REACT_APP_LIVEKIT_TOKEN=your-generated-token
                </code>
              </div>
            </li>
            <li>
              <strong>Restart the application</strong> for changes to take effect
            </li>
          </ol>
        </div>

        <div className="benefits">
          <h4>Benefits of LiveKit:</h4>
          <ul>
            <li>🎵 48kHz high-quality audio (vs 44.1kHz web audio)</li>
            <li>🎯 Professional echo cancellation</li>
            <li>🔇 Built-in noise suppression</li>
            <li>📡 Real-time streaming with low latency</li>
            <li>🚫 No audio quality degradation over time</li>
          </ul>
        </div>

        <div className="note">
          <strong>Note:</strong> LiveKit is optional. The simulator will work with standard web audio if not configured.
        </div>
      </div>
    </div>
  );
};