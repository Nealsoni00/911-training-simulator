import React, { useState } from 'react';
import { CADEntry } from '../types';
import { LocationService, LocationSuggestion } from '../services/locationService';
import './CADInterface.css';

interface CADInterfaceProps {
  onCADUpdate: (entry: CADEntry) => void;
  city: string;
  state: string;
}

export const CADInterface: React.FC<CADInterfaceProps> = ({ onCADUpdate, city, state }) => {
  const [cadEntry, setCADEntry] = useState<CADEntry>({
    id: Date.now().toString(),
    timestamp: new Date(),
    callType: '',
    priority: 'P3',
    location: '',
    callerName: '',
    callerPhone: '',
    description: '',
    units: [],
    status: 'pending',
    notes: ''
  });

  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationService = new LocationService();

  const handleFieldChange = (field: keyof CADEntry, value: any) => {
    const updated = { ...cadEntry, [field]: value };
    setCADEntry(updated);
    onCADUpdate(updated);
  };

  const handleLocationChange = (value: string) => {
    handleFieldChange('location', value);
    
    if (value.trim() && city && state) {
      const suggestions = locationService.generateLocationSuggestions(value, city, state);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    handleFieldChange('location', suggestion.address);
    setShowLocationSuggestions(false);
  };

  const callTypes = [
    'Medical Emergency',
    'Fire',
    'Traffic Accident',
    'Domestic Disturbance',
    'Burglary',
    'Assault',
    'Welfare Check',
    'Noise Complaint',
    'Other'
  ];

  const priorities = ['P1', 'P2', 'P3', 'P4', 'P5'];

  return (
    <div className="cad-interface">
      <div className="cad-header">
        <h2>CAD Entry - Incident #{cadEntry.id}</h2>
        <span className="timestamp">{cadEntry.timestamp.toLocaleString()}</span>
      </div>

      <div className="cad-grid">
        <div className="cad-section">
          <label>Call Type</label>
          <select 
            value={cadEntry.callType}
            onChange={(e) => handleFieldChange('callType', e.target.value)}
          >
            <option value="">Select Type</option>
            {callTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="cad-section">
          <label>Priority</label>
          <select 
            value={cadEntry.priority}
            onChange={(e) => handleFieldChange('priority', e.target.value)}
          >
            {priorities.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="cad-section full-width location-section">
          <label>Location</label>
          <div className="location-input-container">
            <input 
              type="text"
              value={cadEntry.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={(e) => handleLocationChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
              placeholder={`Enter incident location in ${city}, ${state}`}
            />
            {showLocationSuggestions && (
              <div className="location-suggestions">
                {locationSuggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={`location-suggestion ${suggestion.type}`}
                    onClick={() => handleLocationSelect(suggestion)}
                  >
                    <span className="suggestion-text">{suggestion.address}</span>
                    <span className="suggestion-type">{suggestion.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cad-section">
          <label>Caller Name</label>
          <input 
            type="text"
            value={cadEntry.callerName}
            onChange={(e) => handleFieldChange('callerName', e.target.value)}
            placeholder="Enter caller name"
          />
        </div>

        <div className="cad-section">
          <label>Caller Phone</label>
          <input 
            type="tel"
            value={cadEntry.callerPhone}
            onChange={(e) => handleFieldChange('callerPhone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>

        <div className="cad-section full-width">
          <label>Description</label>
          <textarea 
            value={cadEntry.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter incident description"
            rows={4}
          />
        </div>

        <div className="cad-section full-width">
          <label>Units</label>
          <input 
            type="text"
            value={cadEntry.units.join(', ')}
            onChange={(e) => handleFieldChange('units', e.target.value.split(',').map(u => u.trim()).filter(u => u))}
            placeholder="Enter unit codes (comma separated)"
          />
        </div>

        <div className="cad-section full-width">
          <label>Notes</label>
          <textarea 
            value={cadEntry.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Additional notes"
            rows={3}
          />
        </div>
      </div>

      <div className="cad-status">
        <label>Status: </label>
        <span className={`status-badge status-${cadEntry.status}`}>
          {cadEntry.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
};