import Phaser, { Tilemaps } from "phaser";
import Avatar from "./avatar";
import constants from "./constants";
import emitter from "./emitter";
import kick from "./kick";
import Score from "./score";

import { hs, sleep } from "./util";
import WebFontFile from "./webfontfile";

/** main game scene */
export default class Game extends Phaser.Scene {
	active: boolean;
	dropGroup: Phaser.Physics.Arcade.Group | null;
	droplets!: Phaser.GameObjects.Particles.ParticleEmitter;
	droppers: Map<string, Avatar>;
	droppersArray: Array<Avatar>;
	droppersQueue: Set<string>;
	endTimer?: NodeJS.Timeout;
	endWait: integer;
	pad: Phaser.Physics.Arcade.Image | null = null;
	rect: Phaser.GameObjects.Rectangle | null = null;
	queue: boolean;
	winner: Avatar | null;

	constructor() {
		super();
		this.active = false;
		this.dropGroup = null;
		this.droppers = new Map<string, Avatar>();
		this.droppersArray = [];
		this.droppersQueue = new Set<string>();
		this.endWait = parseInt(hs.wait || constants.WAIT_FOR_RESET) * 1000;
		this.queue = false;
		this.winner = null;

		emitter.on("drop", this.onDrop, this);
		emitter.on("droplow", this.onDropLow, this);
		emitter.on("droprecent", this.onDropRecent, this);
		emitter.on("droptop", this.onDropTop, this);
		emitter.on("clearscores", this.onClearScores, this);
		emitter.on("lose", this.onLose, this);
		emitter.on("queuedrop", this.onQueueDrop, this);
		emitter.on("resetdrop", this.onResetDrop, this);
		emitter.on("startdrop", this.onStartDrop, this);
		emitter.on("storeEmoteId", this.storeEmoteId, this);

		setInterval(this.tidyScores.bind(this), constants.TIDY_SCHEDULE);
		this.tidyScores();
	}

	/** @type {Score[]} */
	get scores() {
		return JSON.parse(localStorage.getItem("scores") || "[]");
	}

	preload() {
		this.load.addFile(new WebFontFile(this.load, constants.FONT_FAMILY));
		this.load.setBaseURL("./default");
		this.load.audio("drop", "drop.mp3");
		this.load.audio("land", "land.mp3");
		this.load.audio("win", "win.mp3");
		this.load.image("chute", "chute.png");
		this.load.image("drop1", "drop1.png");
		this.load.image("drop2", "drop2.png");
		this.load.image("drop3", "drop3.png");
		this.load.image("drop4", "drop4.png");
		this.load.image("drop5", "drop5.png");
		this.load.image("pad", "pad.png");
		this.load.spritesheet("droplet", "droplet.png", {
			frameHeight: 82,
			frameWidth: 82,
		});
	}

	create() {
		this.physics.world
			.setBounds(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
			.setBoundsCollision(true, true, false, true);
		this.pad = this.physics.add.image(0, 0, "pad");
		this.pad
			.setMaxVelocity(0, 0)
			.setOrigin(0.5, 1)
			.setVisible(false)
			.setPosition(0, constants.SCREEN_HEIGHT);
		this.droplets = this.add
			.particles(0, 0, "droplet", {
				blendMode: Phaser.BlendModes.ADD,
				emitting: false,
				gravityY: -500,
				lifespan: 500,
				scale: { start: 1, end: 0.2 },
				speed: { random: [50, 150] },
			})
			.setDepth(1);
		this.ready();
	}

	ready(): void {
		if (!this.pad?.body) {
			setTimeout(this.ready.bind(this), 100);
			return;
		}

		this.dropGroup = this.physics.add.group();
		this.physics.add.collider(
			this.dropGroup,
			this.dropGroup,
			this.crash.bind(this),
		);

		this.physics.world.on(
			Phaser.Physics.Arcade.Events.WORLD_BOUNDS,
			(obj: Phaser.Physics.Arcade.Body, _up: boolean, down: boolean) => {
				// "bounce" off the walls
				if (!down) {
					obj.velocity.y =
						-1 * (Math.random() * constants.BUMP_MIN + constants.BUMP_SPREAD);
					return;
				}

				const avatar = obj.gameObject.getData("avatar") as Avatar;
				emitter.emit("lose", avatar);
			},
		);

		this.pad.body.immovable = true;
		this.pad.body.setSize(this.pad.width, this.pad.height - 10, true);
		this.physics.add.collider(
			this.pad,
			this.dropGroup,
			this.landOnPad.bind(this),
		);

		if (hs.debug)
			this.rect = this.add
				.rectangle(
					0,
					this.pad.body.y,
					this.pad.body.width,
					this.pad.body.height,
				)
				.setOrigin(0.5, 1)
				.setDepth(1)
				.setStrokeStyle(2, 0xff0ff)
				.setVisible(false);
	}

	update() {
		if (!this.active) return;

		for (const drop of this.droppersArray) {
			if (!drop.active) continue;
			drop.update();
		}

		this.rect?.setPosition(this.pad!.x, this.pad!.y);
	}

	tidyScores() {
		console.debug("Tidying scores");
		const expiry = Date.now() - constants.TWENTY_FOUR_HOURS;
		const scores = this.scores;
		const update = scores.filter((v: Score) => v.when > expiry);
		localStorage.setItem("scores", JSON.stringify(update));
		console.debug("Tidy scores complete");
	}

	start() {
		if (!this.pad) return;

		this.active = true;
		this.droppers.clear();
		this.droppersArray = [];
		this.winner = null;
		this.pad.x = Math.floor(
			this.pad.width / 2 +
				Math.random() * (constants.SCREEN_WIDTH - this.pad.width),
		);

		this.pad.setVisible(true);

		if (hs.debug) this.rect?.setVisible(true);

		// Send welcome message to chat (disabled for now due to API issues)
		// if (kick && !this.queue) {
		// 	kick.say(hs.channel, "🪂 Parachute Drop Game is now active! Type !drop to join the fun! 🎯");
		// }

		console.debug(`Pad X Position: ${this.pad.x}`);
	}

	end() {
		this.active = false;
		this.queue = false;
		this.droppersQueue.clear();
		this.pad?.setVisible(false);
		this.rect?.setVisible(false);

		for (const drop of this.droppersArray) {
			drop.rect?.destroy();
			drop.container.destroy();
		}
	}

	resetTimer() {
		clearTimeout(this.endTimer);
		this.endTimer = setTimeout(this.end.bind(this), this.endWait);
	}

	async resolveQueue() {
		this.start();
		if (kick) {
			kick.say(hs.channel, `🚀 Let's go! Releasing ${this.droppersQueue.size} parachuters! 🪂`);
		}
		const enumKeys = this.droppersQueue.keys();
		let next: IteratorResult<string, undefined>;

		while ((next = enumKeys.next())) {
			if (next.done) break;
			emitter.emit("drop", next.value, true);
			await sleep(
				Math.ceil(Math.random() * constants.MIN_QUEUE_BUFFER) +
					constants.MAX_QUEUE_BUFFER -
					constants.MIN_QUEUE_BUFFER,
			);
		}
	}

	crash(
		a: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
		b: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
	) {
		if (a instanceof Tilemaps.Tile || b instanceof Tilemaps.Tile) return;

		for (const container of [a, b])
			container.body!.velocity.y =
				-1 * (Math.random() * constants.BUMP_MIN + constants.BUMP_SPREAD);
	}

	landOnPad(
		padObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
		dropObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
	) {
		const pad = padObj as Phaser.Types.Physics.Arcade.GameObjectWithBody;
		const drop = dropObj as Phaser.Types.Physics.Arcade.GameObjectWithBody;

		if (!pad.body!.touching.up) return;

		const avatar = drop.getData("avatar") as Avatar;
		const pos = Math.abs(avatar.container.x - this.pad!.x);
		const halfWidth =
			this.pad!.body!.halfWidth + Math.round(avatar.container!.width / 2);
		const score = ((halfWidth - pos) / halfWidth) * 100;

		// horizontal overlap mid-frame but not a landing; bounce off
		if (score < 0) {
			drop.body.velocity.x *= -1;
			return;
		}

		this.droplets.emitParticleAt(
			avatar.container.x,
			avatar.container.y + avatar.sprite.height / 2,
			20,
		);
		this.resetTimer();
		avatar.swayTween?.stop();
		avatar.swayTween = null;
		avatar.score = score;
		avatar.container.setY(
			this.game.scale.gameSize.height -
				this.pad!.body!.height -
				avatar.sprite.height / 2,
		);
		drop.body.enable = false;
		this.dropGroup!.remove(drop);
		avatar.active = false;
		avatar.chute.visible = false;
		avatar.sprite.angle = 0;

		const scores = this.scores;

		scores.push(new Score(avatar.username, avatar.score));
		localStorage.setItem("scores", JSON.stringify(scores));

		if (this.winner && avatar.score < this.winner.score) {
			try {
				this.sound.stopByKey("land");
				this.sound.play("land");
			} catch (error) {
				console.log('🔇 Audio autoplay blocked by browser');
			}
			return emitter.emit("lose", avatar);
		}

		if (this.winner) {
			emitter.emit("lose", this.winner);
			this.winner.container.setDepth(0);
		}

		try {
			this.sound.stopByKey("win");
			this.sound.play("win");
		} catch (error) {
			console.log('🔇 Audio autoplay blocked by browser');
		}
		avatar.container.setDepth(1);
		this.winner = avatar;
		avatar.scoreLabel!.text = avatar.score.toFixed(2);
		avatar.scoreLabel!.setVisible(true);

		// Send winner message to chat
		if (kick) {
			kick.say(
				hs.channel,
				`🎉 @${avatar.username} landed on the pad with a score of ${avatar.score.toFixed(2)}! 🏆 Type !drop to join the next round!`,
			);
		}
	}

	// events

	onDrop(username: string, queue = false, emote?: string) {
		if (!this.active && !this.queue) this.start();
		else if (this.active && this.queue && !queue) return;

		if (this.queue && !queue && this.droppersQueue.has(username)) {
			return;
		} else if (!this.queue && this.droppers.has(username)) return;

		if (this.queue && !queue) {
			this.droppersQueue.add(username);
			return;
		}

		clearTimeout(this.endTimer);

		const finish = () => {
			const avatar = new Avatar(username, this, emote);
			this.droppers.set(username, avatar);
			this.droppersArray.push(avatar);
			this.dropGroup!.add(avatar.container);
			try {
				this.sound.stopByKey("drop");
				this.sound.play("drop");
			} catch (error) {
				console.log('🔇 Audio autoplay blocked by browser (normal behavior)');
			}
		};

		if (emote) {
			console.log(`🎭 Loading emote for ${username}: ${emote}`);

			// For now, use enhanced default avatar mapping due to CORS restrictions
			// In the future, this could be replaced with a proper proxy server
			this.loadDefaultEmoteAvatar(username, emote);
			return;
		}

		finish();
	}

	// Helper method to extract emote ID from recent chat messages
	private getEmoteIdFromMessage(username: string, emoteName: string): string | null {
		// Store recent chat messages with emote IDs for lookup
		// This is a simple implementation - in a real app you'd want a more robust system
		const recentEmotes = (this as any).recentEmotes || new Map();
		const key = `${username}_${emoteName}`;
		return recentEmotes.get(key) || null;
	}

	// Store emote ID when processing chat messages (called from index.ts)
	public storeEmoteId(username: string, emoteName: string, emoteId: string): void {
		if (!(this as any).recentEmotes) {
			(this as any).recentEmotes = new Map();
		}
		const key = `${username}_${emoteName}`;
		(this as any).recentEmotes.set(key, emoteId);

		// Clean up old entries (keep only last 50)
		if ((this as any).recentEmotes.size > 50) {
			const firstKey = (this as any).recentEmotes.keys().next().value;
			(this as any).recentEmotes.delete(firstKey);
		}
	}

	// Enhanced default avatar mapping for Kick emotes
	private loadDefaultEmoteAvatar(username: string, emote: string): void {
		const emoteAvatarMap: { [key: string]: string } = {
			// Standard emoji-style emotes
			'emojiBlowKiss': 'drop1.png',
			'emojiCrave': 'drop2.png',
			'emojiLove': 'drop3.png',
			'emojiHeart': 'drop4.png',
			'emojiSmile': 'drop5.png',
			'emojiWink': 'drop1.png',
			'emojiKiss': 'drop2.png',
			'emojiHappy': 'drop3.png',
			'emojiCool': 'drop4.png',
			'emojiLaugh': 'drop5.png',
			'emojiAngel': 'drop1.png',
			'emojiSad': 'drop2.png',
			'emojiCry': 'drop3.png',
			'emojiMad': 'drop4.png',
			'emojiShock': 'drop5.png',

			// Custom Kick emotes (common patterns)
			'seliinndino': 'drop1.png',
			'seliinnkalp': 'drop2.png',
			'seliinnlove': 'drop3.png',
			'seliinnhappy': 'drop4.png',
			'seliinncool': 'drop5.png',

			// Pattern-based mapping for unknown emotes
			// Heart/Love related
			'kalp': 'drop4.png',
			'love': 'drop3.png',
			'heart': 'drop4.png',
			'aşk': 'drop3.png',

			// Happy/Smile related
			'happy': 'drop5.png',
			'smile': 'drop5.png',
			'gülüş': 'drop5.png',
			'mutlu': 'drop5.png',

			// Cool/Awesome related
			'cool': 'drop1.png',
			'awesome': 'drop1.png',
			'harika': 'drop1.png',

			// Sad/Cry related
			'sad': 'drop2.png',
			'cry': 'drop2.png',
			'üzgün': 'drop2.png',

			// Add more mappings as needed
		};

		// Smart emote matching
		let avatarImage = emoteAvatarMap[emote];

		if (!avatarImage) {
			// Try pattern matching for unknown emotes
			const emoteLower = emote.toLowerCase();

			if (emoteLower.includes('kalp') || emoteLower.includes('heart') || emoteLower.includes('love') || emoteLower.includes('aşk')) {
				avatarImage = 'drop4.png'; // Heart-related
			} else if (emoteLower.includes('happy') || emoteLower.includes('smile') || emoteLower.includes('gül') || emoteLower.includes('mutlu')) {
				avatarImage = 'drop5.png'; // Happy-related
			} else if (emoteLower.includes('cool') || emoteLower.includes('awesome') || emoteLower.includes('harika')) {
				avatarImage = 'drop1.png'; // Cool-related
			} else if (emoteLower.includes('sad') || emoteLower.includes('cry') || emoteLower.includes('üzgün')) {
				avatarImage = 'drop2.png'; // Sad-related
			} else if (emoteLower.includes('kiss') || emoteLower.includes('öp')) {
				avatarImage = 'drop3.png'; // Kiss-related
			} else {
				// Random assignment for completely unknown emotes
				avatarImage = `drop${Math.floor(Math.random() * 5) + 1}.png`;
			}
		}

		const emoteUrl = `./default/${avatarImage}`;
		const textureKey = `emote_${emote}_${avatarImage.replace('.png', '')}`;

		console.log(`🎭 Using smart avatar mapping: ${avatarImage} for emote: ${emote} (${emote in emoteAvatarMap ? 'exact match' : 'pattern match'})`);

		this.load.setBaseURL();
		this.load
			.image(textureKey, emoteUrl)
			.on(`filecomplete-image-${textureKey}`, () => {
				console.log(`✅ Default emote avatar loaded: ${textureKey}`);
				const avatar = new Avatar(username, this, textureKey);
				this.droppers.set(username, avatar);
				this.droppersArray.push(avatar);
				this.dropGroup!.add(avatar.container);
				try {
					this.sound.stopByKey("drop");
					this.sound.play("drop");
				} catch (error) {
					console.log('🔇 Audio autoplay blocked by browser (normal behavior)');
				}
			})
			.on(`loaderror-image-${textureKey}`, () => {
				console.log(`⚠️ Failed to load default avatar, using finish()`);
				const avatar = new Avatar(username, this);
				this.droppers.set(username, avatar);
				this.droppersArray.push(avatar);
				this.dropGroup!.add(avatar.container);
			})
			.start();
	}

	onDropLow() {
		const scores = this.scores;

		if (scores.length === 0) {
			if (kick) kick.say(hs.channel, "VoteNay No data.");
			return;
		}

		const expiry = Date.now() - constants.TWENTY_FOUR_HOURS;
		let lowest = new Score(null, 101);

		for (const score of scores) {
			if (score.when < expiry) continue;

			if (score.score < lowest.score) lowest = score;
		}

		if (kick) {
			kick.say(
				hs.channel,
				`ResidentSleeper Lowest score in the past 24 hours: ${
					lowest.username
				} ${lowest.score.toFixed(2)}`,
			);
		}
	}

	onDropRecent() {
		const scores = this.scores;
		const expiry = Date.now() - constants.TWENTY_FOUR_HOURS;
		const recent = new Map<string, Score>();
		let tracking = 0;
		let oldest = new Score(null, 0, 0);

		for (const score of scores) {
			if (score.when < expiry) continue;

			if (recent.has(score.username)) {
				if (recent.get(score.username)?.when ?? 0 < score.when)
					recent.set(score.username, score);
			} else if (
				tracking < constants.RECENT_SCORES ||
				score.when > oldest.when
			) {
				if (tracking >= constants.RECENT_SCORES && oldest.username) {
					recent.delete(oldest.username);
				} else {
					tracking++;
				}

				if (score.when > oldest.when) oldest = score;

				recent.set(score.username, score);
			}
		}

		const out = Object.values(recent)
			.sort((a, b) => a.when - b.when)
			.map((v) => `${v.username} (${v.score.toFixed(2)})`)
			.join(", ");

		if (kick) {
			kick.say(hs.channel, `OhMyDog Recent drops: ${out}`);
		}
	}

	onDropTop() {
		const scores = this.scores;

		if (scores.length === 0) {
			if (kick) kick.say(hs.channel, "VoteNay No data.");
			return;
		}

		const expiry = Date.now() - constants.TWENTY_FOUR_HOURS;
		let highest = new Score(null, 0);

		for (const score of scores) {
			if (score.when < expiry) continue;

			if (score.score > highest.score) highest = score;
		}

		if (kick) {
			kick.say(
				hs.channel,
				`Poooound Highest score in the past 24 hours: ${
					highest.username
				} ${highest.score.toFixed(2)}`,
			);
		}
	}

	onClearScores(who: string[]) {
		if (!who) {
			localStorage.clear();
			if (kick) kick.say(hs.channel, "Scores cleared.");
		} else {
			const update = this.scores.filter(
				(v: Score) => v.username && !who.includes(v.username.toLowerCase()),
			);
			localStorage.setItem("scores", JSON.stringify(update));
			if (kick) kick.say(hs.channel, `Scores cleared for ${who.join(", ")}.`);
		}
	}

	onLose(avatar: Avatar) {
		this.resetTimer();
		(avatar.container.body as Phaser.Physics.Arcade.Body).enable = false;
		avatar.active = false;
		avatar.chute.visible = false;
		avatar.container.setActive(false);
		avatar.label?.destroy();
		avatar.label = null;
		avatar.rect?.setVisible(false);
		avatar.scoreLabel?.destroy();
		avatar.scoreLabel = null;
		avatar.sprite.angle = 0;
		avatar.sprite.setAlpha(0.25);
		avatar.swayTween?.stop();
		avatar.swayTween = null;
		this.dropGroup?.remove(avatar.container);
	}

	async onQueueDrop(delay = null) {
		if (this.queue) {
			if (kick) kick.say(hs.channel, "⚠️ A queue is already forming! Type !drop to join!");
			return;
		}

		this.queue = true;

		if (delay !== null) {
			setTimeout(this.resolveQueue.bind(this), delay * 1000);
			if (kick) kick.say(hs.channel, `🎯 Queue started! Type !drop to join. Auto-release in ${delay} seconds!`);
		} else {
			if (kick) kick.say(hs.channel, "🎯 Queue started! Type !drop to join. Moderators use !startdrop to release!");
		}
	}

	onResetDrop() {
		this.end();
	}

	async onStartDrop() {
		if (!this.queue) return;

		await this.resolveQueue();
	}
}
