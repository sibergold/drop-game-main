import { GameObjects, Scene, Sound } from "phaser";
import constants from "./constants";

export interface EffectConfig {
	x: number;
	y: number;
	scale?: number;
	duration?: number;
	color?: string;
}

export default class EffectManager {
	private scene: Scene;
	private bubbleTextures: string[] = [];
	private dropletTextures: string[] = [];
	private bubbleSounds: string[] = [];
	private splashSounds: string[] = [];

	constructor(scene: Scene) {
		this.scene = scene;
		this.initializeTextures();
	}

	private initializeTextures() {
		// Bubble texture names
		this.bubbleTextures = [
			'bubble1_blue', 'bubble1_pastelblue', 'bubble1_skyblue',
			'bubble2_blue', 'bubble2_pastelblue', 'bubble2_skyblue'
		];

		// Droplet texture names
		this.dropletTextures = [
			'bluebit', 'greenbit', 'greybit', 'purplebit', 'redbit', 'yellowbit'
		];

		// Sound effect names
		this.bubbleSounds = ['bubbles1', 'bubbles2', 'bubbles3'];
		this.splashSounds = ['splash_01', 'droplet'];
	}

	/**
	 * Preload all effect assets
	 */
	preloadAssets() {
		// Load bubble textures
		this.bubbleTextures.forEach(texture => {
			const bubbleType = texture.startsWith('bubble1') ? 'bubble1' : 'bubble2';
			this.scene.load.image(texture, `./pixelplush/confetti_overlay/bubbles/${bubbleType}/${texture}.png`);
		});

		// Load droplet textures
		this.dropletTextures.forEach(texture => {
			this.scene.load.image(texture, `./pixelplush/game-parachute/droplets/${texture}.png`);
		});

		// Load sound effects
		this.bubbleSounds.forEach(sound => {
			this.scene.load.audio(sound, `./pixelplush/sfx/${sound}.mp3`);
		});

		this.splashSounds.forEach(sound => {
			this.scene.load.audio(sound, `./pixelplush/sfx/${sound}.mp3`);
		});
	}

	/**
	 * Create bubble explosion effect when character lands in water
	 */
	createBubbleExplosion(config: EffectConfig) {
		const { x, y, scale = 1, duration = 1000 } = config;
		
		// Play bubble sound
		this.playRandomSound(this.bubbleSounds);

		// Create multiple bubbles
		const bubbleCount = constants.WATER_EFFECTS.BUBBLE_COUNT_MIN +
			Math.floor(Math.random() * (constants.WATER_EFFECTS.BUBBLE_COUNT_MAX - constants.WATER_EFFECTS.BUBBLE_COUNT_MIN + 1));
		
		for (let i = 0; i < bubbleCount; i++) {
			const bubbleTexture = this.getRandomTexture(this.bubbleTextures);
			const bubble = this.scene.add.image(x, y, bubbleTexture);
			
			// Random position offset
			const offsetX = (Math.random() - 0.5) * 100;
			const offsetY = (Math.random() - 0.5) * 50;
			
			bubble.setScale(scale * (0.3 + Math.random() * 0.4)); // Random size
			bubble.setAlpha(0.8);
			
			// Animate bubble
			this.scene.tweens.add({
				targets: bubble,
				x: x + offsetX,
				y: y + offsetY - 50 - Math.random() * 100, // Float upward
				alpha: 0,
				scale: bubble.scale * (1.2 + Math.random() * 0.8),
				duration: duration + Math.random() * 500,
				ease: 'Power2',
				onComplete: () => {
					bubble.destroy();
				}
			});
		}
	}

	/**
	 * Create water splash effect
	 */
	createWaterSplash(config: EffectConfig) {
		const { x, y, scale = 1, duration = 800 } = config;
		
		// Play splash sound
		this.playRandomSound(this.splashSounds);

		// Create water droplets
		const dropletCount = constants.WATER_EFFECTS.DROPLET_COUNT_MIN +
			Math.floor(Math.random() * (constants.WATER_EFFECTS.DROPLET_COUNT_MAX - constants.WATER_EFFECTS.DROPLET_COUNT_MIN + 1));
		
		for (let i = 0; i < dropletCount; i++) {
			const dropletTexture = this.getRandomTexture(this.dropletTextures);
			const droplet = this.scene.add.image(x, y, dropletTexture);
			
			// Random splash direction
			const angle = (Math.random() * Math.PI) - Math.PI/2; // Upward arc
			const velocity = 100 + Math.random() * 100;
			const offsetX = Math.cos(angle) * velocity;
			const offsetY = Math.sin(angle) * velocity;
			
			droplet.setScale(scale * (0.4 + Math.random() * 0.3));
			droplet.setAlpha(0.9);
			
			// Animate droplet with gravity
			this.scene.tweens.add({
				targets: droplet,
				x: x + offsetX,
				y: y + offsetY,
				alpha: 0,
				duration: duration,
				ease: 'Power2',
				onComplete: () => {
					droplet.destroy();
				}
			});
		}
	}

	/**
	 * Create combined water landing effect
	 */
	createWaterLandingEffect(config: EffectConfig) {
		// Create both splash and bubbles for maximum effect
		this.createWaterSplash(config);
		
		// Delay bubbles slightly for more realistic effect
		this.scene.time.delayedCall(100, () => {
			this.createBubbleExplosion({
				...config,
				duration: 1200 // Bubbles last longer
			});
		});
	}

	/**
	 * Create ripple effect on water surface
	 */
	createWaterRipple(config: EffectConfig) {
		const { x, y, scale = 1 } = config;
		
		// Create expanding circle for ripple effect
		const ripple = this.scene.add.circle(x, y, 10, 0x87CEEB, 0.3);
		
		this.scene.tweens.add({
			targets: ripple,
			radius: constants.WATER_EFFECTS.RIPPLE_MAX_RADIUS * scale,
			alpha: 0,
			duration: 1000,
			ease: 'Power2',
			onComplete: () => {
				ripple.destroy();
			}
		});
	}

	private getRandomTexture(textures: string[]): string {
		return textures[Math.floor(Math.random() * textures.length)];
	}

	private playRandomSound(sounds: string[]) {
		try {
			const soundKey = this.getRandomTexture(sounds);
			const sound = this.scene.sound.add(soundKey, { volume: constants.WATER_EFFECTS.EFFECT_VOLUME });
			sound.play();
		} catch (error) {
			// Could not play effect sound
		}
	}
}
