# Kick Entegrasyonu Kurulum Rehberi

Bu proje artık Kick.com entegrasyonu kullanmaktadır. Aşağıdaki adımları takip ederek kurulumu tamamlayabilirsiniz.

## Gereksinimler

- Node.js 18.16.0+
- Kick.com hesabı
- Kick Developer hesabı (https://dev.kick.com/)

## Kurulum Adımları

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Kick Developer Uygulaması Oluşturun

1. https://dev.kick.com/ adresine gidin
2. Kick hesabınızla giriş yapın
3. "Developer" sekmesine gidin
4. Yeni bir uygulama oluşturun
5. Client ID ve Client Secret'ınızı alın

### 3. Konfigürasyon

`src/constants.ts` dosyasında `CLIENT_ID` değerini kendi Kick Client ID'niz ile değiştirin:

```typescript
CLIENT_ID: "your-kick-client-id",
```

### 4. Chatroom ID'sini Bulun

Kick kanalınızın chatroom ID'sini bulmak için:

1. Kick kanalınıza gidin
2. Tarayıcı geliştirici araçlarını açın (F12)
3. Network sekmesine gidin
4. Sayfayı yenileyin
5. `chatroom` içeren istekleri arayın
6. Response'da `chatroom.id` değerini bulun

### 5. OAuth Akışı

Kick OAuth 2.1 akışını kullanır:

1. Uygulamayı başlatın: `npm start`
2. http://localhost:3000 adresine gidin
3. Kick OAuth sayfasına yönlendirileceksiniz
4. Kick hesabınızla giriş yapın ve uygulamayı yetkilendirin
5. Overlay URL builder formunu doldurun
6. Oluşturulan URL'yi OBS'de browser source olarak kullanın

## Önemli Notlar

### Pusher Entegrasyonu

Kick, chat mesajları için Pusher WebSocket kullanır <mcreference link="https://github.com/mattseabrook/KICK.com-Streaming-REST-API" index="1">1</mcreference>:
- Pusher App Key: `eb1d5f283081a78b932c`
- Cluster: `us2`
- Channel Format: `chatrooms.{chatroomId}`
- Event: `App\Events\ChatMessageSentEvent`

### API Endpoints

- User Info: `https://kick.com/api/v1/user`
- Channel Info: `https://kick.com/api/v1/channels/{username}`
- Send Message: `https://kick.com/api/v2/channels/{channel}/chat`

### Emote Desteği

Kick'in emote sistemi Twitch'ten farklıdır <mcreference link="https://github.com/mattseabrook/KICK.com-Streaming-REST-API" index="1">1</mcreference>. Şu anda basit metin tabanlı emote algılama kullanılmaktadır. Gelişmiş emote desteği için Kick'in emote API'sini entegre edebilirsiniz.

### Yetkilendirme

Moderatör ve yayıncı kontrolü için kullanılan alanlar:
- `user.role`: 'broadcaster', 'moderator'
- `user.isSuperAdmin`: boolean

## Sorun Giderme

### Bağlantı Sorunları

1. Chatroom ID'sinin doğru olduğundan emin olun
2. Access token'ın geçerli olduğunu kontrol edin
3. CORS hatalarını önlemek için geliştirme sunucusunu kullanın

### API Hataları

Kick API'si CloudFlare koruması kullanır <mcreference link="https://github.com/SongoMen/kick-chat-wrapper" index="3">3</mcreference>. Bazı endpoint'ler için özel header'lar gerekebilir.

## Test Etme

### Demo Modu

URL'ye `#demo` parametresi ekleyerek test modunda çalıştırabilirsiniz:
```
http://localhost:3000#demo
```

### Chat Komutları

Tüm Twitch komutları Kick için de çalışır:
- `!drop [emote]` - Oyunu oyna
- `!droptop` - En yüksek skoru göster
- `!commands` - Komut listesi
- vb.

## Gelişmiş Özellikler

### Webhook Entegrasyonu

Kick'in resmi API'si webhook desteği sunar <mcreference link="https://github.com/KickEngineering/KickDevDocs" index="5">5</mcreference>. Daha güvenilir entegrasyon için webhook'ları kullanabilirsiniz.

### Kütüphane Alternatifleri

Daha gelişmiş entegrasyon için hazır kütüphaneler mevcuttur:
- KickLib (C#) <mcreference link="https://www.nuget.org/packages/KickLib/" index="2">2</mcreference>
- kick-chat-wrapper (Go) <mcreference link="https://github.com/SongoMen/kick-chat-wrapper" index="3">3</mcreference>

## Destek

Sorularınız için:
- Kick Developer Discord
- GitHub Issues
- Kick.com resmi dokümantasyonu