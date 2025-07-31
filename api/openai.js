export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
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
    res.status(500).json({ error: 'Failed to process request' });
  }
}