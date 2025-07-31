import React, { useState } from 'react';
import { SimulationPreset } from '../types';
import './SimulationSelector.css';

interface SimulationSelectorProps {
  presets: SimulationPreset[];
  onStartSimulation: (preset: SimulationPreset) => void;
  onCreateNew: () => void;
}

export const SimulationSelector: React.FC<SimulationSelectorProps> = ({
  presets,
  onStartSimulation,
  onCreateNew
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePresetClick = (preset: SimulationPreset) => {
    setSelectedPreset(preset);
    setShowPreview(true);
  };

  const handleStartSimulation = () => {
    if (selectedPreset) {
      onStartSimulation(selectedPreset);
    }
  };

  const getCooperationLabel = (level: number) => {
    if (level <= 30) return { label: 'Low', color: '#dc3545', description: 'Panicked & Difficult' };
    if (level <= 70) return { label: 'Medium', color: '#ffc107', description: 'Stressed but Helpful' };
    return { label: 'High', color: '#28a745', description: 'Calm & Cooperative' };
  };

  const getBackgroundLabel = (noise: string) => {
    const labels = {
      'none': 'Silent',
      'traffic': 'Traffic',
      'crowd': 'Crowd',
      'home': 'Home',
      'outdoor': 'Outdoor'
    };
    return labels[noise as keyof typeof labels] || 'Unknown';
  };

  return (
    <div className="simulation-selector">
      <div className="selector-header">
        <h1>911 Training Simulator</h1>
        <p>Select a simulation scenario to begin training</p>
      </div>

      <div className="selector-content">
        {presets.length === 0 ? (
          <div className="no-simulations">
            <div className="no-sim-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
            </div>
            <h2>No Simulations Available</h2>
            <p>Create your first simulation scenario to get started with training.</p>
            <button className="create-first-button" onClick={onCreateNew}>
              Create Your First Simulation
            </button>
          </div>
        ) : (
          <>
            <div className="simulations-grid">
              {presets.map(preset => {
                const cooperation = getCooperationLabel(preset.config.cooperationLevel);
                return (
                  <div
                    key={preset.id}
                    className={`simulation-card ${selectedPreset?.id === preset.id ? 'selected' : ''}`}
                    onClick={() => handlePresetClick(preset)}
                  >
                    <div className="card-header">
                      <h3>{preset.name}</h3>
                      <div className="card-badges">
                        <span 
                          className="cooperation-badge"
                          style={{ backgroundColor: cooperation.color }}
                        >
                          {cooperation.label}
                        </span>
                        <span className="background-badge">
                          {getBackgroundLabel(preset.config.backgroundNoise)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-content">
                      <p className="scenario-preview">
                        {preset.transcript.length > 120 
                          ? `${preset.transcript.substring(0, 120)}...`
                          : preset.transcript
                        }
                      </p>
                      
                      <div className="card-stats">
                        <div className="stat">
                          <span className="stat-label">Cooperation</span>
                          <span className="stat-value">{preset.config.cooperationLevel}%</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Volume</span>
                          <span className="stat-value">{preset.config.volumeLevel}%</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Location</span>
                          <span className="stat-value">{preset.config.city}, {preset.config.state}</span>
                        </div>
                      </div>
                      
                      {preset.callerInstructions && (
                        <div className="special-instructions">
                          <span className="instructions-label">Special Instructions:</span>
                          <span className="instructions-text">
                            {preset.callerInstructions.length > 80
                              ? `${preset.callerInstructions.substring(0, 80)}...`
                              : preset.callerInstructions
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="card-footer">
                      <span className="last-updated">
                        Updated {new Date(preset.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="selector-actions">
              <button className="create-new-button" onClick={onCreateNew}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Create New Simulation
              </button>
              
              {selectedPreset && (
                <button className="start-simulation-button" onClick={handleStartSimulation}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5V19L19 12L8 5Z"/>
                  </svg>
                  Start Training Session
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedPreset && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPreset.name}</h2>
              <button className="close-button" onClick={() => setShowPreview(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-content">
              <div className="preview-section">
                <h3>Emergency Scenario</h3>
                <p className="scenario-text">{selectedPreset.transcript}</p>
              </div>
              
              {selectedPreset.callerInstructions && (
                <div className="preview-section">
                  <h3>Caller Instructions</h3>
                  <p className="instructions-text">{selectedPreset.callerInstructions}</p>
                </div>
              )}
              
              <div className="preview-section">
                <h3>Simulation Settings</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <span className="setting-label">Cooperation Level</span>
                    <span className="setting-value">
                      {selectedPreset.config.cooperationLevel}% 
                      ({getCooperationLabel(selectedPreset.config.cooperationLevel).description})
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Background Audio</span>
                    <span className="setting-value">
                      {getBackgroundLabel(selectedPreset.config.backgroundNoise)}
                      {selectedPreset.config.backgroundNoise !== 'none' && 
                        ` (${selectedPreset.config.backgroundNoiseLevel}%)`
                      }
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Caller Volume</span>
                    <span className="setting-value">{selectedPreset.config.volumeLevel}%</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Location</span>
                    <span className="setting-value">{selectedPreset.config.city}, {selectedPreset.config.state}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowPreview(false)}>
                Cancel
              </button>
              <button className="start-button" onClick={handleStartSimulation}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5V19L19 12L8 5Z"/>
                </svg>
                Start This Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};