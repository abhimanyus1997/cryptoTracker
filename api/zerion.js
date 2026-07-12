export default async function handler(req, res) {
  // Add CORS headers for local/Vercel dev environment compatibility
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

  // CoinStats coins query parameter options
  const { path, coinstats, bypassCache } = req.query;

  // 1. Check if we should route to CoinStats
  if (coinstats === 'true') {
    const apiKey = process.env.COINSTATS_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing COINSTATS_API_KEY on host environment' });
    }

    // Default or custom endpoint matching CoinStats coins request
    const targetUrl = 'https://open-api.coinstats.app/v1/coins?limit=1000';

    try {
      const headers = {
        'accept': 'application/json',
        'X-API-KEY': apiKey
      };

      // If requested to bypass cache (for superuser)
      if (bypassCache === 'true') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
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

  // 2. Normal Zerion API Proxy flow
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
