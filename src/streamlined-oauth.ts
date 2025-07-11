import { hsWithQuery as hs } from "./util";
import { CENTRAL_OAUTH_CONFIG, isCentralConfigValid, buildCentralOAuthUrl, fetchKickUserInfo, exchangeCodeForToken } from "./central-config";

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
		console.log('StreamlinedKickOAuth constructor called');
		
		this.errorDiv = document.getElementById('error-message') as HTMLElement;
		this.successDiv = document.getElementById('success-message') as HTMLElement;
		this.quickAuthorizeBtn = document.getElementById('quick-authorize-btn') as HTMLButtonElement;
		this.setupSection = document.getElementById('setup-section') as HTMLElement;
		this.resultSection = document.getElementById('result-section') as HTMLElement;
		this.overlayUrlDiv = document.getElementById('overlay-url') as HTMLElement;
		this.copyUrlBtn = document.getElementById('copy-url-btn') as HTMLButtonElement;
		this.openObsBtn = document.getElementById('open-obs-btn') as HTMLButtonElement;
		
		console.log('DOM elements found:', {
			errorDiv: !!this.errorDiv,
			successDiv: !!this.successDiv,
			quickAuthorizeBtn: !!this.quickAuthorizeBtn,
			setupSection: !!this.setupSection,
			resultSection: !!this.resultSection,
			overlayUrlDiv: !!this.overlayUrlDiv,
			copyUrlBtn: !!this.copyUrlBtn,
			openObsBtn: !!this.openObsBtn
		});
		
		this.init();
	}

	private init() {
		console.log('StreamlinedKickOAuth init() called');
		console.log('CLIENT_ID:', CENTRAL_OAUTH_CONFIG.CLIENT_ID);
		console.log('isCentralConfigValid():', isCentralConfigValid());
		
		// Check if we're returning from OAuth
		if (hs.code) {
			console.log('OAuth return detected:', { code: hs.code, state: hs.state });
			this.handleOAuthReturn();
			return;
		}

		// Setup event listeners
		console.log('Setting up event listeners');
		this.quickAuthorizeBtn.addEventListener('click', () => {
			console.log('Quick authorize button clicked');
			this.startStreamlinedOAuth();
		});
		this.copyUrlBtn.addEventListener('click', () => this.copyOverlayUrl());
		this.openObsBtn.addEventListener('click', () => this.openInOBS());
		
		// Check if central client ID is configured
		if (!isCentralConfigValid()) {
			console.log('Central config is invalid');
			this.showError(CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.error_no_client_id);
			this.quickAuthorizeBtn.disabled = true;
		} else {
			console.log('Central config is valid, button should be enabled');
		}
	}

	private async handleOAuthReturn() {
		try {
			console.log('🔄 Handling OAuth return...');
			console.log('URL params:', hs);

			// Verify state parameter for security
			const storedState = sessionStorage.getItem('kick_oauth_state');
			console.log('Stored state:', storedState);
			console.log('Received state:', hs.state);

			if (hs.state && storedState && hs.state !== storedState) {
				throw new Error('Invalid state parameter - possible CSRF attack');
			}

			// Exchange authorization code for access token via proxy
			const code = hs.code;
			console.log('Authorization code:', code ? 'YES' : 'NO');

			if (!code) {
				throw new Error('No authorization code received');
			}

			const accessToken = await exchangeCodeForToken(code, window.location.href.split('?')[0]);
			console.log('Access token received:', accessToken ? 'YES' : 'NO');

			if (!accessToken) {
				throw new Error('Failed to exchange code for access token');
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

			// Clean up URL parameters and redirect back to clean page
			setTimeout(() => {
				console.log('🔄 Cleaning up URL and redirecting...');
				const cleanUrl = window.location.href.split('?')[0];
				window.history.replaceState({}, document.title, cleanUrl);
			}, 2000); // Give user time to see the success message

		} catch (error) {
			console.error('OAuth error:', error);
			this.showError(`Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

			// Clean up URL parameters on error too
			setTimeout(() => {
				console.log('🔄 Cleaning up URL after error...');
				const cleanUrl = window.location.href.split('?')[0];
				window.history.replaceState({}, document.title, cleanUrl);
			}, 3000);
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

	private async startStreamlinedOAuth() {
		console.log('startStreamlinedOAuth() called');

		if (!isCentralConfigValid()) {
			console.log('Central config invalid in startStreamlinedOAuth');
			this.showError(CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.error_no_client_id);
			return;
		}

		try {
			console.log('Building OAuth URL...');
			// Build OAuth URL using central config (with PKCE)
			const oauthUrl = await buildCentralOAuthUrl(window.location.href.split('?')[0]);
			console.log('OAuth URL built:', oauthUrl);

			// Show loading state
			this.quickAuthorizeBtn.textContent = CENTRAL_OAUTH_CONFIG.UI_CONFIG.messages.loading;
			this.quickAuthorizeBtn.disabled = true;

			// Redirect to Kick OAuth
			console.log('Redirecting to OAuth URL...');
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
console.log('Document ready state:', document.readyState);
if (document.readyState === 'loading') {
	console.log('Document still loading, waiting for DOMContentLoaded');
	document.addEventListener('DOMContentLoaded', () => {
		console.log('DOMContentLoaded event fired, initializing StreamlinedKickOAuth');
		new StreamlinedKickOAuth();
	});
} else {
	console.log('Document already loaded, initializing StreamlinedKickOAuth immediately');
	new StreamlinedKickOAuth();
}

export { StreamlinedKickOAuth };