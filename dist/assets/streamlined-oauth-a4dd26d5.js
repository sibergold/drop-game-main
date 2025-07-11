import { hs } from "./util";
import { CENTRAL_OAUTH_CONFIG, isCentralConfigValid, buildCentralOAuthUrl, fetchKickUserInfo } from "./central-config";

// Streamlined OAuth system with centralized Client ID
class StreamlinedKickOAuth {
	
	private errorDiv: HTMLElement;
	private successDiv: HTMLElement;
	private quickAuthorizeBtn: HTMLButtonElement;
	private setupSection: HTMLElement;
	private resultSection: HTMLElement;
	private overlayUrlDiv: HTMLElement;
	private copyUrlBtn: HTMLButtonElement;
	private openObsBtn: HTMLButtonElement;

	constructor() {
		this.errorDiv = document.getElementById('error-message') as HTMLElement;
		this.successDiv = document.getElementById('success-message') as HTMLElement;
		this.quickAuthorizeBtn = document.getElementById('quick-authorize-btn') as HTMLButtonElement;
		this.setupSection = document.getElementById('setup-section') as HTMLElement;
		this.resultSection = document.getElementById('result-section') as HTMLElement;
		this.overlayUrlDiv = document.getElementById('overlay-url') as HTMLElement;
		this.copyUrlBtn = document.getElementById('copy-url-btn') as HTMLButtonElement;
		this.openObsBtn = document.getElementById('open-obs-btn') as HTMLButtonElement;
		
		this.init();
	}

	private init() {
		// Check if we're returning from OAuth
		if (hs.code || hs.access_token) {
			this.handleOAuthReturn();
			return;
		}

		// Setup event listeners
		this.quickAuthorizeBtn.addEventListener('click', () => this.startStreamlinedOAuth());
		this.copyUrlBtn.addEventListener('click', () => this.copyOverlayUrl());
		this.openObsBtn.addEventListener('click', () => this.openInOBS());
		
		// Check if central client ID is configured
		if (!isCentralConfigValid()) {
			this.showError(CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.error_no_client_id);
			this.quickAuthorizeBtn.disabled = true;
		}
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

			// Get user info and channel details
			const userInfo = await fetchKickUserInfo(accessToken);
			if (!userInfo) {
				throw new Error('Failed to get user information');
			}

			const channel = userInfo.username;
			const chatroomId = userInfo.chatroom?.id;

			if (!chatroomId) {
				throw new Error(CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.error_no_chatroom);
			}

			// Build overlay URL
			const overlayUrl = this.buildOverlayUrl(accessToken, channel, chatroomId.toString());
			
			// Show success
			this.showSuccess(overlayUrl);
			
		} catch (error) {
			console.error('OAuth error:', error);
			this.showError(`Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async exchangeCodeForToken(code: string): Promise<string | null> {
		try {
			// Note: This requires a backend service to handle the token exchange
			// For client-side only, we use implicit flow (response_type=token)
			const response = await fetch('/api/oauth/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					code,
					client_id: CENTRAL_OAUTH_CONFIG.CLIENT_ID,
					redirect_uri: window.location.href
				})
			});

			if (!response.ok) {
				throw new Error('Token exchange failed');
			}

			const data = await response.json();
			return data.access_token;
		} catch (error) {
			console.error('Token exchange error:', error);
			return null;
		}
	}



	private buildOverlayUrl(accessToken: string, channel: string, chatroomId: string): string {
		let url = `${window.location.origin}/index.html#access_token=${accessToken}&channel=${channel}&chatroomId=${chatroomId}`;
		
		// Add game options if specified
		["gravity", "gravity_chute", "max_velocity", "wait"].forEach((option) => {
			const input = document.getElementById(option) as HTMLInputElement;
			const value = input?.value;
			if (value && value.trim()) {
				url += `&${option}=${encodeURIComponent(value)}`;
			}
		});

		return url;
	}

	private startStreamlinedOAuth() {
		if (!isCentralConfigValid()) {
			this.showError(CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.error_no_client_id);
			return;
		}

		try {
			// Build OAuth URL using central config
			const oauthUrl = buildCentralOAuthUrl(window.location.href);

			// Show loading state
			this.quickAuthorizeBtn.textContent = CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.loading;
			this.quickAuthorizeBtn.disabled = true;

			// Redirect to Kick OAuth
			window.location.href = oauthUrl;
		} catch (error) {
			console.error('OAuth start error:', error);
			this.showError(`Failed to start authorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private showSuccess(overlayUrl: string) {
		this.setupSection.style.display = 'none';
		this.resultSection.style.display = 'block';
		this.overlayUrlDiv.textContent = overlayUrl;
		
		this.successDiv.textContent = CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.success;
		this.successDiv.style.display = 'block';
		this.errorDiv.style.display = 'none';
	}

	private showError(message: string) {
		this.errorDiv.textContent = message;
		this.errorDiv.style.display = 'block';
		this.successDiv.style.display = 'none';
		
		// Reset button state
		this.quickAuthorizeBtn.textContent = '🚀 Start with Kick Authorization';
		this.quickAuthorizeBtn.disabled = !isCentralConfigValid();
	}

	private async copyOverlayUrl() {
		try {
			const url = this.overlayUrlDiv.textContent || '';
			await navigator.clipboard.writeText(url);
			
			// Visual feedback
			const originalText = this.copyUrlBtn.textContent;
			this.copyUrlBtn.textContent = CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.copied;
			this.copyUrlBtn.style.background = CENTRAL_OAUTH_CONFIG.UI_CONFIG.theme.primary_color;
			
			setTimeout(() => {
				this.copyUrlBtn.textContent = originalText;
				this.copyUrlBtn.style.background = '';
			}, 2000);
		} catch (error) {
			console.error('Copy failed:', error);
			this.showError('Failed to copy URL to clipboard');
		}
	}

	private openInOBS() {
		const url = this.overlayUrlDiv.textContent || '';
		
		// Create OBS Studio deep link
		const obsUrl = `${CENTRAL_OAUTH_CONFIG.OBS_CONFIG.deep_link_protocol}addsource/browser_source?url=${encodeURIComponent(url)}&width=${CENTRAL_OAUTH_CONFIG.OBS_CONFIG.default_width}&height=${CENTRAL_OAUTH_CONFIG.OBS_CONFIG.default_height}&name=${encodeURIComponent(CENTRAL_OAUTH_CONFIG.OBS_CONFIG.source_name)}`;
		
		try {
			// Try to open OBS deep link
			window.open(obsUrl, '_blank');
			
			// Show instructions as fallback
			setTimeout(() => {
				alert(`If OBS didn't open automatically:\n\n1. Open OBS Studio\n2. Add a new Browser Source\n3. Set URL to: ${url}\n4. Set Width: 1920, Height: 1080\n5. Uncheck "Shutdown source when not visible"`);
			}, 1000);
		} catch (error) {
			console.error('OBS open failed:', error);
			alert(`Manual OBS Setup:\n\n1. Open OBS Studio\n2. Add a new Browser Source\n3. Set URL to: ${url}\n4. Set Width: 1920, Height: 1080\n5. Uncheck "Shutdown source when not visible"`);
		}
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => new StreamlinedKickOAuth());
} else {
	new StreamlinedKickOAuth();
}

export { StreamlinedKickOAuth };