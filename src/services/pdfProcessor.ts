import * as pdfjsLib from 'pdfjs-dist';
import { SimulationPreset } from '../types';

// Configure PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;

export interface ProcessedPDFResult {
  originalText: string;
  redactedTranscript: string;
  emergencyInfo: string;
  suggestedName: string;
  cooperationLevel: number;
  simulationPreset: SimulationPreset;
}

export class PDFProcessor {
  // PII patterns to redact
  private static readonly PII_PATTERNS = [
    // Phone numbers (enhanced pattern)
    { pattern: /\b(?:\+?1[-.\\s]?)?\(?([0-9]{3})\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})\b/g, replacement: '555-123-XXXX' },
    // Alternative phone formats
    { pattern: /\b\d{3}[-.\\s]\d{3}[-.\\s]\d{4}\b/g, replacement: '555-123-XXXX' },
    { pattern: /\b\(\d{3}\)\s?\d{3}[-.\\s]\d{4}\b/g, replacement: '(555) 123-XXXX' },
    // Social Security Numbers
    { pattern: /\b(?:\d{3}[-.\\s]?\d{2}[-.\\s]?\d{4})\b/g, replacement: 'XXX-XX-XXXX' },
    // Email addresses
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: 'email@redacted.com' },
    // Credit card numbers (basic pattern)
    { pattern: /\b(?:\d{4}[-.\\s]?){3}\d{4}\b/g, replacement: 'XXXX-XXXX-XXXX-XXXX' },
    // Driver's license (common formats)
    { pattern: /\b[A-Z]{1,2}\d{6,8}\b/g, replacement: 'DL######' },
    
    // Enhanced name patterns
    // Full names in format "FirstName LastName" when in context
    { pattern: /(?:Name|Full Name|Patient|Victim|Caller|Complainant|Reporting Party|RP):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi, replacement: 'Name: [REDACTED]' },
    // Names in quotes or after "called" or "named"
    { pattern: /(?:called|named|is)\s+"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)"/gi, replacement: 'called "[REDACTED]"' },
    // Names after Mr./Mrs./Ms./Dr.
    { pattern: /\b(?:Mr|Mrs|Ms|Dr|Miss)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, replacement: 'Mr. [REDACTED]' },
    // Possessive names (John's, Mary's)
    { pattern: /\b([A-Z][a-z]+)'s\b/g, replacement: '[REDACTED]\'s' },
    
    // Addresses (street numbers and names)
    { pattern: /\b\d{1,5}\s+(?:[NSEW]\s+)?[A-Za-z\s]{2,30}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way)\b/gi, replacement: '[ADDRESS REDACTED]' },
    // Full addresses with city/state/zip
    { pattern: /\b\d{1,5}\s+[A-Za-z\s]{2,30}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way),?\s*[A-Za-z\s]{2,20},?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/gi, replacement: '[FULL ADDRESS REDACTED]' },
    
    // Dates of birth and ages
    { pattern: /\b(?:DOB|Date of Birth|Born):\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: 'DOB: [REDACTED]' },
    { pattern: /\b(?:Age|age):\s*\d{1,3}\b/gi, replacement: 'Age: [REDACTED]' },
    
    // Insurance/Medical/ID numbers
    { pattern: /\b(?:Policy|Member|Account|Medical Record|Case|Report|Badge|Employee|ID)(?:\s+#|#|\s+Number|No):\s*[A-Z0-9\-]{4,20}\b/gi, replacement: 'ID: [REDACTED]' },
    
    // License plates
    { pattern: /\b[A-Z]{1,3}\d{1,4}[A-Z]{0,3}\b/g, replacement: 'XXX-####' },
    
    // Bank account and routing numbers
    { pattern: /\b\d{9,17}\b/g, replacement: '[ACCOUNT REDACTED]' },
    
    // URLs and websites (but preserve common domains)
    { pattern: /https?:\/\/(?!(?:google|facebook|twitter|instagram|youtube|linkedin|amazon|apple|microsoft|gmail)\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi, replacement: 'https://[WEBSITE REDACTED]' },
    
    // Personal identifiers that might be metadata
    { pattern: /(?:Created by|Author|Modified by|Uploaded by|User):\s*([A-Za-z0-9\s]+)/gi, replacement: 'Created by: [REDACTED]' },
    { pattern: /(?:File path|Document path):\s*([A-Za-z0-9\\\/:\s.-]+)/gi, replacement: 'File path: [REDACTED]' }
  ];

  // Emergency type detection patterns
  private static readonly EMERGENCY_PATTERNS = {
    'Medical Emergency': /\b(?:heart attack|stroke|unconscious|not breathing|chest pain|overdose|seizure|bleeding|injury|injured|hurt|pain|medical|ambulance|paramedic)\b/gi,
    'Fire Emergency': /\b(?:fire|smoke|burning|flames|explosion|gas leak|carbon monoxide)\b/gi,
    'Police Emergency': /\b(?:robbery|burglary|assault|attack|shooting|stabbing|domestic|violence|break.?in|theft|stolen|weapon|gun|knife|threat)\b/gi,
    'Traffic Accident': /\b(?:accident|crash|collision|hit and run|vehicle|car|truck|motorcycle|pedestrian|highway|intersection)\b/gi,
    'Domestic Violence': /\b(?:domestic|abuse|boyfriend|girlfriend|husband|wife|partner|hitting|threatening|scared)\b/gi,
    'Mental Health Crisis': /\b(?:suicide|mental|depression|threatening.*self|harm.*self|psych|crisis)\b/gi
  };

  // Extract text from PDF file
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF. Please ensure the PDF contains readable text.');
    }
  }

  // Redact PII from text
  static redactPII(text: string): string {
    let redactedText = text;
    
    this.PII_PATTERNS.forEach(({ pattern, replacement }) => {
      redactedText = redactedText.replace(pattern, replacement);
    });
    
    return redactedText;
  }

  // Detect emergency type from transcript
  static detectEmergencyType(text: string): string {
    const scores: { [key: string]: number } = {};
    
    Object.entries(this.EMERGENCY_PATTERNS).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      scores[type] = matches.length;
    });
    
    // Find the type with the highest score
    const detectedType = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return detectedType && detectedType[1] > 0 ? detectedType[0] : 'General Emergency';
  }

  // Extract cooperation level based on text indicators
  static estimateCooperationLevel(text: string): number {
    const panicIndicators = /\b(?:screaming|crying|hysterical|can't|help|please|scared|panic|oh god|emergency)\b/gi;
    const calmIndicators = /\b(?:okay|yes|understand|clear|address|phone number|spell|calm)\b/gi;
    
    const panicMatches = (text.match(panicIndicators) || []).length;
    const calmMatches = (text.match(calmIndicators) || []).length;
    
    // Base cooperation level
    let cooperationLevel = 70;
    
    // Adjust based on indicators
    if (panicMatches > calmMatches) {
      cooperationLevel = Math.max(20, 70 - (panicMatches * 5));
    } else if (calmMatches > panicMatches) {
      cooperationLevel = Math.min(90, 70 + (calmMatches * 3));
    }
    
    return cooperationLevel;
  }

  // Generate simulation name based on content
  static generateSimulationName(text: string, emergencyType: string): string {
    const textLower = text.toLowerCase();
    
    // Extract key details for naming
    const locationMatch = textLower.match(/(?:at|on|near)\s+([a-z\s]{3,20}(?:street|avenue|road|drive|st|ave|rd|dr))/i);
    const timeMatch = textLower.match(/(?:this morning|afternoon|evening|night|today|yesterday)/i);
    const severityMatch = textLower.match(/\b(?:serious|critical|severe|minor|major)\b/i);
    
    let nameParts = [emergencyType];
    
    if (locationMatch) {
      const location = locationMatch[1].trim().split(' ').slice(0, 2).join(' ');
      nameParts.push(`- ${location}`);
    }
    
    if (severityMatch) {
      nameParts.push(`(${severityMatch[0]})`);
    } else if (timeMatch) {
      nameParts.push(`(${timeMatch[0]})`);
    }
    
    // Add cooperation indicator
    const cooperationLevel = this.estimateCooperationLevel(text);
    if (cooperationLevel < 40) {
      nameParts.push('- High Stress');
    } else if (cooperationLevel > 80) {
      nameParts.push('- Cooperative');
    }
    
    return nameParts.join(' ').substring(0, 80); // Limit length
  }

  // Separate dialogue from case information
  static parseTranscriptContent(text: string): { transcript: string; caseInfo: string } {
    // Look for dialogue patterns (911 Caller:, 911 Dispatcher:, Caller:, Dispatcher:)
    const dialoguePattern = /(?:911\s+)?(?:Caller|Dispatcher):\s*.+/gi;
    const dialogueMatches = text.match(dialoguePattern) || [];
    
    if (dialogueMatches.length > 0) {
      // Extract dialogue
      const transcript = dialogueMatches.join('\n');
      
      // Extract case information (everything that's not dialogue)
      let caseInfo = text;
      dialogueMatches.forEach(line => {
        caseInfo = caseInfo.replace(line, '');
      });
      
      // Clean up case info
      caseInfo = caseInfo
        .split('\n')
        .filter(line => line.trim().length > 10) // Remove short lines
        .filter(line => !line.match(/^\s*page\s*\d+/i)) // Remove page numbers
        .filter(line => !line.match(/^\s*\d+\s*$/)) // Remove standalone numbers
        .join('\n')
        .trim();
      
      return { transcript, caseInfo };
    } else {
      // If no clear dialogue pattern, treat the whole text as case info
      return { transcript: '', caseInfo: text };
    }
  }

  // Main processing function
  static async processPDF(file: File): Promise<ProcessedPDFResult> {
    try {
      console.log('🔄 Processing PDF:', file.name);
      
      // Extract text from PDF
      const originalText = await this.extractTextFromPDF(file);
      console.log('📝 Extracted text length:', originalText.length);
      
      if (originalText.length < 100) {
        throw new Error('PDF appears to contain very little text. Please ensure the PDF has readable content.');
      }
      
      // Parse content to separate dialogue from case info
      const { transcript, caseInfo } = this.parseTranscriptContent(originalText);
      
      // Redact PII from transcript
      const redactedTranscript = this.redactPII(transcript || originalText);
      
      // Detect emergency type and other details
      const emergencyType = this.detectEmergencyType(originalText);
      const cooperationLevel = this.estimateCooperationLevel(originalText);
      const suggestedName = this.generateSimulationName(originalText, emergencyType);
      
      console.log('🎯 Detected emergency type:', emergencyType);
      console.log('📊 Estimated cooperation level:', cooperationLevel);
      console.log('📋 Generated name:', suggestedName);
      
      // Create simulation preset
      const simulationPreset: SimulationPreset = {
        id: `pdf-${Date.now()}`,
        name: suggestedName,
        transcript: caseInfo || `${emergencyType} situation extracted from PDF`,
        realTranscript: redactedTranscript,
        callerInstructions: `This simulation is based on a real case extracted from a PDF. The caller should follow the patterns shown in the real transcript while maintaining the cooperation level of ${cooperationLevel}%.`,
        config: {
          cooperationLevel,
          backgroundNoise: 'none',
          backgroundNoiseLevel: 30,
          volumeLevel: 80,
          city: 'Generated',
          state: 'XX'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return {
        originalText,
        redactedTranscript,
        emergencyInfo: caseInfo,
        suggestedName,
        cooperationLevel,
        simulationPreset
      };
      
    } catch (error) {
      console.error('❌ PDF processing failed:', error);
      throw error;
    }
  }
}