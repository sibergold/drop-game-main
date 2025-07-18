import Phaser, { Tilemaps } from "phaser";
import AssetManager from "./asset-manager";
import Avatar from "./avatar";
import CharacterSelector from "./character-selector";
import constants from "./constants";
import EffectManager from "./effects";
import emitter from "./emitter";
import kick from "./kick";
import Score from "./score";

import { hs, sleep } from "./util";
import WebFontFile from "./webfontfile";

/** main game scene */
export default class Game extends Phaser.Scene {
	active: boolean;
	assetManager: AssetManager;
	characterSelector: CharacterSelector | null = null;
	currentPoolAsset: string = "";
	dropGroup: Phaser.Physics.Arcade.Group | null;
	droplets!: Phaser.GameObjects.Particles.ParticleEmitter;
	droppers: Map<string, Avatar>;
	droppersArray: Array<Avatar>;
	droppersQueue: Set<string>;
	effectManager!: EffectManager;
	endTimer?: NodeJS.Timeout;
	endWait: integer;
	pad: Phaser.Physics.Arcade.Image | null = null;
	rect: Phaser.GameObjects.Rectangle | null = null;
	queue: boolean;
	selectedTheme: string = "base";
	themeListContainer: Phaser.GameObjects.Container | null = null;
	winner: Avatar | null;

	constructor() {
		super();
		this.active = false;
		this.assetManager = new AssetManager(this);
		this.dropGroup = null;
		this.droppers = new Map<string, Avatar>();
		this.droppersArray = [];
		this.droppersQueue = new Set<string>();
		this.endWait = parseInt(hs.wait || constants.WAIT_FOR_RESET) * 1000;
		this.queue = false;
		this.winner = null;

		// URL parametresinden tema oku
		this.selectedTheme = this.getThemeFromUrl();

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

		// Default assets'ları yükle
		this.load.setBaseURL("./default");
		this.load.audio("drop", "drop.mp3");
		this.load.audio("land", "land.mp3");
		this.load.audio("win", "win.mp3");
		this.load.image("drop1", "drop1.png");
		this.load.image("drop2", "drop2.png");
		this.load.image("drop3", "drop3.png");
		this.load.image("drop4", "drop4.png");
		this.load.image("drop5", "drop5.png");

		// Default paraşüt ve havuz
		this.load.image("chute_default", "chute.png");
		this.load.image("pad_default", "pad.png");

		// Tema bazlı paraşüt ve havuz yükle
		this.loadThemeAssets();
		this.load.spritesheet("droplet", "droplet.png", {
			frameHeight: 82,
			frameWidth: 82,
		});

		// ✨ Load water effect assets
		this.effectManager = new EffectManager(this);
		this.effectManager.preloadAssets();

		// Base URL'i sıfırla (PixelPlush assets için)
		this.load.setBaseURL("");
	}

	async create() {
		this.physics.world
			.setBounds(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
			.setBoundsCollision(true, true, false, true);

		// Asset fallback kontrolü
		let padTexture = "pad";
		if (!this.textures.exists("pad")) {
			console.warn("⚠️ Theme pad not found, using default");
			padTexture = this.textures.exists("pad_default") ? "pad_default" : "pad";
		}

		this.pad = this.physics.add.image(0, 0, padTexture);
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

		// PixelPlush asset catalog'unu yükle
		await this.assetManager.loadCatalog();
		console.log("🎮 PixelPlush assets loaded:", this.assetManager.getStats());

		// Karakter seçici oluştur
		this.characterSelector = new CharacterSelector(
			this,
			this.assetManager,
			{
				x: constants.SCREEN_WIDTH / 2,
				y: constants.SCREEN_HEIGHT / 2,
				width: 500,
				height: 350,
				visible: false,
			},
			this.selectedTheme,
		);

		// URL parametresinden tema kontrolü
		const urlParams = new URLSearchParams(window.location.search);
		const themeParam = urlParams.get("theme");
		if (themeParam && themeParam !== "all") {
			// Belirli bir tema seçilmişse, o temadan rastgele karakter seç
			const themeCharacters = this.assetManager.getCharactersByTheme(
				this.capitalizeTheme(themeParam),
			);
			if (themeCharacters.length > 0) {
				const randomChar = themeCharacters[
					Math.floor(Math.random() * themeCharacters.length)
				];
				localStorage.setItem("selectedPixelPlushCharacter", randomChar.id);
				localStorage.setItem("selectedTheme", themeParam);
				console.log(
					`🎨 Theme from URL: ${themeParam}, selected character: ${randomChar.name}`,
				);
			}
		}

		// Karakter seçimi callback'i
		this.characterSelector.setOnCharacterSelected((character) => {
			console.log(`🎭 Character selected for next drop: ${character.name}`);
			// Seçilen karakteri localStorage'a kaydet
			localStorage.setItem("selectedPixelPlushCharacter", character.id);
		});

		// Klavye kontrolleri ekle
		this.input.keyboard?.on("keydown-C", () => {
			if (this.characterSelector) {
				this.characterSelector.toggle();
			}
		});

		// T tuşu ile tema listesi göster/gizle
		this.input.keyboard?.on("keydown-T", () => {
			if (this.themeListContainer) {
				this.themeListContainer.destroy();
				this.themeListContainer = null;
			} else {
				const themes = this.assetManager.getAvailableThemes();
				console.log("🎨 Available themes:", themes);
				this.showThemeList(themes);
			}
		});

		this.ready();
	}

	private capitalizeTheme(theme: string): string {
		// URL'den gelen tema adını catalog'daki formata çevir
		const themeMap: { [key: string]: string } = {
			halloween: "Halloween",
			christmas: "Christmas",
			easter: "Easter",
			valentine: "Valentine",
			spring: "Spring",
			summer: "Summer",
			fairy: "Fairy",
			magic: "Magic",
			cute: "Cute",
			streamer: "Streamer",
			base: "Base",
			special: "Special",
		};

		return (
			themeMap[theme.toLowerCase()] ||
			theme.charAt(0).toUpperCase() + theme.slice(1)
		);
	}

	private getThemeFromUrl(): string {
		// Hash parametrelerini oku (OAuth URL formatı: #access_token=...&theme=...)
		const hashParams = new URLSearchParams(window.location.hash.substring(1));
		const themeFromHash = hashParams.get("theme");

		if (themeFromHash) {
			// Tema değerini temizle (pixelplush=true gibi eklentileri kaldır)
			const cleanTheme = themeFromHash.split("&")[0].split("=")[0].trim();
			console.log(`🎨 Theme from hash: ${cleanTheme} (raw: ${themeFromHash})`);
			return cleanTheme.toLowerCase();
		}

		// Query parametrelerini oku (fallback: ?theme=...)
		const urlParams = new URLSearchParams(window.location.search);
		const themeFromQuery = urlParams.get("theme");

		if (themeFromQuery) {
			const cleanTheme = themeFromQuery.split("&")[0].split("=")[0].trim();
			console.log(
				`🎨 Theme from query: ${cleanTheme} (raw: ${themeFromQuery})`,
			);
			return cleanTheme.toLowerCase();
		}

		// LocalStorage'dan tema oku (tema seçim sayfasından)
		const savedTheme = localStorage.getItem("selectedTheme");
		if (savedTheme) {
			console.log(`🎨 Theme from localStorage: ${savedTheme}`);
			return savedTheme.toLowerCase();
		}

		console.log("🎨 Using default theme: base");
		return "base";
	}

	private loadThemeAssets(): void {
		console.log(`🎨 Loading assets for theme: ${this.selectedTheme}`);

		// Tema bazlı paraşüt yükle (manuel)
		const parachuteAsset = this.assetManager.getRandomParachuteByTheme(this.selectedTheme);
		const parachuteUrl = window.location.hostname === 'localhost'
			? `./pixelplush/game-parachute/${parachuteAsset}`
			: `${window.location.origin}/pixelplush/game-parachute/${parachuteAsset}`;
		console.log(`🪂 Loading parachute from: ${parachuteUrl}`);

		this.loadImageManually("chute", parachuteUrl, `Theme parachute: ${parachuteAsset}`);

		// Tema bazlı havuz/target yükle (manuel)
		const poolAsset = this.assetManager.getRandomPoolByTheme(this.selectedTheme);
		this.currentPoolAsset = poolAsset; // Store for collision detection
		const poolUrl = window.location.hostname === 'localhost'
			? `./pixelplush/game-parachute/${poolAsset}`
			: `${window.location.origin}/pixelplush/game-parachute/${poolAsset}`;
		console.log(`🎯 Loading target from: ${poolUrl}`);

		this.loadImageManually("pad", poolUrl, `Theme target: ${poolAsset}`);
	}

	private loadImageManually(textureKey: string, imageUrl: string, description: string): void {
		console.log(`🔄 Manual loading: ${description}`);

		const img = new Image();
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			try {
				console.log(`✅ ${description} loaded successfully (${img.width}x${img.height})`);

				// Remove existing texture if it exists
				if (this.textures.exists(textureKey)) {
					this.textures.remove(textureKey);
				}

				// Add texture to Phaser manually
				this.textures.addImage(textureKey, img);
				console.log(`✅ ${description} added to Phaser as: ${textureKey}`);
			} catch (error) {
				console.error(`❌ Error adding ${description} to Phaser:`, error);
				// Fallback to default
				this.loadDefaultAsset(textureKey);
			}
		};

		img.onerror = () => {
			console.warn(`⚠️ Failed to load ${description}, using default`);
			this.loadDefaultAsset(textureKey);
		};

		img.src = imageUrl;
	}

	private loadDefaultAsset(textureKey: string): void {
		if (textureKey === "chute" && this.textures.exists("chute_default")) {
			console.log(`🔄 Using default parachute`);
			// Copy default texture with new key
			const defaultTexture = this.textures.get("chute_default");
			this.textures.addImage("chute", defaultTexture.source[0].image);
		} else if (textureKey === "pad" && this.textures.exists("pad_default")) {
			console.log(`🔄 Using default pool`);
			// Copy default texture with new key
			const defaultTexture = this.textures.get("pad_default");
			this.textures.addImage("pad", defaultTexture.source[0].image);
		}
	}

	private showThemeList(themes: string[]): void {
		// Mevcut tema listesi varsa kaldır
		if (this.themeListContainer) {
			this.themeListContainer.destroy();
		}

		// Tema listesi container'ı oluştur
		this.themeListContainer = this.add.container(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);
		this.themeListContainer.setDepth(2000);

		// Arka plan
		const bg = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
		bg.setStrokeStyle(2, 0x00ff88);
		this.themeListContainer.add(bg);

		// Başlık
		const title = this.add.text(0, -80, '🎨 Available Themes', {
			fontSize: '16px',
			fontFamily: 'Arial',
			color: '#00ff88',
			align: 'center'
		});
		title.setOrigin(0.5, 0.5);
		this.themeListContainer.add(title);

		// Tema listesi
		themes.forEach((theme, index) => {
			const y = -50 + (index * 20);
			const themeText = this.add.text(0, y, `• ${theme}`, {
				fontSize: '12px',
				fontFamily: 'Arial',
				color: '#ffffff',
				align: 'center'
			});
			themeText.setOrigin(0.5, 0.5);
			this.themeListContainer?.add(themeText);
		});

		// Kapatma butonu
		const closeBtn = this.add.text(0, 70, 'Press T to close', {
			fontSize: '10px',
			fontFamily: 'Arial',
			color: '#aaaaaa',
			align: 'center'
		});
		closeBtn.setOrigin(0.5, 0.5);
		this.themeListContainer.add(closeBtn);

		// 3 saniye sonra otomatik kapat
		setTimeout(() => {
			if (this.themeListContainer) {
				this.themeListContainer.destroy();
				this.themeListContainer = null;
			}
		}, 3000);
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

		// ✅ Setup collision based on pool type
		this.setupPoolCollision();

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
		_padObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
		dropObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Tilemaps.Tile,
	) {
		const drop = dropObj as Phaser.Types.Physics.Arcade.GameObjectWithBody;

		// ✅ REMOVED: The touching.up check was causing premature scoring
		// The detailed landing detection below is more accurate

		const avatar = drop.getData("avatar") as Avatar;

		// ✅ CRITICAL FIX: Prevent multiple scoring for the same character
		if (avatar.isLanded) {
			return;
		}

		// ✅ Throttle landing checks to prevent infinite loops
		const now = Date.now();
		if (avatar.lastLandingCheck && (now - avatar.lastLandingCheck) < 100) {
			return; // Skip if checked within last 100ms
		}
		avatar.lastLandingCheck = now;

		// ✅ Get pool collision data for current pool type
		const poolCollisionData = this.assetManager.getPoolCollisionData(this.currentPoolAsset);
		console.log(`🎯 Pool collision data:`, poolCollisionData);

		// ✅ CRITICAL FIX: Check if character has actually landed on the ground
		// This prevents scoring while the character is still in the air
		const groundLevel = constants.SCREEN_HEIGHT - this.pad!.body!.height;
		const characterBottomY = avatar.container.y + (avatar.sprite.height / 2);
		const landingThreshold = groundLevel - constants.LANDING_THRESHOLD;

		// ✅ Pool-specific landing detection based on parachute-master logic
		const basicLandingCondition = characterBottomY >= landingThreshold;

		let poolSpecificLandingCondition = false;
		if (poolCollisionData.targetWalls && poolCollisionData.targetCollideLand !== undefined) {
			// For pools with walls (rectangular/round pools)
			const wallLandingThreshold = groundLevel - (poolCollisionData.targetCollideLand || 0);
			const horizontalDistance = Math.abs(avatar.container.x - this.pad!.x);
			const poolHalfWidth = this.pad!.body!.halfWidth;

			poolSpecificLandingCondition =
				characterBottomY >= wallLandingThreshold &&
				horizontalDistance <= (poolHalfWidth - 20); // 20px buffer like in parachute-master
		} else if (poolCollisionData.poolType === 'pile') {
			// For pile pools (winter, christmas, etc.), allow landing when touching the pad
			const horizontalDistance = Math.abs(avatar.container.x - this.pad!.x);
			const poolHalfWidth = this.pad!.body!.halfWidth;

			poolSpecificLandingCondition =
				characterBottomY >= (groundLevel - 40) && // More lenient threshold for pile pools
				horizontalDistance <= poolHalfWidth; // Allow landing anywhere on the pile
		}

		const shouldLand = basicLandingCondition || poolSpecificLandingCondition;

		// Only allow scoring if character has reached the landing area
		if (!shouldLand) {
			// Character is still in the air, handle bouncing for walled pools
			if (poolCollisionData.targetWalls &&
				avatar.container.x >= this.pad!.x - this.pad!.body!.halfWidth &&
				avatar.container.x <= this.pad!.x + this.pad!.body!.halfWidth) {
				// Bounce off the pool walls
				drop.body.velocity.x *= -1;
				console.log(`🏀 Character bounced off ${poolCollisionData.poolType} pool walls`);
			}
			return;
		}

		const pos = Math.abs(avatar.container.x - this.pad!.x);
		const halfWidth = this.pad!.body!.halfWidth + Math.round(avatar.container!.width / 2);

		// ✅ Pool-specific scoring calculation based on parachute-master logic
		let score: number;
		if (poolCollisionData.targetWalls) {
			// For pools with walls, use adjusted scoring like in parachute-master
			const adjustedHalfWidth = halfWidth - 35; // 35px adjustment for walled pools
			score = ((Math.max(0, adjustedHalfWidth - pos)) / adjustedHalfWidth) * 100;
		} else {
			// For pile-type pools, use standard scoring but ensure minimum score of 1
			score = Math.max(1, ((halfWidth - pos) / halfWidth) * 100);
		}

		// horizontal overlap mid-frame but not a landing; bounce off (only for walled pools)
		if (score < 0) {
			// Only bounce for pools with walls (rectangular/round), not for pile pools
			if (poolCollisionData.targetWalls) {
				drop.body.velocity.x *= -1;
				console.log(`🏀 Character bounced off ${poolCollisionData.poolType} pool walls (negative score: ${score.toFixed(1)})`);
				return;
			} else {
				// For pile pools, allow landing even with negative score (like winter theme)
				console.log(`🏔️ Pile pool allows landing even with negative score: ${score.toFixed(1)}`);
				// Don't return, continue with landing
			}
		}

		console.log(`🎯 Landing score: ${score.toFixed(1)} (pool type: ${poolCollisionData.poolType})`);


		this.droplets.emitParticleAt(
			avatar.container.x,
			avatar.container.y + avatar.sprite.height / 2,
			20,
		);
		this.resetTimer();
		avatar.swayTween?.stop();
		avatar.swayTween = null;
		avatar.score = score;
		avatar.isLanded = true; // ✅ Mark character as landed to prevent multiple scoring

		// ✨ Create spectacular water landing effects!
		const effectX = avatar.container.x;
		const effectY = this.pad!.y - this.pad!.body!.height / 2;

		// Create water splash and bubble effects
		this.effectManager.createWaterLandingEffect({
			x: effectX,
			y: effectY,
			scale: 1 + (score / 100) * 0.5, // Bigger effects for better scores
			duration: 1000 + (score / 100) * 500 // Longer effects for better scores
		});

		// Create ripple effect on water surface
		this.effectManager.createWaterRipple({
			x: effectX,
			y: effectY,
			scale: 1 + (score / 100) * 0.3
		});

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
			const avatar = new Avatar(username, this, emote, this.selectedTheme);
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

			// Try to get emote ID from recent messages
			const emoteId = this.getEmoteIdFromMessage(username, emote);
			if (emoteId) {
				console.log(`🎭 Found emote ID for ${emote}: ${emoteId}`);
				// Try to load real Kick emote with CORS proxy
				this.loadKickEmoteWithUniqueTexture(username, emote, emoteId);
				return;
			} else {
				console.log(`🎭 No emote ID found for ${emote}, using default avatar mapping`);
				// Fallback to enhanced default avatar mapping
				this.loadDefaultEmoteAvatar(username, emote);
				return;
			}
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

	// Load Kick emote with multiple CORS proxy fallbacks
	private loadKickEmoteWithUniqueTexture(username: string, emoteName: string, emoteId: string): void {
		const kickEmoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;
		const uniqueTextureKey = `kickemote_${emoteName}_${emoteId}`;

		console.log(`🎭 Attempting to load real Kick emote: ${emoteName} (ID: ${emoteId})`);
		console.log(`🎭 Unique texture key: ${uniqueTextureKey}`);
		console.log(`🎭 Original URL: ${kickEmoteUrl}`);

		// Try our own proxy server first, then fallback to public proxies
		const isLocalhost = window.location.hostname === 'localhost';
		const ownProxyUrl = isLocalhost
			? `http://localhost:3001/proxy/emote/${emoteId}`
			: `https://render-proxy-production-9134.up.railway.app/proxy/emote/${emoteId}`;

		// List of proxy services to try (our own proxy first, then public ones)
		const corsProxies = [
			ownProxyUrl, // Our own proxy (most reliable)
			'https://corsproxy.io/?',
			'https://api.allorigins.win/raw?url=',
			'https://cors-anywhere.herokuapp.com/',
			'https://thingproxy.freeboard.io/fetch/',
			'https://api.codetabs.com/v1/proxy?quest=',
		];

		this.tryLoadEmoteWithProxies(username, emoteName, emoteId, kickEmoteUrl, uniqueTextureKey, corsProxies, 0);
	}

	// Try loading emote with different CORS proxies
	private tryLoadEmoteWithProxies(username: string, emoteName: string, emoteId: string, originalUrl: string, textureKey: string, proxies: string[], proxyIndex: number): void {
		if (proxyIndex >= proxies.length) {
			console.log(`⚠️ All CORS proxies failed, falling back to default avatar`);
			this.loadDefaultEmoteAvatar(username, emoteName);
			return;
		}

		const currentProxy = proxies[proxyIndex];

		// Check if this is our own proxy (doesn't need URL encoding)
		let proxiedUrl: string;
		if (currentProxy.includes('/proxy/emote/') || currentProxy.includes('emote-proxy')) {
			// Our own proxy - use as is
			proxiedUrl = currentProxy;
		} else {
			// External proxy - encode the original URL
			proxiedUrl = currentProxy + encodeURIComponent(originalUrl);
		}

		console.log(`🔄 Trying CORS proxy ${proxyIndex + 1}/${proxies.length}: ${currentProxy}`);
		console.log(`🔗 Proxied URL: ${proxiedUrl}`);

		// Manual image loading for emotes (bypass Phaser loader)
		console.log(`🔄 Manual emote loading: ${emoteName} from ${proxiedUrl}`);

		const img = new Image();
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			try {
				console.log(`✅ Emote image loaded: ${emoteName} (${img.width}x${img.height})`);

				// Add texture to Phaser manually
				if (this.textures.exists(textureKey)) {
					this.textures.remove(textureKey);
				}

				this.textures.addImage(textureKey, img);
				console.log(`✅ Kick emote loaded via proxy: ${emoteName}`);

				const avatar = new Avatar(username, this, textureKey, this.selectedTheme);
				this.droppers.set(username, avatar);
				this.droppersArray.push(avatar);
				this.dropGroup!.add(avatar.container);
				try {
					this.sound.stopByKey("drop");
					this.sound.play("drop");
				} catch (error) {
					console.log('🔇 Audio autoplay blocked by browser (normal behavior)');
				}
			} catch (error) {
				console.error(`❌ Error adding emote texture to Phaser:`, error);
				this.tryLoadEmoteWithProxies(username, emoteName, emoteId, originalUrl, textureKey, proxies, proxyIndex + 1);
			}
		};

		img.onerror = () => {
			console.log(`⚠️ Failed to load emote with proxy ${currentProxy}, trying next proxy`);
			console.log(`❌ Failed URL: ${proxiedUrl}`);
			this.tryLoadEmoteWithProxies(username, emoteName, emoteId, originalUrl, textureKey, proxies, proxyIndex + 1);
		};

		img.src = proxiedUrl;
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
				const avatar = new Avatar(username, this, textureKey, this.selectedTheme);
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
				const avatar = new Avatar(username, this, undefined, this.selectedTheme);
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

	private setupPoolCollision(): void {
		// Ensure pad and dropGroup are available
		if (!this.pad || !this.dropGroup) {
			console.warn('⚠️ Cannot setup pool collision: pad or dropGroup not available');
			return;
		}

		// Get current pool collision data
		const poolCollisionData = this.assetManager.getPoolCollisionData(this.currentPoolAsset);
		console.log(`🎯 Setting up collision for pool type: ${poolCollisionData.poolType}`);

		if (poolCollisionData.poolType === 'pile') {
			// For pile pools, use overlap (no bouncing)
			this.physics.add.overlap(
				this.pad,
				this.dropGroup,
				this.landOnPad.bind(this),
			);
			console.log(`🏔️ Pile pool: Using overlap (no bouncing)`);
		} else {
			// For walled pools, use collider (with bouncing)
			this.physics.add.collider(
				this.pad,
				this.dropGroup,
				this.landOnPad.bind(this),
			);
			console.log(`🏊 Walled pool: Using collider (with bouncing)`);
		}
	}
}
