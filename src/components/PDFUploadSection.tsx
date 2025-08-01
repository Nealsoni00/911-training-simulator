import React, { useState, useRef } from 'react';
import { PDFProcessor, ProcessedPDFResult } from '../services/pdfProcessor';
import { SimulationPreset } from '../types';
import './PDFUploadSection.css';

interface PDFUploadSectionProps {
  onPresetGenerated: (preset: SimulationPreset) => void;
}

export const PDFUploadSection: React.FC<PDFUploadSectionProps> = ({
  onPresetGenerated
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessedPDFResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF file is too large. Please select a file smaller than 10MB.');
      return;
    }

    setError(null);
    setProcessingResult(null);
    setIsProcessing(true);

    try {
      console.log('🔄 Starting PDF processing...');
      const result = await PDFProcessor.processPDF(file);
      setProcessingResult(result);
      setShowPreview(true);
      
      console.log('✅ PDF processed successfully');
    } catch (err) {
      console.error('❌ PDF processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSimulation = () => {
    if (processingResult) {
      onPresetGenerated(processingResult.simulationPreset);
      setProcessingResult(null);
      setShowPreview(false);
      setError(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    setProcessingResult(null);
    setShowPreview(false);
    setError(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`pdf-upload-section ${isExpanded ? 'expanded' : 'compact'}`}>
      <div 
        className="pdf-upload-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <h3>
          📄 Generate Training from PDF 
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </h3>
        {!isExpanded && (
          <p className="compact-description">Click to upload a PDF and create training simulation automatically</p>
        )}
        {isExpanded && (
          <p>Upload a PDF containing a 911 call transcript to automatically create a training simulation with PII redaction.</p>
        )}
      </div>

      {/* File Upload - only show when expanded */}
      {isExpanded && (
        <>
          <div className="pdf-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="pdf-file-input"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className={`pdf-upload-label ${isProcessing ? 'processing' : ''}`}>
              {isProcessing ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Processing PDF...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="upload-icon">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  <span>Click to upload PDF or drag and drop</span>
                  <small>Maximum file size: 10MB</small>
                </>
              )}
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="pdf-error">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Processing Result Preview */}
          {showPreview && processingResult && (
            <div className="pdf-preview">
            <div className="preview-header">
            <h4>📋 Generated Training Simulation</h4>
            <div className="preview-actions">
              <button 
                className="preview-button cancel-button" 
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button 
                className="preview-button create-button" 
                onClick={handleCreateSimulation}
              >
                Create Simulation
              </button>
            </div>
          </div>

          <div className="preview-content">
            {/* Simulation Details */}
            <div className="preview-section">
              <h5>🎯 Simulation Details</h5>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{processingResult.suggestedName}</span>
                </div>
                <div className="detail-item">
                  <label>Cooperation Level:</label>
                  <span>{processingResult.simulationPreset.config.cooperationLevel}%</span>
                </div>
                <div className="detail-item">
                  <label>Emergency Type:</label>
                  <span>Auto-detected from content</span>
                </div>
              </div>
            </div>

            {/* Emergency Information */}
            {processingResult.emergencyInfo && (
              <div className="preview-section">
                <h5>🚨 Emergency Information</h5>
                <div className="info-content">
                  {processingResult.emergencyInfo.substring(0, 300)}
                  {processingResult.emergencyInfo.length > 300 && '...'}
                </div>
              </div>
            )}

            {/* Redacted Transcript Preview */}
            {processingResult.redactedTranscript && (
              <div className="preview-section">
                <h5>📞 Redacted Transcript (Sample)</h5>
                <div className="transcript-preview">
                  {processingResult.redactedTranscript.substring(0, 400)}
                  {processingResult.redactedTranscript.length > 400 && '...'}
                </div>
                <div className="redaction-note">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,14H13V16H11V14M11,8H13V12H11V8Z" />
                  </svg>
                  <span>PII has been automatically redacted for privacy protection</span>
                </div>
              </div>
            )}

            {/* PII Redaction Summary */}
            <div className="preview-section">
              <h5>🔒 Privacy Protection</h5>
              <div className="privacy-features">
                <div className="privacy-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
                  </svg>
                  <span>Phone numbers redacted</span>
                </div>
                <div className="privacy-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
                  </svg>
                  <span>Addresses anonymized</span>
                </div>
                <div className="privacy-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
                  </svg>
                  <span>Personal identifiers removed</span>
                </div>
                <div className="privacy-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
                  </svg>
                  <span>Email addresses masked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Usage Instructions */}
          <div className="pdf-instructions">
            <h4>ℹ️ How it works</h4>
            <ul>
              <li><strong>Upload:</strong> Select a PDF containing a 911 call transcript</li>
              <li><strong>Processing:</strong> The system extracts text and automatically detects emergency type</li>
              <li><strong>PII Redaction:</strong> Personal information is automatically removed for privacy</li>
              <li><strong>Auto-naming:</strong> Simulation name is generated based on the content</li>
              <li><strong>Training Ready:</strong> A complete simulation preset is created for immediate use</li>
            </ul>
            
            <div className="supported-content">
              <h5>📋 Supported Content</h5>
              <p>PDFs should contain:</p>
              <ul>
                <li>911 call transcripts with dialogue</li>
                <li>Case reports with emergency details</li>
                <li>Training materials with realistic scenarios</li>
                <li>Readable text (not scanned images)</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};