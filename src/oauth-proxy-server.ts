import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { SERVER_OAUTH_CONFIG, isServerConfigValid } from './server-config';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth proxy endpoint
app.post('/oauth/exchange', async (req, res) => {
    try {
        const { code, redirect_uri, code_verifier } = req.body;
        
        console.log('OAuth exchange request:', { code, redirect_uri, code_verifier: !!code_verifier });
        
        if (!code || !redirect_uri || !code_verifier) {
            return res.status(400).json({ 
                error: 'Missing required parameters: code, redirect_uri, code_verifier' 
            });
        }

        // Exchange code for token using Kick's OAuth endpoint
        const tokenResponse = await fetch(SERVER_OAUTH_CONFIG.OAUTH_SETTINGS.token_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: SERVER_OAUTH_CONFIG.CLIENT_ID,
                client_secret: SERVER_OAUTH_CONFIG.CLIENT_SECRET,
                code: code,
                redirect_uri: redirect_uri,
                code_verifier: code_verifier
            })
        });

        console.log('Kick token response status:', tokenResponse.status);
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Kick token error:', errorText);
            return res.status(tokenResponse.status).json({ 
                error: 'Token exchange failed',
                details: errorText 
            });
        }

        const tokenData = await tokenResponse.json();
        console.log('Token exchange successful');
        
        // Return only the access token (don't expose refresh token to client)
        res.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in,
            scope: tokenData.scope
        });

    } catch (error) {
        console.error('OAuth proxy error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        client_id_configured: !!SERVER_OAUTH_CONFIG.CLIENT_ID,
        client_secret_configured: !!SERVER_OAUTH_CONFIG.CLIENT_SECRET,
        config_valid: isServerConfigValid()
    });
});

app.listen(PORT, () => {
    console.log(`OAuth Proxy Server running on http://localhost:${PORT}`);
    console.log('Client ID configured:', !!SERVER_OAUTH_CONFIG.CLIENT_ID);
    console.log('Client Secret configured:', !!SERVER_OAUTH_CONFIG.CLIENT_SECRET);
    console.log('Config valid:', isServerConfigValid());

    if (!SERVER_OAUTH_CONFIG.CLIENT_SECRET) {
        console.warn('⚠️  KICK_CLIENT_SECRET environment variable not set!');
        console.warn('   Set it with: export KICK_CLIENT_SECRET=your_client_secret');
    }
});

export default app;
