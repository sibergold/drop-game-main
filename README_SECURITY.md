# Güvenlik ve Environment Variables Rehberi

## 🔒 Güvenlik Önlemleri

Bu proje, hassas bilgileri güvenli bir şekilde yönetmek için environment variables kullanır.

### 📋 Environment Variables Listesi

| Değişken | Açıklama | Varsayılan Değer | Gerekli |
|----------|----------|------------------|----------|
| `CENTRAL_CLIENT_ID` | Kick.com OAuth Client ID | `YOUR_CENTRAL_CLIENT_ID_HERE` | ✅ |
| `KICK_PUSHER_KEY` | Kick.com Pusher anahtarı | `eb1d5f283081a78b932c` | ❌ |
| `KICK_PUSHER_CLUSTER` | Kick.com Pusher cluster | `us2` | ❌ |
| `KICK_OAUTH_BASE_URL` | OAuth yetkilendirme URL'si | `https://kick.com/oauth2/authorize` | ❌ |
| `KICK_AUTH_ENDPOINT` | Pusher auth endpoint | `https://kick.com/broadcasting/auth` | ❌ |
| `KICK_API_BASE_URL` | Kick.com API base URL | `https://kick.com/api/v1` | ❌ |
| `SERVER_HOST` | Sunucu host adresi | `localhost` | ❌ |
| `SERVER_PORT` | Sunucu port numarası | `3000` | ❌ |
| `NODE_ENV` | Çalışma ortamı | `development` | ❌ |

## 🚀 Kurulum Adımları

### 1. Environment Dosyasını Oluşturun

```bash
# .env.example dosyasını kopyalayın
cp .env.example .env
```

### 2. Gerekli Değerleri Doldurun

`.env` dosyasını açın ve aşağıdaki değerleri güncelleyin:

```env
# Kick.com Developer Dashboard'dan alın
CENTRAL_CLIENT_ID=your_actual_client_id_here

# Diğer ayarlar (isteğe bağlı)
SERVER_HOST=localhost
SERVER_PORT=3000
NODE_ENV=development
```

### 3. Kick.com Client ID Alma

1. [Kick.com Developer Dashboard](https://kick.com/developer/applications)'a gidin
2. Yeni bir uygulama oluşturun
3. Client ID'yi kopyalayın
4. `.env` dosyasındaki `CENTRAL_CLIENT_ID` değerini güncelleyin

## 🛡️ Güvenlik En İyi Uygulamaları

### ✅ Yapılması Gerekenler

- ✅ `.env` dosyasını **asla** version control'e commit etmeyin
- ✅ Production ve development için farklı Client ID'ler kullanın
- ✅ Client ID'leri düzenli olarak yenileyin
- ✅ `.env.example` dosyasını güncel tutun
- ✅ Hassas bilgileri sadece environment variables'da saklayın

### ❌ Yapılmaması Gerekenler

- ❌ Client ID'leri kaynak kodda hardcode etmeyin
- ❌ `.env` dosyasını public repository'lerde paylaşmayın
- ❌ Production credentials'ları development ortamında kullanmayın
- ❌ Environment variables'ları console.log ile yazdırmayın

## 🔧 Geliştirme Ortamı

### Local Development

```bash
# Dependencies yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env

# Gerekli değerleri doldurun
# CENTRAL_CLIENT_ID=your_client_id_here

# Development server'ı başlatın
npm start
```

### Production Deployment

```bash
# Production build
npm run build

# Environment variables'ları production sunucusunda ayarlayın
export CENTRAL_CLIENT_ID="your_production_client_id"
export NODE_ENV="production"
export SERVER_HOST="0.0.0.0"
export SERVER_PORT="80"

# Production server'ı başlatın
npm start
```

## 🚨 Güvenlik Sorunları

Eğer bir güvenlik sorunu tespit ederseniz:

1. **Hemen** etkilenen credentials'ları yenileyin
2. `.env` dosyasını kontrol edin
3. Git history'sinde hassas bilgi olup olmadığını kontrol edin
4. Gerekirse repository'yi temizleyin

## 📝 Dosya Yapısı

```
.
├── .env                 # Hassas bilgiler (GIT'e commit edilmez)
├── .env.example         # Template dosyası (GIT'e commit edilir)
├── .gitignore           # .env dosyalarını ignore eder
├── src/
│   ├── central-config.ts    # Environment variables kullanır
│   ├── kick.ts             # Environment variables kullanır
│   ├── constants.ts        # Environment variables kullanır
│   └── server.ts           # Environment variables kullanır
└── README_SECURITY.md   # Bu dosya
```

## 🔍 Environment Variables Kontrolü

Uygulama başlatılmadan önce gerekli environment variables'ların ayarlandığından emin olun:

```typescript
// Örnek kontrol kodu
if (!process.env.CENTRAL_CLIENT_ID || process.env.CENTRAL_CLIENT_ID === 'YOUR_CENTRAL_CLIENT_ID_HERE') {
    console.error('❌ CENTRAL_CLIENT_ID environment variable is not set!');
    process.exit(1);
}
```

---

**⚠️ Önemli:** Bu dosyayı güncel tutun ve yeni environment variables eklendiğinde bu dokümantasyonu güncelleyin.