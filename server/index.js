const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for local development
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// OpenAI API endpoint
app.post('/api/openai', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Handle different OpenAI endpoints
    if (req.body.endpoint === 'audio.speech') {
      // Text-to-speech request
      const { endpoint, ...params } = req.body;
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error });
      }

      // Return audio as buffer
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(buffer));
    } else {
      // Chat completion request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.status(200).json(data);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Deepgram API endpoint
app.post('/api/deepgram', async (req, res) => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Deepgram API key not configured' });
    }

    // For WebSocket connections, we need to return the API key securely
    // This endpoint will be used to get a temporary token
    if (req.body.action === 'getToken') {
      // In production, you might want to create temporary tokens
      // For now, we'll return the API key
      res.status(200).json({ apiKey });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Deepgram API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// LiveKit API endpoint
app.post('/api/livekit', async (req, res) => {
  try {
    // Return LiveKit configuration
    if (req.body.action === 'getConfig') {
      res.status(200).json({
        wsUrl: process.env.REACT_APP_LIVEKIT_WS_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
        token: process.env.LIVEKIT_TOKEN
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('LiveKit API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Development server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST /api/openai`);
  console.log(`   - POST /api/deepgram`);
  console.log(`   - POST /api/livekit`);
  console.log(`   - GET  /api/health`);
});