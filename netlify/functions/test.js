// Simple test function to verify Netlify functions are working
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Netlify function is working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
      environment: {
        CENTRAL_CLIENT_ID: process.env.CENTRAL_CLIENT_ID ? 'SET' : 'MISSING',
        CENTRAL_CLIENT_SECRET: process.env.CENTRAL_CLIENT_SECRET ? 'SET' : 'MISSING'
      }
    })
  };
};
