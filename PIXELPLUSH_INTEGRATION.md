# 🎮 PixelPlush Assets Integration Guide

Bu kılavuz, Drop Game projesine PixelPlush assets reposunun nasıl entegre edildiğini ve nasıl kullanılacağını açıklar.

## 📦 Entegrasyon Özeti

### Eklenen Dosyalar
- `src/asset-manager.ts` - PixelPlush asset'larını yöneten ana sınıf
- `src/character-selector.ts` - Oyun içi karakter seçim arayüzü
- `src/pixelplush-test.html` - Asset'ları test etmek için test sayfası
- `src/public/pixelplush/` - Tüm PixelPlush asset'ları

### Güncellenen Dosyalar
- `src/game.ts` - AssetManager ve CharacterSelector entegrasyonu
- `src/avatar.ts` - PixelPlush karakterlerini destekleyecek şekilde güncellendi

## 🎯 Özellikler

### 1. Asset Yönetimi
- **Katalog Sistemi**: `catalog.json` dosyasından otomatik asset yükleme
- **Lazy Loading**: Asset'lar ihtiyaç duyulduğunda yüklenir
- **Fallback Sistemi**: Asset yüklenemezse default sprite'lara geri döner
- **Tema Organizasyonu**: Karakterler temalarına göre gruplandırılır

### 2. Karakter Seçimi
- **Oyun İçi UI**: `C` tuşu ile karakter seçim menüsü açılır
- **Görsel Önizleme**: Karakterlerin gerçek görüntüleri gösterilir
- **Tema Filtreleme**: Karakterler temalarına göre organize edilir
- **Kalıcı Seçim**: Seçilen karakter localStorage'da saklanır

### 3. Dinamik Avatar Sistemi
- **Akıllı Seçim**: Önce seçilen karakter, sonra rastgele karakter kullanılır
- **Otomatik Boyutlandırma**: Karakterler 64x64 piksel boyutunda gösterilir
- **Performans Optimizasyonu**: Texture'lar cache'lenir

## 🚀 Kullanım

### Geliştirme Ortamında Test
```bash
# Dependencies'leri yükle
npm install

# Development server'ı başlat
cd src && npx vite --host

# Test sayfasını aç
http://localhost:3000/pixelplush-test.html

# Ana oyunu aç
http://localhost:3000/debug.html
```

### Oyun İçi Kontroller
- **C Tuşu**: Karakter seçim menüsünü aç/kapat
- **T Tuşu**: Mevcut temaları console'da listele
- **Mouse**: Karakterleri ve temaları seçmek için tıkla
- **ESC/X**: Karakter seçim menüsünü kapat

### Tema Seçimi
1. **C** tuşuna basarak karakter seçim menüsünü açın
2. Üst kısımda tema butonları görünecek:
   - **All**: Tüm karakterler
   - **Halloween**: Cadı, vampir, hayalet vb.
   - **Christmas**: Noel Baba, elf vb.
   - **Easter**: Tavşan, civciv vb.
   - **Valentine**: Ayı karakterleri
   - **Spring**: Çiçek karakterleri
   - **Summer**: Yaz temalı karakterler
   - **Fairy**: Peri karakterleri
   - **Magic**: Büyücü karakterleri
   - **Adventure**: Macera karakterleri
   - **Cute**: Sevimli hayvanlar
   - **Fun**: Eğlenceli karakterler
   - **Pride**: Gökkuşağı temalı
   - **Streamer**: Özel streamer karakterleri
3. İstediğiniz temaya tıklayın
4. O temadaki karakterler otomatik olarak yüklenecek
5. Beğendiğiniz karakteri seçin

### URL Parametreleri
- `?pixelplush=true` - PixelPlush karakterlerini zorla aktif et
- `?debug=true` - Debug modunu aktif et

## 📊 İstatistikler

### Mevcut Asset'lar
- **Toplam Item**: 4000+ asset
- **Karakterler**: 50+ farklı karakter
- **Temalar**: 15+ farklı tema (Halloween, Christmas, Easter, vb.)
- **Formatlar**: PNG, GIF, MP3 dosyaları

### Desteklenen Temalar
- Base (Temel karakterler)
- Halloween (Cadı, vampir, hayalet vb.)
- Christmas (Noel Baba, elf vb.)
- Easter (Tavşan, civciv vb.)
- Valentine (Ayı karakterleri)
- Spring (Çiçek karakterleri)
- Summer (Yaz temalı)
- Fairy (Peri karakterleri)
- Magic (Büyücü karakterleri)
- Adventure (Macera karakterleri)
- Cute (Sevimli hayvanlar)
- Fun (Eğlenceli karakterler)
- Pride (Gökkuşağı temalı)
- Streamer (Özel streamer karakterleri)

## 🔧 Teknik Detaylar

### Asset Manager API
```typescript
// AssetManager kullanımı
const assetManager = new AssetManager(scene);
await assetManager.loadCatalog();

// Karakterleri al
const characters = assetManager.getAvailableCharacters();
const themeCharacters = assetManager.getCharactersByTheme('Halloween');
const randomCharacter = assetManager.getRandomCharacter();

// Karakter texture'ını yükle
const textureKey = await assetManager.loadCharacterTexture(characterId);
```

### Character Selector API
```typescript
// CharacterSelector kullanımı
const selector = new CharacterSelector(scene, assetManager, {
    x: 400, y: 300, width: 600, height: 400
});

// Callback ayarla
selector.setOnCharacterSelected((character) => {
    console.log('Selected:', character.name);
});

// Göster/gizle
selector.show();
selector.hide();
selector.toggle();
```

### Avatar Sistemi
```typescript
// Avatar oluştururken PixelPlush karakteri kullanma
const avatar = new Avatar(username, scene, emoteKey);

// Seçilen karakter localStorage'dan otomatik alınır
localStorage.setItem('selectedPixelPlushCharacter', characterId);
```

## 🎨 Özelleştirme

### Yeni Karakterler Ekleme
1. Karakter dosyalarını `src/public/pixelplush/characters/` klasörüne ekle
2. `catalog.json` dosyasını güncelle
3. Karakter için gerekli sprite'ları ekle (front, back, left, right)

### UI Özelleştirme
- `character-selector.ts` dosyasında UI stillerini değiştir
- CSS stilleri inline olarak tanımlanmış
- Renk şeması ve boyutlar kolayca değiştirilebilir

### Tema Ekleme
- Yeni karakterleri farklı temalarla `catalog.json`'a ekle
- AssetManager otomatik olarak yeni temaları algılar

## 🐛 Sorun Giderme

### Yaygın Sorunlar
1. **Asset'lar yüklenmiyor**: `src/public/pixelplush/` klasörünün doğru yerde olduğunu kontrol edin
2. **Karakterler görünmüyor**: Browser console'da hata mesajlarını kontrol edin
3. **Seçim çalışmıyor**: `C` tuşuna basarak karakter seçim menüsünü açın

### Debug Araçları
- `pixelplush-test.html` - Asset'ları test etmek için
- Browser console - Detaylı log mesajları
- `debug.html` - Oyun debug modu

## 📈 Performans

### Optimizasyonlar
- **Lazy Loading**: Asset'lar ihtiyaç duyulduğunda yüklenir
- **Texture Cache**: Yüklenen texture'lar cache'lenir
- **Fallback System**: Hızlı geri dönüş mekanizması
- **Async Loading**: Asenkron yükleme ile UI bloklanmaz

### Öneriler
- Büyük asset'lar için CDN kullanımı düşünülebilir
- Texture atlas kullanımı performansı artırabilir
- Service worker ile offline cache eklenebilir

## 🔮 Gelecek Geliştirmeler

### Planlanan Özellikler
- Pet sistemi entegrasyonu
- Kostüm/aksesuar sistemi
- Animasyon desteği
- Ses efektleri entegrasyonu
- Kullanıcı favorileri
- Tema bazında filtreleme
- Karakter önizleme animasyonları

### Genişletme İmkanları
- Diğer PixelPlush oyunlarıyla entegrasyon
- Kullanıcı özel karakterleri
- Sosyal özellikler (karakter paylaşımı)
- Achievement sistemi

---

**Not**: Bu entegrasyon PixelPlush Games'in açık kaynak asset'larını kullanır. Tüm asset'lar orijinal sahiplerinin telif hakkı altındadır.
