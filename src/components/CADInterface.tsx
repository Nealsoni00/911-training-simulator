import React, { useState, useRef, useEffect } from 'react';
import { CADEntry } from '../types';
import { LocationService, LocationSuggestion } from '../services/locationService';
import './CADInterface.css';

interface CADChangeEvent {
  id: string;
  timestamp: Date;
  field: string;
  oldValue: string;
  newValue: string;
  callDuration: string;
}

interface CADInterfaceProps {
  onCADUpdate: (entry: CADEntry) => void;
  city: string;
  state: string;
  callStartTime?: Date;
}

export const CADInterface: React.FC<CADInterfaceProps> = ({ onCADUpdate, city, state, callStartTime }) => {
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
  const [pendingChanges, setPendingChanges] = useState<Map<string, { oldValue: string; newValue: string }>>(new Map());
  const [changeHistory, setChangeHistory] = useState<CADChangeEvent[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  
  const locationService = new LocationService();
  const savedCadEntryRef = useRef<CADEntry>(cadEntry);

  // Calculate call duration
  const getCallDuration = (): string => {
    if (!callStartTime) return '00:00';
    const now = new Date();
    const diffMs = now.getTime() - callStartTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle field changes with tracking
  const handleFieldChange = (field: keyof CADEntry, value: any) => {
    const currentValue = Array.isArray(cadEntry[field]) 
      ? (cadEntry[field] as any[]).join(', ') 
      : String(cadEntry[field] || '');
    const newValue = Array.isArray(value) ? value.join(', ') : String(value || '');
    
    // Update the CAD entry
    const updated = { ...cadEntry, [field]: value };
    setCADEntry(updated);
    
    // Track the change if value actually changed
    if (currentValue !== newValue) {
      const savedValue = Array.isArray(savedCadEntryRef.current[field])
        ? (savedCadEntryRef.current[field] as any[]).join(', ')
        : String(savedCadEntryRef.current[field] || '');
      
      setPendingChanges(prev => {
        const newChanges = new Map(prev);
        newChanges.set(field, { oldValue: savedValue, newValue });
        return newChanges;
      });
      setActiveField(field);
    }
  };

  // Save changes when Enter is pressed
  const handleSaveChanges = () => {
    if (pendingChanges.size === 0) return;
    
    const callDuration = getCallDuration();
    const newChangeEvents: CADChangeEvent[] = [];
    
    pendingChanges.forEach((change, field) => {
      if (change.oldValue !== change.newValue) {
        newChangeEvents.push({
          id: `${Date.now()}-${field}`,
          timestamp: new Date(),
          field: field.charAt(0).toUpperCase() + field.slice(1),
          oldValue: change.oldValue || '(empty)',
          newValue: change.newValue || '(empty)',
          callDuration
        });
      }
    });
    
    // Update change history
    setChangeHistory(prev => [...prev, ...newChangeEvents]);
    
    // Update saved reference
    savedCadEntryRef.current = { ...cadEntry };
    
    // Clear pending changes
    setPendingChanges(new Map());
    setActiveField(null);
    
    // Notify parent component
    onCADUpdate(cadEntry);
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && pendingChanges.size > 0) {
      event.preventDefault();
      handleSaveChanges();
    }
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

      <div className="cad-grid" onKeyDown={handleKeyDown}>
        <div className={`cad-section ${pendingChanges.has('callType') ? 'has-pending-changes' : ''}`}>
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
          {pendingChanges.has('callType') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section ${pendingChanges.has('priority') ? 'has-pending-changes' : ''}`}>
          <label>Priority</label>
          <select 
            value={cadEntry.priority}
            onChange={(e) => handleFieldChange('priority', e.target.value)}
          >
            {priorities.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {pendingChanges.has('priority') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section full-width location-section ${pendingChanges.has('location') ? 'has-pending-changes' : ''}`}>
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
            {pendingChanges.has('location') && (
              <div className="change-hint">Press Enter to save change</div>
            )}
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

        <div className={`cad-section ${pendingChanges.has('callerName') ? 'has-pending-changes' : ''}`}>
          <label>Caller Name</label>
          <input 
            type="text"
            value={cadEntry.callerName}
            onChange={(e) => handleFieldChange('callerName', e.target.value)}
            placeholder="Enter caller name"
          />
          {pendingChanges.has('callerName') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section ${pendingChanges.has('callerPhone') ? 'has-pending-changes' : ''}`}>
          <label>Caller Phone</label>
          <input 
            type="tel"
            value={cadEntry.callerPhone}
            onChange={(e) => handleFieldChange('callerPhone', e.target.value)}
            placeholder="(555) 555-5555"
          />
          {pendingChanges.has('callerPhone') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section full-width ${pendingChanges.has('description') ? 'has-pending-changes' : ''}`}>
          <label>Description</label>
          <textarea 
            value={cadEntry.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter incident description"
            rows={4}
          />
          {pendingChanges.has('description') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section full-width ${pendingChanges.has('units') ? 'has-pending-changes' : ''}`}>
          <label>Units</label>
          <input 
            type="text"
            value={cadEntry.units.join(', ')}
            onChange={(e) => handleFieldChange('units', e.target.value.split(',').map(u => u.trim()).filter(u => u))}
            placeholder="Enter unit codes (comma separated)"
          />
          {pendingChanges.has('units') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>

        <div className={`cad-section full-width ${pendingChanges.has('notes') ? 'has-pending-changes' : ''}`}>
          <label>Notes</label>
          <textarea 
            value={cadEntry.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Additional notes"
            rows={3}
          />
          {pendingChanges.has('notes') && (
            <div className="change-hint">Press Enter to save change</div>
          )}
        </div>
      </div>

      <div className="cad-status">
        <label>Status: </label>
        <span className={`status-badge status-${cadEntry.status}`}>
          {cadEntry.status.toUpperCase()}
        </span>
      </div>

      {/* Change History */}
      {changeHistory.length > 0 && (
        <div className="cad-change-history">
          <h3>CAD Update History</h3>
          <div className="change-history-list">
            {changeHistory.map((change) => (
              <div key={change.id} className="change-event">
                <div className="change-info">
                  <span className="change-field">{change.field}</span>
                  <span className="change-arrow">→</span>
                  <span className="change-value">{change.newValue}</span>
                </div>
                <div className="change-meta">
                  <span className="change-time">{change.timestamp.toLocaleTimeString()}</span>
                  <span className="change-duration">Call: {change.callDuration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Changes Indicator */}
      {pendingChanges.size > 0 && (
        <div className="pending-changes-summary">
          <div className="pending-indicator">
            <span className="pending-count">{pendingChanges.size}</span>
            <span className="pending-text">unsaved change{pendingChanges.size !== 1 ? 's' : ''}</span>
            <span className="pending-instruction"> - Press Enter to save</span>
          </div>
        </div>
      )}
    </div>
  );
};