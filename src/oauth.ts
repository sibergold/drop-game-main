import { hs } from "./util";

// Multi-user OAuth system for Kick Drop Game
class KickOAuthManager {
	private clientId: string = '';
	private errorDiv: HTMLElement;
	private authorizeBtn: HTMLButtonElement;
	private clientIdInput: HTMLInputElement;

	constructor() {
		this.errorDiv = document.getElementById('error-message') as HTMLElement;
		this.authorizeBtn = document.getElementById('authorize-btn') as HTMLButtonElement;
		this.clientIdInput = document.getElementById('client_id') as HTMLInputElement;
		
		this.init();
	}

	private init() {
		// Check if we're returning from OAuth
		if (hs.code || hs.access_token) {
			this.handleOAuthReturn();
			return;
		}

		// Load saved client ID
		const savedClientId = localStorage.getItem('kick_client_id');
		if (savedClientId) {
			this.clientIdInput.value = savedClientId;
			this.clientId = savedClientId;
			this.authorizeBtn.disabled = false;
		}

		// Setup event listeners
		this.clientIdInput.addEventListener('input', () => {
			this.clientId = this.clientIdInput.value.trim();
			this.authorizeBtn.disabled = !this.clientId;
			
			// Save client ID
			if (this.clientId) {
				localStorage.setItem('kick_client_id', this.clientId);
			}
		});

		this.authorizeBtn.addEventListener('click', () => {
			this.startOAuthFlow();
		});
	}

	private async handleOAuthReturn() {
		try {
			let accessToken = hs.access_token;
			
			// If we have a code, exchange it for access token
			if (hs.code && !accessToken) {
				accessToken = await this.exchangeCodeForToken(hs.code);
			}

			if (!accessToken) {
				throw new Error('No access token received');
			}

			// Get user info from Kick API
			const user = await fetch("https://kick.com/api/v1/user", {
				headers: new Headers({
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				}),
			})
				.then((r) => r.json())
				.catch(() => ({ username: 'unknown' }));

			// Get chatroom ID for the channel
			const channelInfo = await fetch(`https://kick.com/api/v1/channels/${user.username}`, {
				headers: new Headers({
					"Content-Type": "application/json",
				}),
			})
				.then((r) => r.json())
				.catch(() => ({ chatroom: { id: 'unknown' } }));

			// Build overlay URL with all parameters
			const overlayUrl = this.buildOverlayUrl(accessToken, user.username, channelInfo.chatroom?.id || user.username);
			
			// Redirect to overlay
			window.location.href = overlayUrl;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.showError(`OAuth error: ${errorMessage}`);
			console.error('OAuth error:', error);
		}
	}

	private async exchangeCodeForToken(_code: string): Promise<string | null> {
		// Note: This would typically be done on a backend server
		// For client-side implementation, we'll use the implicit flow instead
		console.warn('Code exchange not implemented for client-side. Use implicit flow.');
		return null;
	}

	private startOAuthFlow() {
		if (!this.clientId) {
			this.showError('Please enter your Kick Client ID');
			return;
		}

		// Build OAuth URL
		const redirectUri = encodeURIComponent(window.location.href);
		const oauthUrl = 
			`https://kick.com/oauth2/authorize` +
			`?client_id=${this.clientId}` +
			`&redirect_uri=${redirectUri}` +
			`&response_type=token` + // Use implicit flow for client-side
			`&scope=chat:read%20chat:write`;

		// Redirect to Kick OAuth
		window.location.href = oauthUrl;
	}

	private buildOverlayUrl(accessToken: string, channel: string, chatroomId: string): string {
		let url = `index.html#access_token=${accessToken}&channel=${channel}&chatroomId=${chatroomId}`;
		
		// Add game options
		["gravity", "gravity_chute", "max_velocity", "wait"].forEach((option) => {
			const input = document.getElementById(option) as HTMLInputElement;
			const value = input?.value;

			if (value) {
				url += `&${option}=${encodeURIComponent(value)}`;
			}
		});

		return url;
	}

	private showError(message: string) {
		this.errorDiv.textContent = message;
		this.errorDiv.style.display = 'block';
		
		// Hide error after 5 seconds
		setTimeout(() => {
			this.errorDiv.style.display = 'none';
		}, 5000);
	}
}

// Initialize the OAuth manager when DOM is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => new KickOAuthManager());
} else {
	new KickOAuthManager();
}
