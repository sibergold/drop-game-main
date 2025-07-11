# 🎮 Kick Drop Game - Çoklu Kullanıcı Kurulumu

Bu rehber, Kick Drop Game'i kendi kanalınızda kullanmak isteyen yayıncılar için hazırlanmıştır.

## 📋 Gereksinimler

- Aktif bir Kick hesabı
- Kick Developer Portal'a erişim
- 2FA (İki Faktörlü Kimlik Doğrulama) etkinleştirilmiş hesap

## 🚀 Kurulum Adımları

### 1. Kick Developer Portal'da Uygulama Oluşturma

1. [Kick.com](https://kick.com) hesabınıza giriş yapın
2. Hesap ayarlarından **2FA'yı etkinleştirin** (zorunlu)
3. Profil menüsünden **"Developer"** sekmesine gidin
4. **"Create Application"** butonuna tıklayın
5. Uygulama bilgilerini doldurun:

#### Uygulama Bilgileri:
- **Application Name**: `Kick Drop Game - [Kanal Adınız]`
- **Description**: 
  ```
  Interactive drop game for Kick streamers. Viewers can join a queue and drop avatars in a physics-based game environment. Features real-time chat integration and scoring system.
  ```
- **Redirect URI**: 
  - **Geliştirme için**: `http://localhost:3000/oauth.html`
  - **Canlı yayın için**: `https://yourdomain.com/oauth.html`

#### Webhook Ayarları (İsteğe Bağlı):
- **Webhook URL**: Boş bırakabilirsiniz
- **Events**: Hiçbirini seçmeyin (şu an kullanılmıyor)

6. **"Create Application"** butonuna tıklayın
7. **Client ID** ve **Client Secret** değerlerini kaydedin

### 2. Oyunu Kurma

#### Seçenek A: Yerel Kurulum

1. Bu projeyi bilgisayarınıza indirin
2. Terminal/Command Prompt açın
3. Proje klasörüne gidin
4. Gerekli paketleri yükleyin:
   ```bash
   npm install
   ```
5. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
6. Tarayıcınızda `http://localhost:3000/oauth.html` adresine gidin

#### Seçenek B: Online Hosting (Önerilen)

**Vercel ile Deploy:**
1. [Vercel](https://vercel.com) hesabı oluşturun
2. Bu GitHub repository'sini fork edin
3. Vercel'de "New Project" ile fork ettiğiniz repo'yu seçin
4. Deploy edin
5. Vercel size bir URL verecek (örn: `https://your-app.vercel.app`)

**Netlify ile Deploy:**
1. [Netlify](https://netlify.com) hesabı oluşturun
2. "New site from Git" ile GitHub repo'nuzu bağlayın
3. Build ayarları:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy edin

### 3. OAuth Kurulumu

1. Hosting URL'nize `/oauth.html` ekleyerek OAuth sayfasına gidin
   - Yerel: `http://localhost:3000/oauth.html`
   - Online: `https://your-app.vercel.app/oauth.html`

2. **"Kick Application Settings"** bölümünde:
   - **Client ID**: Kick Developer Portal'dan aldığınız Client ID'yi girin
   - **Redirect URI**: Otomatik olarak doldurulacak

3. **"Authorize with Kick"** butonuna tıklayın

4. Kick'e yönlendirileceksiniz, uygulamaya izin verin

5. Geri döndüğünüzde overlay URL'si oluşturulacak

### 4. OBS/Streaming Software Kurulumu

1. OAuth işleminden sonra size verilen **Overlay URL**'sini kopyalayın

2. **OBS Studio'da:**
   - Yeni bir **"Browser Source"** ekleyin
   - **URL**: Kopyaladığınız overlay URL'sini yapıştırın
   - **Width**: 1920
   - **Height**: 1080
   - **"Shutdown source when not visible"** işaretini kaldırın
   - **"Refresh browser when scene becomes active"** işaretini kaldırın

3. **Streamlabs OBS'de:**
   - **"+"** butonuna tıklayın
   - **"Browser Source"** seçin
   - URL'yi yapıştırın ve boyutları ayarlayın

## 🎮 Oyun Komutları

### Viewer Komutları:
- `!join` - Kuyruğa katıl
- `!leave` - Kuyruktan ayrıl
- `!queue` - Kuyruk durumunu göster

### Moderatör/Yayıncı Komutları:
- `!start` - Drop sekansını başlat
- `!stop` - Drop sekansını durdur
- `!clear` - Kuyruğu temizle
- `!scores` - Son skorları göster
- `!top` - En yüksek skoru göster
- `!bottom` - En düşük skoru göster
- `!recent` - Son dropları göster

## 🔧 Özelleştirme

### Oyun Ayarları
`src/constants.ts` dosyasında şu ayarları değiştirebilirsiniz:
- Drop hızı
- Fizik ayarları
- Skor hesaplama
- Zaman limitleri

### Görsel Özelleştirme
`src/game.ts` dosyasında:
- Avatar renkleri
- Parçacık efektleri
- UI elementleri

## 🆘 Sorun Giderme

### "Kick Connection Error" Hatası
- Client ID'nin doğru girildiğinden emin olun
- Redirect URI'nin Kick Developer Portal'daki ile aynı olduğunu kontrol edin
- 2FA'nın etkinleştirildiğinden emin olun

### Overlay Görünmüyor
- Browser source URL'sinin doğru olduğunu kontrol edin
- OBS'de browser source boyutlarını kontrol edin
- Tarayıcı konsolunda hata mesajları olup olmadığını kontrol edin

### Chat Komutları Çalışmıyor
- Kick chat'e bağlantının kurulduğunu kontrol edin
- Moderatör yetkilerinizi kontrol edin
- Konsol loglarını kontrol edin

## 📞 Destek

Sorun yaşıyorsanız:
1. Bu README'yi tekrar okuyun
2. GitHub Issues'da sorun bildirin
3. Kick Developer Discord'unda yardım isteyin

## 🎉 Başarılı Kurulum!

Her şey doğru kurulduysa:
- Overlay OBS'de görünüyor olmalı
- Chat komutları çalışıyor olmalı
- Viewerlar `!join` ile kuyruğa katılabilmeli
- Siz `!start` ile oyunu başlatabilmelisiniz

**İyi yayınlar! 🚀**