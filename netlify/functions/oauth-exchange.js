// Netlify Function for OAuth token exchange
// This replaces the local proxy server for production

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET requests for testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'OAuth exchange endpoint is working',
        hasClientId: !!process.env.CENTRAL_CLIENT_ID,
        hasClientSecret: !!process.env.CENTRAL_CLIENT_SECRET
      })
    };
  }

  // Only allow POST requests for actual OAuth exchange
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('OAuth exchange request received');
    
    // Get environment variables
    const CLIENT_ID = process.env.CENTRAL_CLIENT_ID;
    const CLIENT_SECRET = process.env.CENTRAL_CLIENT_SECRET;
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('Missing environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Parse request body
    const { code, redirect_uri, code_verifier } = JSON.parse(event.body);
    
    console.log('Exchange request:', {
      code: code ? 'YES' : 'NO',
      redirect_uri,
      code_verifier: code_verifier ? 'YES' : 'NO'
    });

    if (!code || !redirect_uri || !code_verifier) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Exchange code for token with Kick
    const tokenResponse = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri,
        code_verifier: code_verifier
      }).toString()
    });

    console.log('Kick token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Kick token exchange error:', errorData);
      return {
        statusCode: tokenResponse.status,
        headers,
        body: JSON.stringify({ error: errorData.error || 'Token exchange failed' })
      };
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      })
    };

  } catch (error) {
    console.error('OAuth exchange error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
