

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

export class AssetManager {
	private catalog: AssetItem[] = [];
	private characters: Map<string, CharacterAsset> = new Map();
	private loadedTextures: Set<string> = new Set();
	private scene: Phaser.Scene;
	private baseUrl = './pixelplush/';

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	async loadCatalog(): Promise<void> {
		try {
			console.log('🔄 Loading PixelPlush catalog...');
			
			// Catalog'u fetch et
			const response = await fetch(`${this.baseUrl}catalog.json`);
			if (!response.ok) {
				throw new Error(`Failed to load catalog: ${response.status}`);
			}
			
			this.catalog = await response.json();
			console.log(`✅ Loaded ${this.catalog.length} items from catalog`);
			
			// Karakterleri filtrele ve organize et
			this.organizeCharacters();
			
		} catch (error) {
			console.error('❌ Failed to load PixelPlush catalog:', error);
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

		console.log(`📦 Organized ${this.characters.size} characters`);
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
			console.warn(`⚠️ Character not found: ${characterId}`);
			return null;
		}

		const textureKey = `pixelplush_${characterId}`;
		
		// Eğer texture zaten yüklenmişse, key'i döndür
		if (this.loadedTextures.has(textureKey)) {
			return textureKey;
		}

		try {
			// Phaser'a texture'ı yükle
			return new Promise((resolve, reject) => {
				this.scene.load.image(textureKey, character.frontSprite);
				
				this.scene.load.once(`filecomplete-image-${textureKey}`, () => {
					this.loadedTextures.add(textureKey);
					console.log(`✅ Loaded character texture: ${character.name}`);
					resolve(textureKey);
				});

				this.scene.load.once(`loaderror-image-${textureKey}`, () => {
					console.error(`❌ Failed to load character texture: ${character.name}`);
					reject(new Error(`Failed to load texture for ${characterId}`));
				});

				this.scene.load.start();
			});

		} catch (error) {
			console.error(`❌ Error loading character texture ${characterId}:`, error);
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
		console.log(`🪂 Selected parachute for theme '${theme}': ${selectedChute}`);
		return selectedChute;
	}

	// Tema bazında rastgele havuz/target seç
	getRandomPoolByTheme(theme: string): string {
		const poolMap: { [key: string]: string[] } = {
			'base': ['target_pool_red.png', 'target_pool_blue.png'],
			'pool': ['target_pool_blue.png', 'target_pool_red.png'],
			'retro': ['target_pool_red.png', 'target_pool_blue.png'],
			'night': ['target_pool_red.png', 'target_pool_blue.png'],
			'light': ['target_pool_red.png', 'target_pool_blue.png'],
			'easter': ['easter_theme/target_easter1.png', 'easter_theme/target_easter2.png', 'easter_theme/target_easter3.png', 'easter_theme/target_easter4.png', 'easter_theme/target_easter5.png'],
			'spring': ['spring_theme/target.png', 'spring_theme/target_spring_front.png'],
			'christmas': ['christmas_theme/target_christmas.png', 'christmas_theme/target_christmas_front.png'],
			'winter': ['winter_theme/target_winter.png', 'winter_theme/target_winter_front.png'],
			'autumn': ['autumn_theme/target_leaves.png', 'autumn_theme/target_leaves2.png'],
			'valentine': ['valentines/valentines_target_brown_red_nocredit.png', 'valentines/valentines_target_white_pink_nocredit.png', 'valentines/valentines_target_brown_gold_nocredit.png', 'valentines/valentines_target_white_gold_nocredit.png'],
			'halloween': ['cauldron/cauldron1.png'],
			'pride': ['target_pool_red.png', 'target_pool_blue.png'],
			'summer': ['target_pool_blue.png', 'target_pool_red.png',],
			'multi': ['chute_black_blue.png', 'chute_black_green.png', 'chute_blue_green.png']
		};

		const themePools = poolMap[theme.toLowerCase()] || poolMap['base'];
		const randomIndex = Math.floor(Math.random() * themePools.length);
		const selectedPool = themePools[randomIndex];
		console.log(`🎯 Selected pool for theme '${theme}': ${selectedPool}`);
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
}

export default AssetManager;
