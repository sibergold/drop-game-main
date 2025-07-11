// Central OAuth Configuration
// This file contains the centralized settings for streamlined OAuth

export const CENTRAL_OAUTH_CONFIG = {
	// Replace this with your actual centralized Kick application Client ID
	// This should be a single application that all streamers will use
	CLIENT_ID: import.meta.env.VITE_CENTRAL_CLIENT_ID || import.meta.env.CENTRAL_CLIENT_ID || 'YOUR_CENTRAL_CLIENT_ID_HERE',
	
	// OAuth settings
	OAUTH_SETTINGS: {
		response_type: 'token', // Using implicit flow for client-side simplicity
		scope: 'chat:read chat:write',
		authorize_url: import.meta.env.VITE_KICK_OAUTH_BASE_URL || 'https://kick.com/oauth2/authorize',
		api_base: import.meta.env.VITE_KICK_API_BASE_URL || 'https://kick.com/api/v2'
	},
	
	// Default game settings that streamers can override
	DEFAULT_GAME_SETTINGS: {
		gravity: 400,
		gravity_chute: 60,
		max_velocity: 600,
		wait: 60
	},
	
	// UI Configuration
	UI_CONFIG: {
		theme: {
			primary_color: '#00ff88',
			secondary_color: '#9146ff',
			gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
		},
		messages: {
			success: '✅ Authorization successful! Your overlay is ready.',
			error_no_client_id: '⚠️ Central Client ID not configured. Please contact the developer.',
			error_auth_failed: 'Authorization failed. Please try again.',
			error_no_chatroom: 'No chatroom found for this channel. Make sure you have streaming permissions.',
			loading: '🔄 Connecting to Kick...',
			copied: '✅ Copied!'
		}
	},
	
	// OBS Integration settings
	OBS_CONFIG: {
		default_width: 1920,
		default_height: 1080,
		source_name: 'Kick Drop Game',
		deep_link_protocol: 'obs://'
	}
};

// Helper function to check if central config is properly set up
export function isCentralConfigValid(): boolean {
	return CENTRAL_OAUTH_CONFIG.CLIENT_ID !== 'YOUR_CENTRAL_CLIENT_ID_HERE' && 
		   CENTRAL_OAUTH_CONFIG.CLIENT_ID.length > 0;
}

// Helper function to build OAuth URL
export function buildCentralOAuthUrl(redirectUri: string): string {
	if (!isCentralConfigValid()) {
		throw new Error('Central Client ID not configured');
	}
	
	const params = new URLSearchParams({
		client_id: CENTRAL_OAUTH_CONFIG.CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.response_type,
		scope: CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.scope
	});
	
	return `${CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.authorize_url}?${params.toString()}`;
}

// Helper function to get user info from Kick API
export async function fetchKickUserInfo(accessToken: string): Promise<any> {
	try {
		const response = await fetch(`${CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.api_base}/user`, {
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Failed to fetch user info:', error);
		throw error;
	}
}