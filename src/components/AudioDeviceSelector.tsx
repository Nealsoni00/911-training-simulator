import React, { useState, useEffect } from 'react';
import './AudioDeviceSelector.css';

interface AudioDeviceSelectorProps {
  onMicrophoneChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  onMicrophoneChange,
  onSpeakerChange
}) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('default');
  const [isExpanded, setIsExpanded] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const loadDevices = async () => {
    try {
      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);

      // Get all media devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = deviceList
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));

      setDevices(audioDevices);
      console.log('🎤 Available audio devices:', audioDevices);
    } catch (error) {
      console.error('❌ Failed to load audio devices:', error);
    }
  };

  useEffect(() => {
    loadDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    onMicrophoneChange(deviceId);
    console.log('🎤 Selected microphone:', deviceId);
  };

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    onSpeakerChange(deviceId);
    console.log('🔊 Selected speaker:', deviceId);
  };

  const microphoneDevices = devices.filter(device => device.kind === 'audioinput');
  const speakerDevices = devices.filter(device => device.kind === 'audiooutput');

  if (!permissionGranted) {
    return (
      <div className="audio-device-selector">
        <div className="device-selector-header">
          <button 
            className="expand-button"
            onClick={loadDevices}
          >
            🎤 Grant Audio Permissions
          </button>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="audio-device-selector">
        <div className="device-selector-header">
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(true)}
          >
            🎤 Audio Devices ({microphoneDevices.length} mic, {speakerDevices.length} speaker)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-device-selector expanded">
      <div className="device-selector-header">
        <h4>🎤 Audio Devices</h4>
        <button 
          className="collapse-button"
          onClick={() => setIsExpanded(false)}
        >
          ×
        </button>
      </div>

      <div className="device-selector-content">
        <div className="device-group">
          <label className="device-label">
            🎤 Microphone (Your Voice):
          </label>
          <select 
            value={selectedMicrophone}
            onChange={(e) => handleMicrophoneChange(e.target.value)}
            className="device-select"
          >
            <option value="default">Default Microphone</option>
            {microphoneDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div className="device-group">
          <label className="device-label">
            🔊 Speaker (Caller Audio):
          </label>
          <select 
            value={selectedSpeaker}
            onChange={(e) => handleSpeakerChange(e.target.value)}
            className="device-select"
          >
            <option value="default">Default Speaker</option>
            {speakerDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div className="device-test">
          <button 
            className="test-button"
            onClick={() => {
              // Test speaker with a short beep
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 440; // A4 note
              gainNode.gain.value = 0.1;
              
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.2);
            }}
          >
            🔊 Test Speaker
          </button>
          
          <button 
            className="refresh-button"
            onClick={loadDevices}
          >
            🔄 Refresh Devices
          </button>
        </div>

        <div className="device-info">
          <small>
            💡 <strong>Tip:</strong> If you don't hear the caller, try different speaker options. 
            Your headphones should appear as a separate audio output device.
          </small>
        </div>
      </div>
    </div>
  );
};