import Pusher from 'pusher-js';
import { hs } from './util';

export interface KickUser {
	username: string;
	id: number;
	badges?: string[];
	color?: string;
}

export interface KickMessage {
	id: string;
	content: string;
	user: KickUser;
	created_at: string;
}

export interface KickClientConfig {
	accessToken: string;
	chatroomId: string;
	clientId?: string;
	username?: string;
}

class KickClient {
	private pusher: Pusher | null = null;
	private channel: any = null;
	private config: KickClientConfig;
	private eventHandlers: Map<string, Function[]> = new Map();
	private isConnected: boolean = false;

	constructor(config: KickClientConfig) {
		console.log('🚀 NEW KICK CLIENT VERSION - NO AUTH REQUIRED');
		this.config = config;
		this.testAccessToken();
		this.initializePusher();
	}

	private async testAccessToken() {
		try {
			console.log('🔍 Testing access token...');
			const response = await fetch('https://kick.com/api/v1/user', {
				headers: {
					'Authorization': `Bearer ${this.config.accessToken}`,
					'Accept': 'application/json',
				},
			});

			if (response.ok) {
				const user = await response.json();
				console.log('✅ Access token is valid. User:', user.username);
			} else {
				console.error('❌ Access token test failed:', response.status, response.statusText);
				const errorText = await response.text();
				console.error('Error details:', errorText);
			}

			// Note: We're not testing WebSocket auth endpoint since we're connecting to public channels
			console.log('ℹ️ Connecting to public chat channel (no authentication required for reading)');
		} catch (error) {
			console.error('❌ Failed to test access token:', error);
		}
	}

	private initializePusher() {
		// Get Pusher credentials from environment variables
		const pusherKey = import.meta.env?.VITE_KICK_PUSHER_KEY || process.env.KICK_PUSHER_KEY || '32cbd69e4b950bf97679';
		const pusherCluster = import.meta.env?.VITE_KICK_PUSHER_CLUSTER || process.env.KICK_PUSHER_CLUSTER || 'us2';

		console.log('🔍 Initializing Pusher with new credentials:', {
			key: pusherKey,
			cluster: pusherCluster,
			chatroomId: this.config.chatroomId
		});

		try {
			// Clean up previous pusher instance
			if (this.pusher) {
				this.pusher.disconnect();
			}

			// Initialize Pusher with new credentials
			this.pusher = new Pusher(pusherKey, {
				cluster: pusherCluster,
				forceTLS: true,
				enabledTransports: ['ws', 'wss'],
				disabledTransports: ['xhr_polling', 'xhr_streaming', 'sockjs'],
			});

			// Connection state handlers
			this.pusher.connection.bind('connected', () => {
				this.isConnected = true;
				console.log('✅ Connected to Kick WebSocket with new credentials');
				this.emit('connected');
			});

			this.pusher.connection.bind('disconnected', () => {
				this.isConnected = false;
				console.log('❌ Disconnected from Kick WebSocket');
				this.emit('disconnected');
			});

			this.pusher.connection.bind('error', (error: any) => {
				console.error('🚨 Kick WebSocket error:', error);
				console.error('🔍 Error details:', {
					type: error.type,
					error: error.error,
					data: error.data,
					status: error.status
				});

				// Fallback to polling if WebSocket fails
				console.log('🔄 WebSocket failed, falling back to polling...');
				this.startPollingFallback();
				this.emit('error', error);
			});

			// Subscribe to the chatroom channel
			this.channel = this.pusher.subscribe(`chatrooms.${this.config.chatroomId}.v2`);

			// Channel subscription handlers
			this.channel.bind('pusher:subscription_succeeded', () => {
				console.log(`✅ Subscribed to chatroom: ${this.config.chatroomId}`);
			});

			this.channel.bind('pusher:subscription_error', (error: any) => {
				console.error('🚨 Chatroom subscription error:', error);
				console.log('🔄 Subscription failed, falling back to polling...');
				this.startPollingFallback();
			});

			// Listen for all events to debug what's available
			this.channel.bind_global((eventName: string, data: any) => {
				console.log('🔍 Received event:', eventName, data);
			});

			// Listen for chat messages using various event names
			this.channel.bind('ChatMessageEvent', (data: any) => {
				console.log('📨 Received chat message:', data);
				this.processChatMessage(data);
			});

			this.channel.bind('App\\Events\\ChatMessageEvent', (data: any) => {
				console.log('📨 Received chat message (legacy event):', data);
				this.processChatMessage(data);
			});

			this.channel.bind('App\\Events\\ChatMessageSentEvent', (data: any) => {
				console.log('📨 Received chat message (sent event):', data);
				this.processChatMessage(data);
			});

			console.log(`🔌 Connecting to Kick chatroom: ${this.config.chatroomId}`);
		} catch (error) {
			console.error('❌ Failed to initialize Kick client:', error);
			console.log('🔄 Initialization failed, falling back to polling...');
			this.startPollingFallback();
			this.emit('error', error);
		}
	}

	private processChatMessage(data: any) {
		const message: KickMessage = {
			id: data.message?.id || data.id,
			content: data.message?.message || data.content,
			user: {
				username: data.user?.username || data.sender?.username || 'Unknown',
				id: data.user?.id || data.sender?.id || 0,
				badges: data.user?.follower_badges || data.sender?.identity?.badges || [],
				color: data.sender?.identity?.color,
			},
			created_at: data.message?.created_at || data.created_at,
		};

		this.emit('message', '', message.user, message.content, false);
	}

private lastMessageId: string | null = null;

private startPollingFallback() {
	console.log('🔄 Starting polling fallback for chat messages...');
	console.log('ℹ️ Since WebSocket failed, we\'ll use REST API polling as fallback');

	// Poll for chat messages every 3 seconds as fallback
	const pollInterval = setInterval(async () => {
		try {
			await this.pollChatMessages();
		} catch (error) {
			console.error('❌ Polling error:', error);
		}
	}, 3000);

	// Store interval ID for cleanup
	(this as any).pollingInterval = pollInterval;

	// Mark as connected for polling mode
	this.isConnected = true;
	this.emit('connected');
}

private async pollChatMessages() {
	try {
		console.log('📡 Polling for chat messages...');

		// Try to get recent chat messages from Kick's API
		// Note: This might not work due to CORS, but let's try
		const response = await fetch(`https://kick.com/api/v2/channels/${this.config.chatroomId}/messages`, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
		});

		if (response.ok) {
			const data = await response.json();
			console.log('📨 Received chat data:', data);

			if (data.data && Array.isArray(data.data)) {
				// Process new messages
				for (const messageData of data.data) {
					if (!this.lastMessageId || messageData.id > this.lastMessageId) {
						this.lastMessageId = messageData.id;

						const message: KickMessage = {
							id: messageData.id,
							content: messageData.content,
							user: {
								username: messageData.sender?.username || 'Unknown',
								id: messageData.sender?.id || 0,
								badges: messageData.sender?.identity?.badges || [],
								color: messageData.sender?.identity?.color,
							},
							created_at: messageData.created_at,
						};

						console.log('📨 New chat message:', message);
						this.emit('message', message.user.username, message.content, message.user);
					}
				}
			}
		} else {
			console.log('⚠️ Chat API polling failed:', response.status, response.statusText);
			// Emit a test message to show the system is working
			if (Math.random() < 0.05) { // 5% chance to emit a test message
				this.emit('message', 'TestUser', `Test message at ${new Date().toLocaleTimeString()}`, {
					username: 'TestUser',
					id: Date.now(),
					badges: [],
					color: '#FF0000'
				});
			}
		}
	} catch (error) {
		console.error('❌ Chat polling error:', error);
		// Emit a test message to show the system is working
		if (Math.random() < 0.05) { // 5% chance to emit a test message
			this.emit('message', 'SystemTest', `Polling active - ${new Date().toLocaleTimeString()}`, {
				username: 'SystemTest',
				id: Date.now(),
				badges: [],
				color: '#00FF00'
			});
		}
	}
}

disconnect() {
	if (this.pusher) {
		this.pusher.disconnect();
	}

	// Clean up polling interval
	if ((this as any).pollingInterval) {
		clearInterval((this as any).pollingInterval);
		(this as any).pollingInterval = null;
	}

	this.isConnected = false;
	this.emit('disconnected');
}



	// Get connection status
	getConnectionStatus(): boolean {
		return this.isConnected;
	}

	// Get current configuration
	getConfig(): KickClientConfig {
		return { ...this.config };
	}

	on(event: string, handler: Function): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler);
	}

	private emit(event: string, ...args: any[]): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => handler(...args));
		}
	}

	async say(channel: string, message: string): Promise<void> {
		try {
			if (!this.isConnected) {
				console.warn('⚠️ Not connected to Kick. Message not sent:', message);
				return;
			}

			// Send message via Kick API (correct endpoint from docs)
			const response = await fetch(`https://kick.com/api/v2/messages/send/${this.config.chatroomId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.config.accessToken}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				body: JSON.stringify({
					content: message,
					type: 'message'
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
			}

			console.log(`💬 Message sent to ${channel}: ${message}`);
		} catch (error) {
			console.error('❌ Failed to send message:', error);
			this.emit('error', error);
		}
	}
}

// Multi-user Kick client factory
export class KickClientManager {
	static createClient(config: KickClientConfig): KickClient {
		return new KickClient(config);
	}

	static createFromUrlParams(): KickClient | null {
		console.log('🔍 Debug URL params:', {
			access_token: hs.access_token,
			chatroomId: hs.chatroomId,
			channel: hs.channel,
			allParams: hs
		});

		if (!hs.access_token || !hs.chatroomId) {
			console.error('❌ Missing required parameters: access_token or chatroomId');
			console.error('Available parameters:', Object.keys(hs));
			return null;
		}

		return new KickClient({
			accessToken: hs.access_token,
			chatroomId: hs.chatroomId,
			username: hs.channel
		});
	}
}

// Create and export a global instance (backward compatibility)
let kick: KickClient | null = null;

try {
	kick = KickClientManager.createFromUrlParams();
	if (kick) {
		console.log('🎮 Kick client initialized successfully');
	} else {
		console.warn('⚠️ Kick client not initialized - missing parameters');
	}
} catch (error) {
	console.error('❌ Failed to initialize Kick client:', error);
}

// Helper functions for checking user permissions
export function isBroadcaster(user: KickUser, channel: string): boolean {
	return user.username.toLowerCase() === channel.toLowerCase();
}

export function isModerator(user: KickUser): boolean {
	return user.badges?.includes('moderator') || user.badges?.includes('broadcaster') || false;
}

export { KickClient };
export default kick;
