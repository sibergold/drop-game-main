import AssetManager, { CharacterAsset } from "./asset-manager";

export interface CharacterSelectorConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	visible?: boolean;
}

export class CharacterSelector {
	private scene: Phaser.Scene;
	private assetManager: AssetManager;
	private container!: Phaser.GameObjects.Container;
	private background!: Phaser.GameObjects.Rectangle;
	private titleText!: Phaser.GameObjects.Text;
	private themeButtons: Phaser.GameObjects.Container[] = [];
	private characterCards: Phaser.GameObjects.Container[] = [];
	private selectedCharacter: CharacterAsset | null = null;
	private selectedTheme: string = 'All';
	private gameTheme: string = 'base';
	private onCharacterSelected?: (character: CharacterAsset) => void;
	private config: CharacterSelectorConfig;

	constructor(
		scene: Phaser.Scene,
		assetManager: AssetManager,
		config: CharacterSelectorConfig,
		gameTheme: string = 'base'
	) {
		this.scene = scene;
		this.assetManager = assetManager;
		this.config = config;
		this.gameTheme = gameTheme;

		// Game tema'sını default olarak seç
		this.selectedTheme = gameTheme.charAt(0).toUpperCase() + gameTheme.slice(1);
		console.log(`🎭 Character selector initialized with theme: ${this.selectedTheme}`);

		this.createUI();
		this.createThemeButtons();
		this.loadCharacters();
	}

	private createUI(): void {
		// Ana container
		this.container = this.scene.add.container(this.config.x, this.config.y);
		this.container.setSize(this.config.width, this.config.height);
		this.container.setVisible(this.config.visible !== false);

		// Arka plan
		this.background = this.scene.add.rectangle(
			0, 0, 
			this.config.width, 
			this.config.height, 
			0x000000, 
			0.8
		);
		this.background.setStrokeStyle(2, 0x00ff88);
		this.container.add(this.background);

		// Başlık
		this.titleText = this.scene.add.text(
			0, 
			-this.config.height / 2 + 30, 
			'🎭 Select Character', 
			{
				fontSize: '24px',
				fontFamily: 'Arial',
				color: '#ffffff',
				align: 'center'
			}
		);
		this.titleText.setOrigin(0.5, 0.5);
		this.container.add(this.titleText);

		// Kapatma butonu
		const closeButton = this.scene.add.text(
			this.config.width / 2 - 20, 
			-this.config.height / 2 + 20, 
			'✕', 
			{
				fontSize: '20px',
				color: '#ff6b6b'
			}
		);
		closeButton.setOrigin(0.5, 0.5);
		closeButton.setInteractive({ useHandCursor: true });
		closeButton.on('pointerdown', () => this.hide());
		closeButton.on('pointerover', () => closeButton.setScale(1.2));
		closeButton.on('pointerout', () => closeButton.setScale(1));
		this.container.add(closeButton);

		// Container'ı scene'e ekle
		this.container.setDepth(1000);
	}

	private createThemeButtons(): void {
		const themes = ['All', ...this.assetManager.getAvailableThemes()];
		const buttonWidth = 60;
		const buttonHeight = 25;
		const padding = 4;
		const totalWidth = themes.length * (buttonWidth + padding) - padding;
		const startX = -totalWidth / 2 + buttonWidth / 2;
		const y = -this.config.height / 2 + 60;

		themes.forEach((theme, index) => {
			const x = startX + index * (buttonWidth + padding);
			const buttonContainer = this.scene.add.container(x, y);

			// Buton arka planı
			const isSelected = theme === this.selectedTheme;
			const buttonBg = this.scene.add.rectangle(
				0, 0,
				buttonWidth,
				buttonHeight,
				isSelected ? 0x00ff88 : 0x4a4a4a
			);
			buttonBg.setStrokeStyle(1, isSelected ? 0x00ff88 : 0x666666);
			buttonContainer.add(buttonBg);

			// Buton metni
			const buttonText = this.scene.add.text(0, 0, theme, {
				fontSize: '8px',
				fontFamily: 'Arial',
				color: isSelected ? '#000000' : '#ffffff',
				align: 'center'
			});
			buttonText.setOrigin(0.5, 0.5);
			buttonContainer.add(buttonText);

			// Tıklama etkileşimi
			buttonBg.setInteractive({ useHandCursor: true });
			buttonBg.on('pointerdown', () => this.selectTheme(theme));
			buttonBg.on('pointerover', () => {
				if (theme !== this.selectedTheme) {
					buttonBg.setFillStyle(0x666666);
				}
				buttonContainer.setScale(1.05);
			});
			buttonBg.on('pointerout', () => {
				if (theme !== this.selectedTheme) {
					buttonBg.setFillStyle(0x4a4a4a);
				}
				buttonContainer.setScale(1);
			});

			this.themeButtons.push(buttonContainer);
			this.container.add(buttonContainer);
		});
	}

	private selectTheme(theme: string): void {
		this.selectedTheme = theme;
		console.log(`🎨 Selected theme: ${theme}`);

		// Tema butonlarını güncelle
		this.updateThemeButtons();

		// Karakterleri yeniden yükle
		this.clearCharacterCards();
		this.loadCharacters();
	}

	private updateThemeButtons(): void {
		const themes = ['All', ...this.assetManager.getAvailableThemes()];

		this.themeButtons.forEach((buttonContainer, index) => {
			const theme = themes[index];
			const isSelected = theme === this.selectedTheme;
			const buttonBg = buttonContainer.list[0] as Phaser.GameObjects.Rectangle;
			const buttonText = buttonContainer.list[1] as Phaser.GameObjects.Text;

			buttonBg.setFillStyle(isSelected ? 0x00ff88 : 0x4a4a4a);
			buttonBg.setStrokeStyle(1, isSelected ? 0x00ff88 : 0x666666);
			buttonText.setColor(isSelected ? '#000000' : '#ffffff');
		});
	}

	private clearCharacterCards(): void {
		this.characterCards.forEach(card => card.destroy());
		this.characterCards = [];
	}

	private async loadCharacters(): Promise<void> {
		try {
			// Seçilen temaya göre karakterleri filtrele
			let characters: CharacterAsset[];
			if (this.selectedTheme === 'All') {
				characters = this.assetManager.getAvailableCharacters();
			} else {
				characters = this.assetManager.getCharactersByTheme(this.selectedTheme);
			}

			console.log(`🎭 Loading ${characters.length} characters for theme: ${this.selectedTheme}`);

			// Karakterleri grid halinde düzenle
			const cols = 3;
			const cardWidth = 100;
			const cardHeight = 120;
			const padding = 8;
			const startX = -(cols * (cardWidth + padding)) / 2 + cardWidth / 2;
			const startY = -this.config.height / 2 + 100; // Tema butonları için yer bırak

			// İlk 9 karakteri göster
			const displayCharacters = characters.slice(0, 9);

			for (let i = 0; i < displayCharacters.length; i++) {
				const character = displayCharacters[i];
				const col = i % cols;
				const row = Math.floor(i / cols);

				const x = startX + col * (cardWidth + padding);
				const y = startY + row * (cardHeight + padding);

				await this.createCharacterCard(character, x, y, cardWidth, cardHeight);
			}

			console.log(`✅ Created ${this.characterCards.length} character cards for theme: ${this.selectedTheme}`);

		} catch (error) {
			console.error('❌ Failed to load characters for selector:', error);
		}
	}

	private async createCharacterCard(
		character: CharacterAsset, 
		x: number, 
		y: number, 
		width: number, 
		height: number
	): Promise<void> {
		const cardContainer = this.scene.add.container(x, y);

		// Kart arka planı
		const cardBg = this.scene.add.rectangle(0, 0, width, height, 0x2a2a2a);
		cardBg.setStrokeStyle(2, 0x4a4a4a);
		cardContainer.add(cardBg);

		// Karakter resmi placeholder
		const imageBg = this.scene.add.rectangle(0, -20, 64, 64, 0x4a4a4a);
		cardContainer.add(imageBg);

		// Karakter ismini ekle
		const nameText = this.scene.add.text(0, 35, character.name, {
			fontSize: '12px',
			fontFamily: 'Arial',
			color: '#ffffff',
			align: 'center',
			wordWrap: { width: width - 10 }
		});
		nameText.setOrigin(0.5, 0.5);
		cardContainer.add(nameText);

		// Tema etiketi
		const themeText = this.scene.add.text(0, 50, character.theme, {
			fontSize: '10px',
			fontFamily: 'Arial',
			color: '#aaaaaa',
			align: 'center'
		});
		themeText.setOrigin(0.5, 0.5);
		cardContainer.add(themeText);

		// Karakter texture'ını yükle
		try {
			const textureKey = await this.assetManager.loadCharacterTexture(character.id);
			if (textureKey && this.scene.textures.exists(textureKey)) {
				// Placeholder'ı kaldır ve gerçek resmi ekle
				imageBg.destroy();
				const characterImage = this.scene.add.image(0, -20, textureKey);
				characterImage.setDisplaySize(64, 64);
				cardContainer.add(characterImage);
			}
		} catch (error) {
			console.warn(`⚠️ Failed to load texture for ${character.name}`);
		}

		// Tıklama etkileşimi
		cardBg.setInteractive({ useHandCursor: true });
		cardBg.on('pointerdown', () => this.selectCharacter(character));
		cardBg.on('pointerover', () => {
			cardBg.setStrokeStyle(2, 0x00ff88);
			cardContainer.setScale(1.05);
		});
		cardBg.on('pointerout', () => {
			if (this.selectedCharacter?.id !== character.id) {
				cardBg.setStrokeStyle(2, 0x4a4a4a);
			}
			cardContainer.setScale(1);
		});

		this.characterCards.push(cardContainer);
		this.container.add(cardContainer);
	}

	private selectCharacter(character: CharacterAsset): void {
		this.selectedCharacter = character;
		console.log(`🎭 Selected character: ${character.name}`);

		// Tüm kartların border'ını sıfırla
		this.characterCards.forEach((card, index) => {
			const bg = card.list[0] as Phaser.GameObjects.Rectangle;
			bg.setStrokeStyle(2, 0x4a4a4a);
		});

		// Seçili kartın border'ını vurgula
		const selectedIndex = this.assetManager.getAvailableCharacters()
			.slice(0, 12)
			.findIndex(char => char.id === character.id);
		
		if (selectedIndex >= 0 && this.characterCards[selectedIndex]) {
			const bg = this.characterCards[selectedIndex].list[0] as Phaser.GameObjects.Rectangle;
			bg.setStrokeStyle(2, 0x00ff88);
		}

		// Callback'i çağır
		if (this.onCharacterSelected) {
			this.onCharacterSelected(character);
		}

		// Kısa bir süre sonra gizle
		setTimeout(() => this.hide(), 1000);
	}

	public show(): void {
		this.container.setVisible(true);
	}

	public hide(): void {
		this.container.setVisible(false);
	}

	public toggle(): void {
		this.container.setVisible(!this.container.visible);
	}

	public isVisible(): boolean {
		return this.container.visible;
	}

	public setOnCharacterSelected(callback: (character: CharacterAsset) => void): void {
		this.onCharacterSelected = callback;
	}

	public getSelectedCharacter(): CharacterAsset | null {
		return this.selectedCharacter;
	}

	public destroy(): void {
		this.container.destroy();
		this.characterCards = [];
		this.themeButtons = [];
	}
}

export default CharacterSelector;
