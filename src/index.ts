import Phaser, { Game as PhaserGame } from "phaser";
import constants from "./constants";
import emitter from "./emitter";
import Game from "./game";
import kick, { isBroadcaster, isModerator, KickUser } from "./kick";
import { hs } from "./util";


// Check if we have access_token (overlay mode) or oauth (legacy mode)
if (!Object.hasOwnProperty.call(hs, "oauth") && !Object.hasOwnProperty.call(hs, "access_token"))
	window.location.href = '/streamlined-oauth.html';

if (hs.demo) document.body.classList.add("demo");

// Hide loading message when game starts
const hideLoadingMessage = () => {
	const gameContainer = document.getElementById('game-container');
	if (gameContainer) {
		gameContainer.style.display = 'none';
	}
};

const game = new PhaserGame({
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

// Hide loading message when Phaser is ready
game.events.once('ready', hideLoadingMessage);

const commandRgx = /^(![-_.a-z0-9]+)(?:\s+(.+))?$/i;

// Command cooldowns to prevent spam
const commandCooldowns = new Map<string, number>();
const COMMAND_COOLDOWN_MS = 3000; // 3 seconds

// Helper function to check command cooldown
function isOnCooldown(userId: number, command: string): boolean {
	const key = `${userId}-${command}`;
	const lastUsed = commandCooldowns.get(key) || 0;
	const now = Date.now();

	if (now - lastUsed < COMMAND_COOLDOWN_MS) {
		return true;
	}

	commandCooldowns.set(key, now);
	return false;
}

// Enhanced command handler
function handleChatCommand(user: KickUser, message: string, self: boolean) {
	const cmd = commandRgx.exec(message);
	if (self || !cmd) return;

	const command = cmd[1].toLowerCase().substring(1);
	const args = cmd[2];

	// Check cooldown for non-moderator commands
	if (!isBroadcaster(user, hs.channel) && !isModerator(user)) {
		if (isOnCooldown(user.id, command)) {
			return; // Silently ignore commands on cooldown
		}
	}

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
					`@${user.username} 🎮 Commands: !drop (join game), !drop koaladuru (koala character), !join (same as !drop), !droptop (top scores), !droplow (low scores), !droprecent (recent), !dropstats (your stats). Mods: !queuedrop, !startdrop, !resetdrop, !clearscores, !dropgame, !testkoala`,
				);
			}
			break;
		case "drop":
		case "join": {
			// Enhanced Kick emote detection
			let emote: string | undefined = undefined;

			if (args) {
				// Check for special koala command
				if (args.toLowerCase().includes("koaladuru")) {
					emote = "koala";
				} else {
					// Kick emote format: [emote:ID:name]
					const kickEmoteMatch = args.match(/\[emote:(\d+):(\w+)\]/);
					if (kickEmoteMatch) {
						const emoteId = kickEmoteMatch[1];
						const emoteName = kickEmoteMatch[2];
						emote = emoteName; // Use emote name as identifier


						// Store emote ID for the game to use real emote images
						emitter.emit("storeEmoteId", user.username, emoteName, emoteId);
					} else {
						// Fallback: look for any word (could be text emote)
						const textEmoteMatch = args.match(/\b\w+\b/);
						if (textEmoteMatch) {
							emote = textEmoteMatch[0];

						}
					}
				}
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
		case "dropstats": {
			// New command to show individual user stats
			emitter.emit("dropstats", user.username);
			break;
		}
		case "dropgame": {
			// New moderator command to show game status
			if (!isBroadcaster(user, hs.channel) && !isModerator(user)) return;
			emitter.emit("dropgame");
			break;
		}
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
		case "testkoala": {
			// Test command for koala character
			emitter.emit("drop", user.username, false, "koala");
			if (kick) {
				kick.say(hs.channel, `@${user.username} 🐨 Testing koala character!`);
			}
			break;
		}
	}
}

// Check if kick client is available before setting up event listeners
if (kick) {
	kick.on("message", (_: string, user: KickUser, message: string, self: boolean) => {
		handleChatCommand(user, message, self);
	});
}



// Initialize the application
function initializeApp(): void {
	if (!kick) {
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

	// Set up connection event handlers
	kick.on('connected', () => {
		// Successfully connected to Kick chat
	});

	kick.on('disconnected', () => {
		// Disconnected from Kick chat
	});

	kick.on('error', (error: any) => {
		// Kick connection error
	});

	// Kick client automatically connects when initialized
}

// Initialize the application
initializeApp();
