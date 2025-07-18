

export interface AssetItem {
	id: string;
	group: string;
	name: string;
	theme: string;
	type: 'character' | 'pet' | 'outfit' | 'accessory' | 'add-on' | 'bundle' | 'effect' | 'body' | 'equipment';
	path: string;
	cost: number;
	hidden?: boolean;
	category?: string;
	character?: string;
	minIdle?: number;
	maxIdle?: number;
	oneAnim?: boolean;
	subscription?: string;
	items?: string;
	description?: string;
}

export interface CharacterAsset {
	id: string;
	name: string;
	theme: string;
	frontSprite: string;
	backSprite?: string;
	leftSprite?: string;
	rightSprite?: string;
	cost: number;
	hidden: boolean;
}

export interface PoolCollisionData {
	targetWalls?: number;
	targetCollideLand?: number;
	poolType: 'rectangular' | 'round' | 'pile';
}

export class AssetManager {
	private catalog: AssetItem[] = [];
	private characters: Map<string, CharacterAsset> = new Map();
	private loadedTextures: Set<string> = new Set();
	private scene: Phaser.Scene;
	private baseUrl = './pixelplush/';
	private poolCollisionData: Map<string, PoolCollisionData> = new Map();

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.initializePoolCollisionData();
	}

	async loadCatalog(): Promise<void> {
		try {
			// Catalog'u fetch et
			const response = await fetch(`${this.baseUrl}catalog.json`);
			if (!response.ok) {
				throw new Error(`Failed to load catalog: ${response.status}`);
			}

			this.catalog = await response.json();

			// Karakterleri filtrele ve organize et
			this.organizeCharacters();

		} catch (error) {
			// Fallback: boş catalog ile devam et
			this.catalog = [];
		}
	}

	private organizeCharacters(): void {
		const characterItems = this.catalog.filter(item => 
			item.type === 'character' && !item.hidden
		);

		for (const item of characterItems) {
			// Path düzeltmesi: bazı karakterlerde klasör adı ile path farklı
			let folderName = item.path;
			let fileName = item.path;

			// Özel durumlar için düzeltme (klasör adı ile dosya adı farklı olanlar)
			if (item.id === 'girlbear') {
				folderName = 'girlbear';
				fileName = 'beargirl';
			} else if (item.id === 'evilbear') {
				folderName = 'evilbear';
				fileName = 'evil_bear';
			} else if (item.id === 'boybear') {
				folderName = 'boybear';
				fileName = 'bear';
			} else if (item.id === 'instafluff') {
				folderName = 'instafluff';
				fileName = 'insta';
			} else if (item.id === 'kiro') {
				folderName = 'kiro';
				fileName = 'fairy_boy';
			} else if (item.id === 'koral') {
				folderName = 'koral';
				fileName = 'fairy_girl';
			} else if (item.id === 'lotus') {
				folderName = 'lotus';
				fileName = 'mushroom_man_pink';
			} else if (item.id === 'nova') {
				folderName = 'nova';
				fileName = 'mushroom_man_purple';
			} else if (item.id === 'tori') {
				folderName = 'tori';
				fileName = 'mushroom_man_green';
			} else if (item.id === 'avellana') {
				folderName = 'avellana';
				fileName = 'avelana';
			}

			const character: CharacterAsset = {
				id: item.id,
				name: item.name,
				theme: item.theme,
				frontSprite: `${this.baseUrl}characters/${folderName}/${fileName}_front/${fileName}_front1.png`,
				backSprite: `${this.baseUrl}characters/${folderName}/${fileName}_back/${fileName}_back1.png`,
				leftSprite: `${this.baseUrl}characters/${folderName}/${fileName}_left/${fileName}_left1.png`,
				rightSprite: `${this.baseUrl}characters/${folderName}/${fileName}_right/${fileName}_right1.png`,
				cost: item.cost,
				hidden: item.hidden || false
			};

			this.characters.set(item.id, character);
		}
	}

	getAvailableCharacters(): CharacterAsset[] {
		return Array.from(this.characters.values())
			.filter(char => !char.hidden)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	getCharactersByTheme(theme: string): CharacterAsset[] {
		// Tema bazlı filtreleme için hidden karakterleri de dahil et
		return Array.from(this.characters.values())
			.filter(char => char.theme.toLowerCase() === theme.toLowerCase())
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	getCharacter(id: string): CharacterAsset | undefined {
		return this.characters.get(id);
	}

	getAvailableThemes(): string[] {
		const themes = new Set<string>();
		this.characters.forEach(char => {
			if (!char.hidden) {
				themes.add(char.theme);
			}
		});
		return Array.from(themes).sort();
	}

	async loadCharacterTexture(characterId: string): Promise<string | null> {
		const character = this.getCharacter(characterId);
		if (!character) {
			return null;
		}

		const textureKey = `pixelplush_${characterId}`;
		
		// Eğer texture zaten yüklenmişse, key'i döndür
		if (this.loadedTextures.has(textureKey)) {
			return textureKey;
		}

		try {
			// Manuel image loading (Phaser loader bypass)
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.crossOrigin = 'anonymous'; // CORS support

				img.onload = () => {
					try {
						// Manually add texture to Phaser
						if (this.scene.textures.exists(textureKey)) {
							this.scene.textures.remove(textureKey);
						}

						this.scene.textures.addImage(textureKey, img);
						this.loadedTextures.add(textureKey);

						resolve(textureKey);
					} catch (error) {
						reject(error);
					}
				};

				img.onerror = (error) => {
					reject(new Error(`Failed to load image: ${character.frontSprite}`));
				};

				// Start loading
				img.src = character.frontSprite;
			});

		} catch (error) {
			return null;
		}
	}

	// Rastgele karakter seç
	getRandomCharacter(): CharacterAsset | null {
		const availableChars = this.getAvailableCharacters();
		if (availableChars.length === 0) return null;
		
		const randomIndex = Math.floor(Math.random() * availableChars.length);
		return availableChars[randomIndex];
	}

	// Tema bazında rastgele karakter seç
	getRandomCharacterByTheme(theme: string): CharacterAsset | null {
		const themeChars = this.getCharactersByTheme(theme);
		if (themeChars.length === 0) return null;

		const randomIndex = Math.floor(Math.random() * themeChars.length);
		return themeChars[randomIndex];
	}



	// Tema bazında rastgele paraşüt seç
	getRandomParachuteByTheme(theme: string): string {
		const parachuteMap: { [key: string]: string[] } = {
			'base': ['chute_black.png', 'chute_blue.png', 'chute_green.png', 'chute_pink.png', 'chute_purple.png', 'chute_yellow.png'],
			'multi': ['chute_black_blue.png', 'chute_black_green.png', 'chute_blue_green.png', 'chute_pink_blue.png', 'chute_white_blue.png', 'chute_white_green.png'],
			'retro': ['chute_retro.png'],
			'autumn': ['autumn_theme/chute_brown1.png', 'autumn_theme/chute_orange1.png', 'autumn_theme/chute_red1.png', 'autumn_theme/chute_yellow1.png', 'autumn_theme/chute_green1.png'],
			'christmas': ['christmas_eve/chute_ribbon_red.png', 'christmas_eve/chute_ribbon_green.png', 'christmas_eve/chute_ribbon_blue.png', 'christmas_eve/chute_ribbon_pink.png', 'christmas_eve/chute_ribbon_yellow.png'],
			'winter': ['winter_theme/chute_snowflake.png', 'winter_theme/parachute_snow.png', 'winter_theme/chute_snowflake1.png', 'winter_theme/chute_snowflake2.png'],
			'spring': ['spring_theme/hot_air_balloon_pink.png', 'spring_theme/para_balloon_peach.png', 'spring_theme/hot_air_balloon_orange.png', 'spring_theme/hot_air_balloon_purple.png', 'spring_theme/para_balloon_pink.png'],
			'valentine': ['valentines/balloon_heart_red.png', 'valentines/balloon_heart_pink.png', 'valentines/balloon_heart_gold.png', 'valentines/balloon_heart_brown.png', 'valentines/balloon_heart_white.png'],
			'pride': ['pride_theme/chute_rainbow.png', 'pride_theme/chute_plane_gay.png', 'pride_theme/chute_plane_lesbian.png', 'pride_theme/chute_plane_bisexual.png', 'pride_theme/chute_plane_transgender.png'],
			'halloween': ['chute_black.png', 'chute_purple.png', 'cauldron/cauldron_base.png'],
			'easter': ['chute_pink.png', 'chute_yellow.png', 'chute_green.png'],
			'summer': ['chute_yellow.png', 'chute_blue.png', 'chute_green.png', 'chute_pink.png'],
			'pool': ['target_pool_blue.png', 'target_pool_red.png']
		};

		const themeParachutes = parachuteMap[theme.toLowerCase()] || parachuteMap['base'];
		const randomIndex = Math.floor(Math.random() * themeParachutes.length);
		const selectedChute = themeParachutes[randomIndex];
		return selectedChute;
	}

	// Tema bazında rastgele havuz/target seç
	getRandomPoolByTheme(theme: string): string {
		const poolMap: { [key: string]: string[] } = {
			base: ["target_pool_red.png", "target_pool_blue.png"],
			pool: ["target_pool_blue.png", "target_pool_red.png"],
			retro: ["target_pool_red.png", "target_pool_blue.png"],
			night: ["target_pool_red.png", "target_pool_blue.png"],
			light: ["target_pool_red.png", "target_pool_blue.png"],
			easter: ["easter_theme/target_easter4.png"],
			spring: ["spring_theme/target.png"],
			christmas: ["christmas_theme/target_christmas.png"],
			winter: ["winter_theme/target_winter.png"],
			autumn: ["autumn_theme/target_leaves.png"],
			valentine: ["valentines/valentines_target_brown_red_nocredit.png","valentines/valentines_target_white_pink_nocredit.png",
			"valentines/valentines_target_brown_gold_nocredit.png","valentines/valentines_target_white_gold_nocredit.png",],
			halloween: ["cauldron/cauldron1.png"],
			pride: ["target_pool_red.png", "target_pool_blue.png"],
			summer: ["target_pool_blue.png", "target_pool_red.png"],
			multi: ["target_pool_blue.png",	"target_pool_red.png"],
		};

		const themePools = poolMap[theme.toLowerCase()] || poolMap['base'];
		const randomIndex = Math.floor(Math.random() * themePools.length);
		const selectedPool = themePools[randomIndex];
		return selectedPool;
	}



	// Debug bilgileri
	getStats(): { totalItems: number; characters: number; themes: number; loadedTextures: number } {
		return {
			totalItems: this.catalog.length,
			characters: this.characters.size,
			themes: this.getAvailableThemes().length,
			loadedTextures: this.loadedTextures.size
		};
	}

	private initializePoolCollisionData(): void {
		// Pool havuzları (köşeli) - target_walls: 28, target_collide_land: 30
		this.poolCollisionData.set('target_pool_blue.png', {
			targetWalls: 28,
			targetCollideLand: 30,
			poolType: 'rectangular'
		});
		this.poolCollisionData.set('target_pool_red.png', {
			targetWalls: 28,
			targetCollideLand: 30,
			poolType: 'rectangular'
		});
		this.poolCollisionData.set('target_pool_blue_new.png', {
			targetWalls: 28,
			targetCollideLand: 30,
			poolType: 'rectangular'
		});
		this.poolCollisionData.set('target_pool_red_new.png', {
			targetWalls: 28,
			targetCollideLand: 30,
			poolType: 'rectangular'
		});

		// Cauldron havuzları (yuvarlak) - target_walls: 70, target_collide_land: 20
		this.poolCollisionData.set('target_cauldron_blue.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_green.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_orange.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_pink.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_purple.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_red.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});
		this.poolCollisionData.set('target_cauldron_yellow.png', {
			targetWalls: 70,
			targetCollideLand: 20,
			poolType: 'round'
		});

		// Cake havuzları (yığın) - target_walls: 50, target_collide_land: 0
		this.poolCollisionData.set('target_cake_chocolate.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_cake_fruit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_cake_rainbow.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});

		// Winter/Default havuzları (yığın) - target_walls yok
		this.poolCollisionData.set('target_winter.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('pad_default', {
			poolType: 'pile'
		});

		// Christmas havuzları (yığın) - target_walls yok
		this.poolCollisionData.set('target_christmas.png', {
			poolType: 'pile'
		});

		// Spring havuzları (yığın) - target_walls yok
		this.poolCollisionData.set('target.png', {
			poolType: 'pile'
		});

		// Easter havuzları (yığın) - target_walls yok
		this.poolCollisionData.set('target_easter1.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter2.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter3.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter4.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter5.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter6.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_easter7.png', {
			poolType: 'pile'
		});

		// Autumn havuzları (yığın) - target_walls yok
		this.poolCollisionData.set('target_leaves.png', {
			poolType: 'pile'
		});
		this.poolCollisionData.set('target_leaves2.png', {
			poolType: 'pile'
		});

		// Valentines havuzları (yığın) - target_walls: 50, target_collide_land: 0
		this.poolCollisionData.set('valentines_target_brown_gold_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('valentines_target_brown_pink_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('valentines_target_brown_red_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('valentines_target_white_gold_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('valentines_target_white_pink_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});
		this.poolCollisionData.set('valentines_target_white_red_credit.png', {
			targetWalls: 50,
			targetCollideLand: 0,
			poolType: 'pile'
		});

		// Camp Chaos havuzları (yuvarlak) - target_walls: 70, target_collide_land: 30
		this.poolCollisionData.set('camp_target.png', {
			targetWalls: 70,
			targetCollideLand: 30,
			poolType: 'round'
		});
	}

	getPoolCollisionData(poolAsset: string): PoolCollisionData {
		// Asset path'inden dosya adını çıkar
		const fileName = poolAsset.split('/').pop() || poolAsset;

		// Collision data'sını bul
		const collisionData = this.poolCollisionData.get(fileName);

		if (collisionData) {
			return collisionData;
		}

		// Default olarak pile type döndür (winter theme gibi)
		return { poolType: 'pile' };
	}
}

export default AssetManager;
