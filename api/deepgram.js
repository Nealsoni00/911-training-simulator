export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}