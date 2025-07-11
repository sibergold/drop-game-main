import Phaser, { Game as PhaserGame } from "phaser";
import constants from "./constants";
import emitter from "./emitter";
import Game from "./game";
import kick, { isBroadcaster, isModerator, KickUser } from "./kick";
import { hs } from "./util";


if (!Object.hasOwnProperty.call(hs, "oauth"))
	window.location.href = '/oauth.html';

if (hs.demo) document.body.classList.add("demo");

new PhaserGame({
	audio: {
		disableWebAudio: true,
	},
	height: constants.SCREEN_HEIGHT,
	physics: {
		default: "arcade",
		arcade: {
			debug: false,
			gravity: {
				y: hs.gravity || constants.GRAVITY,
			},
		},
	},
	pixelArt: true,
	render: {
		transparent: true,
	},
	scale: {
		autoCenter: Phaser.Scale.CENTER_BOTH,
		mode: Phaser.Scale.FIT,
	},
	scene: [Game],
	type: Phaser.AUTO,
	width: constants.SCREEN_WIDTH,
});

const commandRgx = /^(![-_.a-z0-9]+)(?:\s+(.+))?$/i;

// Check if kick client is available before setting up event listeners
if (kick) {
	kick.on(
		"message",
		(_: string, user: KickUser, message: string, self: boolean) => {
		const cmd = commandRgx.exec(message);

		if (self || !cmd) return;

		const command = cmd[1].toLowerCase().substring(1);
		const args = cmd[2];

		// TODO: command timeouts

		switch (command) {
			case "clearscores": {
				if (!isBroadcaster(user, hs.channel) && !isModerator(user)) return;

				const who = args ? args.split(" ").map((v) => v.toLowerCase()) : null;

				emitter.emit("clearscores", who);
				break;
			}
			case "commands":
			case "help":
				if (kick) {
					kick.say(
						hs.channel,
						`@${user.username} -> !drop, !droprecent, !droptop, !droplow, !clearscores, !queuedrop, !resetdrop, !startdrop`,
					);
				}
				break;
			case "drop": {
				// Kick doesn't have emotes in the same format as Twitch
				// We'll extract emotes from the message text if needed
				let emote: string | undefined = undefined;
				
				// Simple emote detection - you can enhance this
				const emoteMatch = args?.match(/\b\w+\b/);
				if (emoteMatch) {
					emote = emoteMatch[0];
				}

				emitter.emit("drop", user.username, false, emote);
				break;
			}
			case "droplow":
				emitter.emit("droplow");
				break;
			case "droptop":
				emitter.emit("droptop");
				break;
			case "droprecent":
				emitter.emit("droprecent");
				break;
			case "queuedrop":
				if (!isBroadcaster(user, hs.channel) && !isModerator(user)) return;

				emitter.emit("queuedrop", args ? parseInt(args) : null);
				break;
			case "resetdrop":
				if (!isBroadcaster(user, hs.channel) && !isModerator(user)) return;

				emitter.emit("resetdrop");
				break;
			case "startdrop":
				if (!isBroadcaster(user, hs.channel) && !isModerator(user)) return;

				emitter.emit("startdrop");
				break;
		}
		},
	);
}



// Initialize the application
function initializeApp(): void {
	if (!kick) {
		console.error('❌ Kick client not initialized. Please check your OAuth parameters.');
		// Show error message to user
		const errorDiv: HTMLDivElement = document.createElement('div');
		errorDiv.innerHTML = `
			<div style="
				position: fixed;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background: #ff4444;
				color: white;
				padding: 20px;
				border-radius: 10px;
				text-align: center;
				font-family: Arial, sans-serif;
				z-index: 9999;
			">
				<h3>🚨 Kick Connection Error</h3>
				<p>Missing required OAuth parameters.</p>
				<p>Please go back to the OAuth page and complete the authorization process.</p>
				<button onclick="window.location.href='/oauth.html'" style="
					background: white;
					color: #ff4444;
					border: none;
					padding: 10px 20px;
					border-radius: 5px;
					cursor: pointer;
					font-weight: bold;
					margin-top: 10px;
				">Go to OAuth</button>
			</div>
		`;
		document.body.appendChild(errorDiv);
		return;
	}

	// Log connection info
	console.log('🎮 Kick Drop Game Starting...');
	console.log('📺 Channel:', hs.channel);
	console.log('💬 Chatroom ID:', hs.chatroomId);

	// Set up connection event handlers
	kick.on('connected', () => {
		console.log('✅ Successfully connected to Kick chat!');
	});

	kick.on('disconnected', () => {
		console.log('❌ Disconnected from Kick chat');
	});

	kick.on('error', (error: any) => {
		console.error('🚨 Kick connection error:', error);
	});

	console.log('🔌 Connecting to Kick chat...');
	// Kick client automatically connects when initialized
}

// Initialize the application
initializeApp();
