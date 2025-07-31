export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}