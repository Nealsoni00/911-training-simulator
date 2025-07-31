import React, { useEffect, useRef } from 'react';
import { ConversationMessage } from '../types';
import './ConversationView.css';

interface ConversationViewProps {
  messages: ConversationMessage[];
  isRecording: boolean;
  pendingCallerMessage?: string;
  partialTranscript?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ messages, isRecording, pendingCallerMessage, partialTranscript }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="conversation-view">
      <div className="conversation-header">
        <h3>Call Log</h3>
        {isRecording && <span className="recording-indicator">Recording...</span>}
      </div>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <span className="role">{message.role === 'operator' ? 'OPERATOR' : 'CALLER'}:</span>
            <span className="content">{message.content}</span>
            <span className="timestamp">{message.timestamp.toLocaleTimeString()}</span>
          </div>
        ))}
        {pendingCallerMessage && (
          <div className="message caller pending">
            <span className="role">CALLER:</span>
            <span className="content pending-text">Preparing response...</span>
            <span className="timestamp">{new Date().toLocaleTimeString()}</span>
          </div>
        )}
        {partialTranscript && (
          <div className="message operator partial">
            <span className="role">OPERATOR:</span>
            <span className="content partial-text">{partialTranscript}...</span>
            <span className="timestamp">{new Date().toLocaleTimeString()}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};