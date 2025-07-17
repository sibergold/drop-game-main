// Central OAuth Configuration
// This file contains the centralized settings for streamlined OAuth

export const CENTRAL_OAUTH_CONFIG = {
	// Replace this with your actual centralized Kick application Client ID
	// This should be a single application that all streamers will use
	CLIENT_ID: import.meta.env.VITE_CENTRAL_CLIENT_ID || import.meta.env.CENTRAL_CLIENT_ID || 'YOUR_CENTRAL_CLIENT_ID_HERE',
	
	// OAuth settings
	OAUTH_SETTINGS: {
		response_type: 'code', // Using authorization code flow with PKCE
		scope: 'chat:read chat:write user:read channel:read',
		authorize_url: import.meta.env.VITE_KICK_OAUTH_BASE_URL || 'https://id.kick.com/oauth/authorize',
		token_url: import.meta.env.VITE_KICK_TOKEN_URL || 'https://id.kick.com/oauth/token',
		api_base: import.meta.env.VITE_KICK_API_BASE_URL || 'https://kick.com/api/v2',
		proxy_url: (() => {
			// Check if we're running on localhost (development environment)
			const isLocalhost = window.location.hostname === 'localhost';

			if (isLocalhost) {
				// Use local proxy server for localhost development
				return import.meta.env.VITE_OAUTH_PROXY_URL_DEV || 'http://localhost:3001';
			} else {
				// Use Netlify functions for deployed environment
				return import.meta.env.VITE_OAUTH_PROXY_URL_PROD || 'https://render-proxy-production-9134.up.railway.app'
			}
		})()
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

// PKCE helper functions
function generateRandomString(length: number): string {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return await crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
	const codeVerifier = generateRandomString(128);
	const hashed = await sha256(codeVerifier);
	const codeChallenge = base64URLEncode(hashed);
	return { codeVerifier, codeChallenge };
}

// Helper function to check if central config is properly set up
export function isCentralConfigValid(): boolean {
	return CENTRAL_OAUTH_CONFIG.CLIENT_ID !== 'YOUR_CENTRAL_CLIENT_ID_HERE' &&
		   CENTRAL_OAUTH_CONFIG.CLIENT_ID.length > 0;
}

// Helper function to build OAuth URL with PKCE
export async function buildCentralOAuthUrl(redirectUri: string): Promise<string> {
	if (!isCentralConfigValid()) {
		throw new Error('Central Client ID not configured');
	}

	// Generate PKCE parameters
	const { codeVerifier, codeChallenge } = await generatePKCE();

	// Store code verifier in session storage for later use
	sessionStorage.setItem('kick_oauth_code_verifier', codeVerifier);

	// Generate state parameter for security
	const state = generateRandomString(32);
	sessionStorage.setItem('kick_oauth_state', state);

	const params = new URLSearchParams({
		client_id: CENTRAL_OAUTH_CONFIG.CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.response_type,
		scope: CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.scope,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		state: state
	});

	return `${CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.authorize_url}?${params.toString()}`;
}

// Helper function to exchange authorization code for access token via proxy
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
	console.log('🔄 Starting token exchange via proxy...');
	console.log('Code:', code);
	console.log('Redirect URI:', redirectUri);

	const codeVerifier = sessionStorage.getItem('kick_oauth_code_verifier');
	console.log('Code verifier found:', !!codeVerifier);

	if (!codeVerifier) {
		throw new Error('Code verifier not found in session storage');
	}

	const requestBody = {
		code: code,
		redirect_uri: redirectUri,
		code_verifier: codeVerifier
	};

	const proxyEndpoint = `${CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.proxy_url}/oauth/exchange`

	console.log('Proxy request body:', requestBody);
	console.log('Proxy endpoint:', proxyEndpoint);

	const response = await fetch(proxyEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody)
	});

	console.log('Proxy response status:', response.status);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
		console.error('Proxy token exchange error:', errorData);
		throw new Error(`Token exchange failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
	}

	const data = await response.json();
	console.log('Token exchange successful via proxy');

	// Clean up session storage
	sessionStorage.removeItem('kick_oauth_code_verifier');
	sessionStorage.removeItem('kick_oauth_state');

	return data.access_token;
}



// Helper function to get user info from Kick API
export async function fetchKickUserInfo(accessToken: string): Promise<any> {
	try {
		console.log('🔄 Fetching user info from Kick API...');
		console.log('Access token:', accessToken ? 'YES' : 'NO');

		const isLocalhost = window.location.hostname === 'localhost';

		if (!isLocalhost) {
			// Production: Render proxy fonksiyonu üzerinden fetch
			const response = await fetch('https://render-proxy-production-9134.up.railway.app/get-kick-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ access_token: accessToken })
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Render get-kick-user error:', errorText);
				throw new Error(`get-kick-user failed: ${response.status} - ${errorText}`);
			}

			const userData = await response.json();
			console.log('User data received from Render function:', userData);
			return userData;
		}

		// Local: Doğrudan Kick API'ye fetch (eski davranış)
		// Try multiple API endpoints as Kick API structure might vary
		const endpoints = [
			'https://api.kick.com/public/v1/users', // New official API
			`${CENTRAL_OAUTH_CONFIG.OAUTH_SETTINGS.api_base}/user`,
			'https://kick.com/api/v1/user',
			'https://kick.com/api/v2/user/me',
			'https://kick.com/api/v1/user/me'
		];

		let lastError: Error | null = null;

		for (const endpoint of endpoints) {
			try {
				console.log('Trying API endpoint:', endpoint);

				const response = await fetch(endpoint, {
					headers: {
						'Authorization': `Bearer ${accessToken}`,
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					}
				});

				console.log(`API response status for ${endpoint}:`, response.status);
				console.log('API response headers:', Object.fromEntries(response.headers.entries()));

				if (!response.ok) {
					const errorText = await response.text();
					console.error(`API error response from ${endpoint}:`, errorText);
					lastError = new Error(`API request failed: ${response.status} - ${errorText}`);
					continue; // Try next endpoint
				}

				// Check if response is actually JSON
				const contentType = response.headers.get('content-type');
				console.log('Response content-type:', contentType);

				if (!contentType || !contentType.includes('application/json')) {
					const responseText = await response.text();
					console.error(`Non-JSON response from ${endpoint}:`, responseText.substring(0, 200));
					lastError = new Error(`Expected JSON response but got: ${contentType}. Response: ${responseText.substring(0, 200)}`);
					continue; // Try next endpoint
				}

				const userData = await response.json();
				console.log('User data received from', endpoint, ':', userData);

				// Handle new API format vs old API format
				if (endpoint.includes('api.kick.com/public/v1/users')) {
					// New API returns data in array format
					if (userData.data && Array.isArray(userData.data) && userData.data.length > 0) {
						const user = userData.data[0];
						console.log('🔄 Getting chatroom ID for user:', user.name);

						// Get chatroom ID from old API
						let chatroomId = null;
						try {
							const channelResponse = await fetch(`https://kick.com/api/v1/channels/${user.name}`, {
								headers: {
									'Accept': 'application/json',
									'Content-Type': 'application/json'
								}
							});

							if (channelResponse.ok) {
								const channelData = await channelResponse.json();
								chatroomId = channelData.chatroom?.id;
								console.log('Chatroom ID found:', chatroomId);
							}
						} catch (error) {
							console.warn('Could not get chatroom ID:', error);
						}

						// Convert to old format for compatibility
						return {
							id: user.user_id,
							username: user.name,
							email: user.email,
							profile_picture: user.profile_picture,
							chatroom: { id: chatroomId }
						};
					}
				}

				return userData;

			} catch (error) {
				console.error(`Error with endpoint ${endpoint}:`, error);
				lastError = error instanceof Error ? error : new Error(String(error));
				continue; // Try next endpoint
			}
		}

		// If we get here, all endpoints failed
		throw lastError || new Error('All API endpoints failed');

	} catch (error) {
		console.error('Failed to fetch user info:', error);
		throw error;
	}
}