import React, { useState, useEffect } from 'react';
import { SimulationPreset } from '../types';
import './ConfigurationPage.css';

interface ConfigurationPageProps {
  onSavePreset: (preset: SimulationPreset) => void;
  onLoadPreset: (presetId: string) => void;
  existingPresets: SimulationPreset[];
  editingPreset?: SimulationPreset | null;
  onBack: () => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
  onSavePreset,
  onLoadPreset,
  existingPresets,
  editingPreset,
  onBack
}) => {
  const [presetName, setPresetName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [realTranscript, setRealTranscript] = useState('');
  const [callerInstructions, setCallerInstructions] = useState('');
  const [cooperationLevel, setCooperationLevel] = useState(70);
  const [backgroundNoise, setBackgroundNoise] = useState<'none' | 'traffic' | 'crowd' | 'home' | 'outdoor'>('none');
  const [backgroundNoiseLevel, setBackgroundNoiseLevel] = useState(30);
  const [volumeLevel, setVolumeLevel] = useState(80);
  const [city, setCity] = useState('Columbus');
  const [state, setState] = useState('OH');

  // US States list
  const usStates = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' }
  ];
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Load editing preset when component mounts or editingPreset changes
  useEffect(() => {
    if (editingPreset) {
      loadPresetForEditing(editingPreset);
    }
  }, [editingPreset]);

  const loadPresetForEditing = (preset: SimulationPreset) => {
    setPresetName(preset.name);
    setTranscript(preset.transcript);
    setRealTranscript(preset.realTranscript || '');
    setCallerInstructions(preset.callerInstructions);
    setCooperationLevel(preset.config.cooperationLevel);
    setBackgroundNoise(preset.config.backgroundNoise);
    setBackgroundNoiseLevel(preset.config.backgroundNoiseLevel);
    setVolumeLevel(preset.config.volumeLevel);
    setCity(preset.config.city);
    setState(preset.config.state);
    setEditingPresetId(preset.id);
  };

  const resetForm = () => {
    setPresetName('');
    setTranscript('');
    setRealTranscript('');
    setCallerInstructions('');
    setCooperationLevel(70);
    setBackgroundNoise('none');
    setBackgroundNoiseLevel(30);
    setVolumeLevel(80);
    setCity('Columbus');
    setState('OH');
    setEditingPresetId(null);
  };

  const handleSave = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    if (!transcript.trim()) {
      alert('Please enter a transcript');
      return;
    }

    const preset: SimulationPreset = {
      id: editingPresetId || Date.now().toString(),
      name: presetName.trim(),
      transcript: transcript.trim(),
      realTranscript: realTranscript.trim() || undefined,
      callerInstructions: callerInstructions.trim(),
      config: {
        cooperationLevel,
        backgroundNoise,
        backgroundNoiseLevel,
        volumeLevel,
        city,
        state
      },
      createdAt: editingPresetId ? 
        existingPresets.find(p => p.id === editingPresetId)?.createdAt || new Date() : 
        new Date(),
      updatedAt: new Date()
    };

    onSavePreset(preset);
    resetForm();
  };

  const handleDelete = (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = existingPresets.filter(p => p.id !== presetId);
      localStorage.setItem('911-sim-presets', JSON.stringify(updatedPresets));
      window.location.reload(); // Simple refresh to update the list
    }
  };

  const exampleTranscripts = [
    {
      title: "Home Invasion",
      content: "There's someone breaking into my house right now! I can hear them downstairs. I'm hiding in my bedroom with my kids. Please send help immediately!"
    },
    {
      title: "Car Accident",
      content: "I just witnessed a terrible car accident on Highway 71 near the Main Street exit. Two cars collided head-on. I can see people trapped inside. There's smoke coming from one of the vehicles."
    },
    {
      title: "Medical Emergency",
      content: "My husband is having chest pains and trouble breathing. He's 58 years old and has a history of heart problems. He's conscious but in severe pain."
    },
    {
      title: "Structure Fire",
      content: "My apartment building is on fire! I'm on the third floor and I can see flames coming from the second floor. The hallways are filling with smoke. There are families with children trapped up here!"
    }
  ];

  const cooperationDescriptions = {
    low: "Panicked, crying, difficult to understand. May hang up or become unresponsive.",
    medium: "Stressed and scared but trying to help. Provides information in fragments.",
    high: "Distressed but focused. Answers questions clearly and follows instructions."
  };

  const getCooperationDescription = () => {
    if (cooperationLevel <= 30) return cooperationDescriptions.low;
    if (cooperationLevel <= 70) return cooperationDescriptions.medium;
    return cooperationDescriptions.high;
  };

  return (
    <div className="configuration-page">
      <div className="config-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"/>
          </svg>
          Back
        </button>
        <h1>Simulation Configuration</h1>
        <div className="header-actions">
          {editingPresetId && (
            <button className="cancel-edit-button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="config-content">
        <div className="config-main">
          {/* Basic Information */}
          <div className="config-section">
            <h2>Basic Information</h2>
            <div className="form-group">
              <label htmlFor="presetName">Preset Name *</label>
              <input
                id="presetName"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Home Invasion - Panic Level"
                className="form-input"
              />
            </div>
          </div>

          {/* Emergency Transcript */}
          <div className="config-section">
            <h2>Emergency Scenario</h2>
            <div className="form-group">
              <label htmlFor="transcript">Emergency Transcript *</label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Describe the emergency situation that the caller is experiencing..."
                className="form-textarea large"
                rows={4}
              />
              <div className="example-transcripts">
                <h4>Example Scenarios:</h4>
                <div className="example-grid">
                  {exampleTranscripts.map((example, index) => (
                    <div key={index} className="example-card">
                      <h5>{example.title}</h5>
                      <p>{example.content}</p>
                      <button
                        className="use-example-button"
                        onClick={() => setTranscript(example.content)}
                      >
                        Use This Example
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="realTranscript">Real 911 Call Transcript (Optional)</label>
              <textarea
                id="realTranscript"
                value={realTranscript}
                onChange={(e) => setRealTranscript(e.target.value)}
                placeholder="Paste a real 911 call transcript here to guide the conversation flow. The AI will use this to make responses more realistic and follow actual emergency call patterns. Any addresses mentioned will be replaced with your CAD-configured addresses..."
                className="form-textarea large"
                rows={6}
              />
              <div className="field-help">
                <p><strong>How this works:</strong> When provided, this real transcript helps the AI caller follow realistic conversation patterns from actual emergency calls. Any specific addresses mentioned in the real transcript will be automatically replaced with the addresses you configure in the CAD system during the simulation.</p>
              </div>
            </div>
          </div>

          {/* Caller Instructions */}
          <div className="config-section">
            <h2>Caller Behavior Instructions</h2>
            <div className="form-group">
              <label htmlFor="callerInstructions">Custom Instructions (Optional)</label>
              <textarea
                id="callerInstructions"
                value={callerInstructions}
                onChange={(e) => setCallerInstructions(e.target.value)}
                placeholder="Additional instructions for how the caller should behave (e.g., 'The caller is elderly and hard of hearing', 'Caller speaks very quickly due to panic', 'Caller has a speech impediment')..."
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          {/* Simulation Settings */}
          <div className="config-section">
            <h2>Simulation Settings</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cooperationLevel">
                  Cooperation Level: {cooperationLevel}%
                </label>
                <input
                  id="cooperationLevel"
                  type="range"
                  min="0"
                  max="100"
                  value={cooperationLevel}
                  onChange={(e) => setCooperationLevel(Number(e.target.value))}
                  className="form-range"
                />
                <div className="cooperation-description">
                  {getCooperationDescription()}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="volumeLevel">
                  Caller Volume: {volumeLevel}%
                </label>
                <input
                  id="volumeLevel"
                  type="range"
                  min="10"
                  max="100"
                  value={volumeLevel}
                  onChange={(e) => setVolumeLevel(Number(e.target.value))}
                  className="form-range"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="backgroundNoise">Background Audio</label>
                <select
                  id="backgroundNoise"
                  value={backgroundNoise}
                  onChange={(e) => setBackgroundNoise(e.target.value as any)}
                  className="form-select"
                >
                  <option value="none">No Background Noise</option>
                  <option value="traffic">Traffic (Car accident, road emergency)</option>
                  <option value="crowd">Crowd (Public incident, gathering)</option>
                  <option value="home">Home (Domestic emergency)</option>
                  <option value="outdoor">Outdoor (Nature, construction site)</option>
                </select>
              </div>

              {backgroundNoise !== 'none' && (
                <div className="form-group">
                  <label htmlFor="backgroundNoiseLevel">
                    Background Volume: {backgroundNoiseLevel}%
                  </label>
                  <input
                    id="backgroundNoiseLevel"
                    type="range"
                    min="0"
                    max="100"
                    value={backgroundNoiseLevel}
                    onChange={(e) => setBackgroundNoiseLevel(Number(e.target.value))}
                    className="form-range"
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="form-select"
                >
                  {usStates.map(usState => (
                    <option key={usState.code} value={usState.code}>
                      {usState.name} ({usState.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="config-actions">
            <button className="save-preset-button" onClick={handleSave}>
              {editingPresetId ? 'Update Preset' : 'Save Preset'}
            </button>
          </div>
        </div>

        {/* Saved Presets Sidebar */}
        <div className="config-sidebar">
          <h3>Saved Presets</h3>
          {existingPresets.length === 0 ? (
            <div className="no-presets">
              <p>No presets saved yet.</p>
              <p>Create your first simulation preset using the form.</p>
            </div>
          ) : (
            <div className="presets-list">
              {existingPresets.map(preset => (
                <div key={preset.id} className="preset-card">
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    <div className="preset-details">
                      <span>Cooperation: {preset.config.cooperationLevel}%</span>
                      <span>Background: {preset.config.backgroundNoise}</span>
                    </div>
                    <div className="preset-date">
                      Updated: {new Date(preset.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="preset-actions">
                    <button
                      className="edit-preset-button"
                      onClick={() => loadPresetForEditing(preset)}
                      title="Edit Preset"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/>
                      </svg>
                    </button>
                    <button
                      className="delete-preset-button"
                      onClick={() => handleDelete(preset.id)}
                      title="Delete Preset"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};