import React, { useState, useCallback, useEffect } from 'react';
import './ResizableSplitter.css';

interface ResizableSplitterProps {
  children: [React.ReactNode, React.ReactNode];
  defaultSplit?: number; // Percentage (0-100)
  minSize?: number; // Minimum size in pixels
  storageKey?: string; // Key for localStorage persistence
  className?: string;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  children,
  defaultSplit = 70,
  minSize = 300,
  storageKey,
  className = ''
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Load saved split from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedWidth = parseFloat(saved);
        if (parsedWidth >= 20 && parsedWidth <= 80) { // Safety bounds
          setLeftWidth(parsedWidth);
        }
      }
    }
  }, [storageKey]);

  // Save split to localStorage
  const saveSplit = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, leftWidth.toString());
    }
  }, [storageKey, leftWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(leftWidth);
  }, [leftWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const containerWidth = window.innerWidth;
    const deltaX = e.clientX - startX;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent)); // 20-80% bounds
    
    // Check minimum pixel size
    const leftPixels = (newWidth / 100) * containerWidth;
    const rightPixels = ((100 - newWidth) / 100) * containerWidth;
    
    if (leftPixels >= minSize && rightPixels >= minSize) {
      setLeftWidth(newWidth);
    }
  }, [isDragging, startX, startWidth, minSize]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      saveSplit();
    }
  }, [isDragging, saveSplit]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={`resizable-splitter ${className}`}>
      <div 
        className="splitter-pane left-pane"
        style={{ width: `${leftWidth}%` }}
      >
        {children[0]}
      </div>
      
      <div 
        className={`splitter-handle ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="handle-bar">
          <div className="handle-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
      
      <div 
        className="splitter-pane right-pane"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {children[1]}
      </div>
    </div>
  );
};