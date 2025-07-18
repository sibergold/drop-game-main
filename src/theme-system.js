// Tema Sistemi - Drop Game için
class ThemeSystem {
    constructor() {
        this.availableThemes = {
            default: {
                name: "Varsayılan",
                description: "Standart tema",
                background: "assets/game-parachute/bcg.png",
                pool: "assets/game-parachute/target_pool_blue.png",
                parachutes: "assets/game-parachute/",
                characters: ["boy", "girl", "jimmy", "sammie"],
                effects: []
            },
            winter: {
                name: "Kış Teması",
                description: "Kar ve kış manzarası",
                background: "assets/game-parachute/winter_theme/",
                pool: "assets/game-parachute/winter_theme/",
                parachutes: "assets/game-parachute/winter_theme/",
                characters: ["snowman", "santa", "claus", "yeti_blue"],
                effects: ["snow"]
            },
            christmas: {
                name: "Noel Teması",
                description: "Noel kutlaması",
                background: "assets/game-parachute/christmas_theme/",
                pool: "assets/game-parachute/christmas_theme/",
                parachutes: "assets/game-parachute/christmas_theme/",
                characters: ["santa", "claus", "elf", "elfgirl"],
                effects: ["christmas_lights"]
            },
            autumn: {
                name: "Sonbahar Teması",
                description: "Sonbahar yaprakları",
                background: "assets/game-parachute/autumn_theme/",
                pool: "assets/game-parachute/autumn_theme/",
                parachutes: "assets/game-parachute/autumn_theme/",
                characters: ["witch", "pumpkin_man", "ghost"],
                effects: ["falling_leaves"]
            },
            spring: {
                name: "İlkbahar Teması",
                description: "Çiçekler ve yeşillik",
                background: "assets/game-parachute/spring_theme/",
                pool: "assets/game-parachute/spring_theme/",
                parachutes: "assets/game-parachute/spring_theme/",
                characters: ["rabbit", "chick", "bellflower"],
                effects: ["flowers"]
            },
            summer: {
                name: "Yaz/Havuz Teması",
                description: "Yaz eğlencesi",
                background: "assets/game-parachute/pool_theme/",
                pool: "assets/game-parachute/pool_theme/",
                parachutes: "assets/game-parachute/pool_theme/",
                characters: ["boy", "girl", "sammie", "tori"],
                effects: ["splash"]
            },
            halloween: {
                name: "Cadılar Bayramı",
                description: "Korku ve eğlence",
                background: "assets/game-parachute/cauldron/",
                pool: "assets/game-parachute/cauldron/",
                parachutes: "assets/game-parachute/cauldron/",
                characters: ["witch", "vampire", "ghost", "zombie"],
                effects: ["fog", "bats"]
            },
            valentine: {
                name: "Sevgililer Günü",
                description: "Aşk ve romantizm",
                background: "assets/game-parachute/valentines/",
                pool: "assets/game-parachute/valentines/",
                parachutes: "assets/game-parachute/valentines/",
                characters: ["boy", "girl", "poppy", "koral"],
                effects: ["hearts"]
            }
        };

        this.currentTheme = 'default';
        this.preloadedAssets = {};
    }

    // Tema listesini al
    getAvailableThemes() {
        return Object.keys(this.availableThemes).map(key => ({
            id: key,
            name: this.availableThemes[key].name,
            description: this.availableThemes[key].description
        }));
    }

    // Tema seç
    setTheme(themeId) {
        if (this.availableThemes[themeId]) {
            this.currentTheme = themeId;
            this.preloadThemeAssets(themeId);
            return true;
        }
        return false;
    }

    // Mevcut tema bilgilerini al
    getCurrentTheme() {
        return this.availableThemes[this.currentTheme];
    }

    // Tema varlıklarını önceden yükle
    preloadThemeAssets(themeId) {
        const theme = this.availableThemes[themeId];
        if (!theme) return;

        // Arka plan
        this.preloadImage(this.getBackgroundPath(themeId));
        
        // Havuz
        this.preloadImage(this.getPoolPath(themeId));
        
        // Karakterler
        theme.characters.forEach(character => {
            this.preloadImage(this.getCharacterPath(character));
        });

        // Paraşütler
        this.preloadParachutes(themeId);
    }

    // Görsel önceden yükleme
    preloadImage(src) {
        if (!this.preloadedAssets[src]) {
            const img = new Image();
            img.src = src;
            this.preloadedAssets[src] = img;
        }
        return this.preloadedAssets[src];
    }

    // Arka plan yolu
    getBackgroundPath(themeId = this.currentTheme) {
        const theme = this.availableThemes[themeId];
        if (themeId === 'default') {
            return theme.background;
        }
        return `${theme.background}background.png`;
    }

    // Havuz yolu
    getPoolPath(themeId = this.currentTheme) {
        const theme = this.availableThemes[themeId];
        if (themeId === 'default') {
            return theme.pool;
        }
        return `${theme.pool}pool.png`;
    }

    // Karakter yolu
    getCharacterPath(characterName) {
        return `assets/characters/${characterName}/avatar.png`;
    }

    // Paraşüt yolu
    getParachutePath(color = 'blue', themeId = this.currentTheme) {
        const theme = this.availableThemes[themeId];
        if (themeId === 'default') {
            return `${theme.parachutes}chute_${color}.png`;
        }
        return `${theme.parachutes}parachute_${color}.png`;
    }

    // Rastgele karakter seç
    getRandomCharacter(themeId = this.currentTheme) {
        const theme = this.availableThemes[themeId];
        const characters = theme.characters;
        return characters[Math.floor(Math.random() * characters.length)];
    }

    // Rastgele paraşüt rengi seç
    getRandomParachuteColor() {
        const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'white', 'black'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Tema efektlerini al
    getThemeEffects(themeId = this.currentTheme) {
        return this.availableThemes[themeId].effects || [];
    }

    // Tema seçici HTML'i oluştur
    createThemeSelector() {
        const themes = this.getAvailableThemes();
        let html = '<div class="theme-selector">';
        html += '<h3>Tema Seçin:</h3>';
        html += '<div class="theme-grid">';
        
        themes.forEach(theme => {
            html += `
                <div class="theme-card ${theme.id === this.currentTheme ? 'active' : ''}" 
                     data-theme="${theme.id}">
                    <h4>${theme.name}</h4>
                    <p>${theme.description}</p>
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }

    // Tema seçici stillerini oluştur
    createThemeStyles() {
        return `
            .theme-selector {
                background: rgba(0, 0, 0, 0.8);
                padding: 20px;
                border-radius: 10px;
                margin: 20px;
                color: white;
            }
            
            .theme-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .theme-card {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .theme-card:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .theme-card.active {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.2);
            }
            
            .theme-card h4 {
                margin: 0 0 10px 0;
                color: #fff;
            }
            
            .theme-card p {
                margin: 0;
                color: #ccc;
                font-size: 14px;
            }
        `;
    }
}

// Tema sistemini başlat
const themeSystem = new ThemeSystem();

// Tema değişikliği event listener'ı
document.addEventListener('click', function(e) {
    if (e.target.closest('.theme-card')) {
        const themeCard = e.target.closest('.theme-card');
        const themeId = themeCard.dataset.theme;
        
        // Önceki aktif tema kartını kaldır
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Yeni temayı aktif et
        themeCard.classList.add('active');
        themeSystem.setTheme(themeId);
        
        // Oyunu yeniden başlat (eğer çalışıyorsa)
        if (typeof restartGameWithNewTheme === 'function') {
            restartGameWithNewTheme();
        }
        
        
    }
});

// Export for use in other modules
window.ThemeSystem = ThemeSystem;
window.themeSystem = themeSystem;