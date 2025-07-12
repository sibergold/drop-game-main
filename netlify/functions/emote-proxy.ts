import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const emoteId = event.queryStringParameters?.emoteId;
        
        if (!emoteId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'emoteId parameter is required' }),
            };
        }

        const emoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;
        
        console.log(`🎭 Proxying Kick emote: ${emoteId} from ${emoteUrl}`);
        
        const response = await fetch(emoteUrl);
        
        if (!response.ok) {
            console.error(`❌ Failed to fetch emote ${emoteId}: ${response.status}`);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: 'Failed to fetch emote' }),
            };
        }
        
        // Get the content type from the original response
        const contentType = response.headers.get('content-type') || 'image/gif';
        
        // Get the image data
        const buffer = await response.arrayBuffer();
        
        console.log(`✅ Successfully proxied emote ${emoteId}`);
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
            body: Buffer.from(buffer).toString('base64'),
            isBase64Encoded: true,
        };
        
    } catch (error) {
        console.error(`❌ Error proxying emote:`, error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
