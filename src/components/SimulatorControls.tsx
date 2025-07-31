import React from 'react';
import { SimulatorConfig } from '../types';
import './SimulatorControls.css';

interface SimulatorControlsProps {
  config: SimulatorConfig;
  onConfigChange: (config: SimulatorConfig) => void;
  onStart: () => void;
  onEnd: () => void;
  onPause: () => void;
  onResume: () => void;
  isRunning: boolean;
  isPaused: boolean;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  config,
  onConfigChange,
  onStart,
  onEnd,
  onPause,
  onResume,
  isRunning,
  isPaused
}) => {
  const handleSliderChange = (field: keyof SimulatorConfig, value: number | string) => {
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <div className="simulator-controls">
      <h3>Simulator Settings</h3>
      
      <div className="control-group">
        <label>
          Caller Cooperation Level: {config.cooperationLevel}%
          <input
            type="range"
            min="0"
            max="100"
            value={config.cooperationLevel}
            onChange={(e) => handleSliderChange('cooperationLevel', parseInt(e.target.value))}
          />
          <span className="range-labels">
            <span>Uncooperative</span>
            <span>Cooperative</span>
          </span>
        </label>
      </div>

      <div className="control-group">
        <label>
          Caller Volume: {config.volumeLevel}%
          <input
            type="range"
            min="0"
            max="100"
            value={config.volumeLevel}
            onChange={(e) => handleSliderChange('volumeLevel', parseInt(e.target.value))}
          />
          <span className="range-labels">
            <span>Soft</span>
            <span>Loud</span>
          </span>
        </label>
      </div>

      <div className="control-group">
        <label>
          Background Noise Type:
          <select
            value={config.backgroundNoise}
            onChange={(e) => handleSliderChange('backgroundNoise', e.target.value)}
          >
            <option value="none">None</option>
            <option value="traffic">Traffic</option>
            <option value="crowd">Crowd</option>
            <option value="home">Home</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </label>
      </div>

      {config.backgroundNoise !== 'none' && (
        <div className="control-group">
          <label>
            Background Noise Level: {config.backgroundNoiseLevel}%
            <input
              type="range"
              min="0"
              max="100"
              value={config.backgroundNoiseLevel}
              onChange={(e) => handleSliderChange('backgroundNoiseLevel', parseInt(e.target.value))}
            />
          </label>
        </div>
      )}

      <div className="control-group">
        <label>
          City:
          <input
            type="text"
            value={config.city}
            onChange={(e) => handleSliderChange('city', e.target.value)}
            placeholder="Enter city name"
          />
        </label>
      </div>

      <div className="control-group">
        <label>
          State:
          <input
            type="text"
            value={config.state}
            onChange={(e) => handleSliderChange('state', e.target.value)}
            placeholder="Enter state (e.g., OH, CA)"
          />
        </label>
      </div>

      <div className="button-group">
        {!isRunning ? (
          <button
            className="control-button start"
            onClick={onStart}
          >
            Start Exercise
          </button>
        ) : (
          <>
            <button
              className={`control-button ${isPaused ? 'resume' : 'pause'}`}
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? 'Resume Exercise' : 'Pause Exercise'}
            </button>
            <button
              className="control-button end"
              onClick={onEnd}
            >
              End Exercise
            </button>
          </>
        )}
      </div>
    </div>
  );
};