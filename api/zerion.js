export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path, coinstats, bypassCache, litellm } = req.query;

  // 1. CoinStats API (wallet balances, coins, etc.)
  if (coinstats === 'true') {
    const apiKey = process.env.COINSTATS_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing COINSTATS_API_KEY on host environment' });
    }

    // Support arbitrary CoinStats paths (wallet/balances, wallet/balance, coins, etc.)
    let targetUrl;
    if (path) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      targetUrl = `https://api.coinstats.app/v1${cleanPath}`;
    } else {
      targetUrl = 'https://api.coinstats.app/v1/coins?limit=1000';
    }

    try {
      const headers = {
        'accept': 'application/json',
        'X-API-KEY': apiKey
      };

      if (bypassCache === 'true') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }

      const response = await fetch(targetUrl, { method: 'GET', headers });

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinStats API error: ${response.statusText}` });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. LiteLLM proxy
  if (litellm === 'true') {
    const apiKey = process.env.LITELLM_API_KEY || '';
    const apiBase = process.env.LITELLM_API_BASE || 'http://13.126.102.204:4000';
    if (!apiKey) {
      console.error('Missing LITELLM_API_KEY environment variable');
      return res.status(500).json({ error: 'LiteLLM API key not configured' });
    }

    try {
      console.log('Proxying LiteLLM request to:', `${apiBase}/v1/chat/completions`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const response = await fetch(`${apiBase}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LiteLLM error response:', errorText);
        return res.status(response.status).json({ 
          error: `LiteLLM API error: ${response.statusText}`,
          details: errorText
        });
      }

      if (req.body.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Properly handle SSE stream
        try {
          const reader = response.body.getReader();
          const encoder = new TextEncoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Forward the chunk directly
            res.write(value);
          }
          
          res.end();
          return;
        } catch (streamError) {
          console.error('Stream error:', streamError);
          return res.status(500).json({ error: 'Stream failed' });
        }
      }

      const data = await response.json();
      console.log('LiteLLM response received successfully');
      return res.status(200).json(data);
    } catch (error) {
      console.error('LiteLLM proxy error:', error);
      return res.status(500).json({ 
        error: 'Failed to connect to LiteLLM API',
        details: error.message 
      });
    }
  }

  // 3. Zerion API proxy
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const apiKey = process.env.ZERION_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ZERION_API_KEY on host environment' });
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `https://api.zerion.io/v1${cleanPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Zerion API error: ${response.statusText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
