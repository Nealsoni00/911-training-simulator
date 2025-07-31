import React, { useState, useEffect } from 'react';
import './CompactAudioSelector.css';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface CompactAudioSelectorProps {
  onMicrophoneChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
}

export const CompactAudioSelector: React.FC<CompactAudioSelectorProps> = ({
  onMicrophoneChange,
  onSpeakerChange
}) => {
  const [microphoneDevices, setMicrophoneDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('default');
  const [showMicDropdown, setShowMicDropdown] = useState(false);
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const loadAudioDevices = async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const mics = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
        }));

      const speakers = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`
        }));

      // Add default options
      setMicrophoneDevices([
        { deviceId: 'default', label: 'Default Microphone' },
        ...mics
      ]);

      setSpeakerDevices([
        { deviceId: 'default', label: 'Default Speaker' },
        ...speakers
      ]);

    } catch (error) {
      console.error('Error loading audio devices:', error);
      // Fallback to default only
      setMicrophoneDevices([{ deviceId: 'default', label: 'Default Microphone' }]);
      setSpeakerDevices([{ deviceId: 'default', label: 'Default Speaker' }]);
    }
  };

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    setShowMicDropdown(false);
    onMicrophoneChange(deviceId);
  };

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    setShowSpeakerDropdown(false);
    onSpeakerChange(deviceId);
  };

  const getCurrentMicLabel = () => {
    const device = microphoneDevices.find(d => d.deviceId === selectedMicrophone);
    return device?.label || 'Default Microphone';
  };

  const getCurrentSpeakerLabel = () => {
    const device = speakerDevices.find(d => d.deviceId === selectedSpeaker);
    return device?.label || 'Default Speaker';
  };

  return (
    <div className="compact-audio-selector">
      {/* Microphone Selector */}
      <div className="audio-device-selector">
        <button
          className="device-button microphone-button"
          onClick={() => setShowMicDropdown(!showMicDropdown)}
          title={getCurrentMicLabel()}
        >
          <svg className="device-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12S10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10M12 19V22H16V24H8V22H12V19Z"/>
          </svg>
          <span className="device-label">MIC</span>
          <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10L12 15L17 10H7Z"/>
          </svg>
        </button>
        
        {showMicDropdown && (
          <div className="device-dropdown">
            <div className="dropdown-header">Microphone</div>
            {microphoneDevices.map(device => (
              <button
                key={device.deviceId}
                className={`dropdown-item ${selectedMicrophone === device.deviceId ? 'selected' : ''}`}
                onClick={() => handleMicrophoneChange(device.deviceId)}
              >
                {device.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Speaker/Headset Selector */}
      <div className="audio-device-selector">
        <button
          className="device-button speaker-button"
          onClick={() => setShowSpeakerDropdown(!showSpeakerDropdown)}
          title={getCurrentSpeakerLabel()}
        >
          <svg className="device-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,1C7,1 4,6 4,6V10H7V22H17V10H20S17,1 12,1M12,3A2,2 0 0,1 14,5A2,2 0 0,1 12,7A2,2 0 0,1 10,5A2,2 0 0,1 12,3M9,12V20H15V12H9Z"/>
          </svg>
          <span className="device-label">AUDIO</span>
          <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10L12 15L17 10H7Z"/>
          </svg>
        </button>
        
        {showSpeakerDropdown && (
          <div className="device-dropdown">
            <div className="dropdown-header">Audio Output</div>
            {speakerDevices.map(device => (
              <button
                key={device.deviceId}
                className={`dropdown-item ${selectedSpeaker === device.deviceId ? 'selected' : ''}`}
                onClick={() => handleSpeakerChange(device.deviceId)}
              >
                {device.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};