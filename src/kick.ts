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
		this.config = config;
		this.initializePusher();
	}

	private initializePusher() {
		try {
			// Initialize Pusher with Kick's configuration
			this.pusher = new Pusher(process.env.KICK_PUSHER_KEY || 'eb1d5f283081a78b932c', {
				cluster: process.env.KICK_PUSHER_CLUSTER || 'us2',
				forceTLS: true,
				authEndpoint: process.env.KICK_AUTH_ENDPOINT || 'https://kick.com/broadcasting/auth',
				auth: {
					headers: {
						Authorization: `Bearer ${this.config.accessToken}`,
						Accept: 'application/json',
					},
				},
			});

			// Connection state handlers
			this.pusher.connection.bind('connected', () => {
				this.isConnected = true;
				console.log('✅ Connected to Kick WebSocket');
				this.emit('connected');
			});

			this.pusher.connection.bind('disconnected', () => {
				this.isConnected = false;
				console.log('❌ Disconnected from Kick WebSocket');
				this.emit('disconnected');
			});

			this.pusher.connection.bind('error', (error: any) => {
				console.error('🚨 Kick WebSocket error:', error);
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
			});

			// Listen for chat messages
			this.channel.bind('App\\Events\\ChatMessageEvent', (data: any) => {
				const message: KickMessage = {
					id: data.id,
					content: data.content,
					user: {
						username: data.sender.username,
						id: data.sender.id,
						badges: data.sender.identity?.badges || [],
						color: data.sender.identity?.color,
					},
					created_at: data.created_at,
				};

				this.emit('message', message.user.username, message.content, message.user);
			});

			console.log(`🔌 Connecting to Kick chatroom: ${this.config.chatroomId}`);
		} catch (error) {
			console.error('❌ Failed to initialize Kick client:', error);
			this.emit('error', error);
		}
	}

	disconnect(): void {
		if (this.pusher) {
			this.pusher.disconnect();
			this.isConnected = false;
			console.log('🔌 Disconnected from Kick');
		}
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

			// Send message via Kick API
			const apiBase = process.env.KICK_API_BASE_URL || 'https://kick.com/api/v1';
			const response = await fetch(`${apiBase}/chat/${this.config.chatroomId}`, {
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
		if (!hs.access_token || !hs.chatroomId) {
			console.error('❌ Missing required parameters: access_token or chatroomId');
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
