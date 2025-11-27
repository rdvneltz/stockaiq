# 🚀 StockAIQ - Production Deployment Rehberi

## 📋 Gerekli Hesaplar

1. ✅ MongoDB Atlas (Zaten kurulmuş)
2. ⬜ Redis Cloud (Ücretsiz 30MB)
3. ⬜ Railway.app (Backend için)
4. ✅ Vercel (Frontend için - zaten bağlanmış)
5. ⬜ Telegram Bot (Opsiyonel)
6. ⬜ OneSignal (Opsiyonel)

---

## 1️⃣ REDIS CLOUD KURULUMU (5 dakika)

### Adım 1: Hesap Oluştur
```
1. https://redis.com/try-free/ adresine git
2. "Get Started Free" tıkla
3. Email ile kayıt ol
```

### Adım 2: Database Oluştur
```
1. Dashboard → "Create database"
2. Plan seç: "Free" (30MB)
3. Cloud: AWS
4. Region: US-East-1 (en yakın)
5. "Create database" tıkla
```

### Adım 3: Connection String Al
```
1. Database'e tıkla
2. "Configuration" tab
3. "Public endpoint" kopyala
4. Format: redis://default:PASSWORD@redis-xxxxx.redislabs.com:xxxxx

ÖRNEĞİN:
redis://default:abc123xyz@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

**BU URL'İ KAYDET - Backend deployment'ta kullanacağız!**

---

## 2️⃣ BACKEND DEPLOYMENT (Railway.app)

### Adım 1: Railway Hesabı
```
1. https://railway.app adresine git
2. "Start a New Project" tıkla
3. GitHub ile login ol
4. StockAIQ repo'suna erişim ver
```

### Adım 2: Proje Oluştur
```
1. "Deploy from GitHub repo" seç
2. "rdvneltz/StockAIQ" seç
3. "Add variables" tıkla
```

### Adım 3: Environment Variables Ekle

Railway dashboard'da **Variables** sekmesine git ve bunları ekle:

```env
# ZORUNLU VARIABLES
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb+srv://stockaiq:stocksmyiq@stockaiq.jpc6g8y.mongodb.net/?appName=stockaiq

REDIS_URL=redis://default:YOUR_PASSWORD@redis-xxxxx.redislabs.com:xxxxx

JWT_SECRET=stockaiq-super-secret-jwt-key-2024-production-change-this

JWT_EXPIRES_IN=7d

FRONTEND_URL=https://stockaiq.vercel.app

PRICE_UPDATE_INTERVAL=3000
SENTIMENT_UPDATE_INTERVAL=60000
FINANCIAL_UPDATE_INTERVAL=21600000

WS_PORT=5001

# OPSİYONEL (şimdilik boş bırak)
TWITTER_BEARER_TOKEN=
TELEGRAM_BOT_TOKEN=
ONESIGNAL_APP_ID=
ONESIGNAL_API_KEY=
```

### Adım 4: Build Ayarları
```
1. "Settings" sekmesine git
2. "Build Command": npm install && npm run build
3. "Start Command": npm start
4. "Root Directory": backend
5. "Watch Paths": backend/**
```

### Adım 5: Deploy
```
1. "Deploy" butonuna bas
2. Build loglarını izle (5-10 dakika)
3. Deploy tamamlandığında URL alacaksın:
   Örnek: https://stockaiq-production.up.railway.app

BU URL'İ KAYDET!
```

---

## 3️⃣ FRONTEND DEPLOYMENT (Vercel)

### Vercel Environment Variables

Vercel dashboard'a git:
```
1. Project Settings → Environment Variables
2. Şunları ekle:
```

```env
# ZORUNLU
NEXT_PUBLIC_API_URL=https://stockaiq-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://stockaiq-production.up.railway.app
NEXTAUTH_SECRET=stockaiq-nextauth-secret-2024-production
NEXTAUTH_URL=https://stockaiq.vercel.app
```

### Build Ayarları Kontrol
```
1. Vercel Project Settings → General
2. Framework Preset: Next.js
3. Root Directory: frontend
4. Build Command: npm run build
5. Output Directory: .next
6. Install Command: npm install
```

### Yeniden Deploy
```
1. Deployments sekmesine git
2. Son deployment'ın sağındaki "..." → "Redeploy"
3. Build loglarını izle
4. ✅ Production'da yayınlanacak!
```

---

## 4️⃣ TELEGRAM BOT KURULUMU (Opsiyonel - 3 dakika)

### Adım 1: Bot Oluştur
```
1. Telegram'ı aç
2. @BotFather'ı ara
3. /newbot komutunu gönder
4. Bot ismi gir: StockAIQ Bot
5. Bot username gir: stockaiq_trader_bot
```

### Adım 2: Token Al
```
BotFather şöyle bir mesaj gönderecek:

Done! Congratulations on your new bot.
Token: 6789012345:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw

BU TOKEN'I KAYDET!
```

### Adım 3: Backend'e Ekle
```
Railway dashboard → Variables sekmesi:

TELEGRAM_BOT_TOKEN=6789012345:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw

Kaydet → Otomatik redeploy olacak
```

### Adım 4: Bot'u Test Et
```
1. Telegram'da kendi botunu ara
2. /start gönder
3. Bot aktif olacak ve bildirim göndermeye hazır!
```

---

## 5️⃣ ONESIGNAL KURULUMU (Opsiyonel - 5 dakika)

### Adım 1: Hesap Oluştur
```
1. https://onesignal.com adresine git
2. "Get Started Free" tıkla
3. Email ile kayıt ol
```

### Adım 2: App Oluştur
```
1. "New App/Website" tıkla
2. İsim gir: StockAIQ
3. Platform seç: "Web Push"
4. "Next" tıkla
```

### Adım 3: Web Push Configuration
```
1. Site URL: https://stockaiq.vercel.app
2. "My site is not fully HTTPS" seçeneğini AÇMA
3. "Save" tıkla
```

### Adım 4: App ID ve API Key Al
```
1. Settings → Keys & IDs
2. Kopyala:
   - OneSignal App ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   - REST API Key: YourRestAPIKey
```

### Adım 5: Backend'e Ekle
```
Railway dashboard → Variables:

ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_API_KEY=YourRestAPIKey

Kaydet
```

---

## 6️⃣ TWITTER API (Opsiyonel - 10 dakika)

### Adım 1: Developer Account
```
1. https://developer.twitter.com adresine git
2. "Sign up" tıkla
3. Developer account başvurusu yap
   - Use case: "Bot/automation"
   - Description: "Stock market sentiment analysis"
```

### Adım 2: App Oluştur
```
1. Dashboard → "Create Project"
2. Project name: StockAIQ
3. App name: StockAIQ Sentiment
4. Environment: Production
```

### Adım 3: Bearer Token Al
```
1. Keys and Tokens sekmesi
2. "Bearer Token" kopyala
3. Format: AAAAAAAAAAAAAAAAAAAAAxxxxxxxxxxxxxxxxxxxxxxxx
```

### Adım 4: Backend'e Ekle
```
Railway dashboard → Variables:

TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAxxxxxxxxxxxxxxxxxxxxxxxx
```

**NOT:** Twitter API ücretsiz tier'da aylık 500,000 tweet limit var.

---

## ✅ DEPLOYMENT KONTROL LİSTESİ

### Backend (Railway)
- [ ] MongoDB URI doğru
- [ ] Redis URL eklenmiş
- [ ] JWT_SECRET ayarlanmış
- [ ] FRONTEND_URL Vercel URL'si
- [ ] Build başarılı
- [ ] Logs'ta hata yok
- [ ] Health check çalışıyor: `https://YOUR-RAILWAY-URL/health`

### Frontend (Vercel)
- [ ] NEXT_PUBLIC_API_URL Railway URL'si
- [ ] NEXT_PUBLIC_WS_URL Railway WSS URL'si
- [ ] Build başarılı
- [ ] Login sayfası açılıyor
- [ ] API bağlantısı çalışıyor

### Test Et
```bash
# Backend health check
curl https://YOUR-RAILWAY-URL/health

# Frontend
https://stockaiq.vercel.app → Login olabilmeli
```

---

## 🔧 SORUN GİDERME

### "Production yok" Hatası (Vercel)
```
Sebep: Root directory yanlış ayarlanmış

Çözüm:
1. Vercel Project Settings → General
2. Root Directory: frontend
3. Save
4. Redeploy
```

### Backend Deploy Edilmiyor
```
1. Railway logs kontrol et
2. package.json'da "build" script var mı?
3. tsconfig.json doğru mu?
4. Environment variables eksiksiz mi?
```

### MongoDB Bağlantı Hatası
```
1. MongoDB Atlas → Network Access
2. "0.0.0.0/0" IP ekle (tüm IP'lere izin)
3. Database User şifresi doğru mu kontrol et
```

### WebSocket Çalışmıyor
```
1. Railway'de WebSocket enable edilmeli (otomatik)
2. Frontend'te wss:// kullan (https için)
3. CORS ayarları kontrol et
```

---

## 📊 DEPLOYMENT SONRASI

### İlk Veri Gelişi
```
1. Backend deploy olduktan 2-3 dakika sonra:
   - Servisler başlayacak
   - İlk hisse verileri çekilecek
   - Sinyaller üretilecek

2. İlk kullanıcı kaydı:
   - Frontend'e git
   - Register ol
   - Dashboard'a yönlendirileceksin
   - İlk sinyaller 5-10 dakikada görünecek
```

### Monitoring
```
Railway Dashboard:
- Metrics sekmesinde CPU, RAM, Network görebilirsin
- Logs sekmesinde real-time logları izle

Vercel Dashboard:
- Analytics'te trafik görürsün
- Logs'ta hataları görebilirsin
```

---

## 💰 MALİYET TAHMİNİ

### Ücretsiz Tier (Şu anki setup)
- MongoDB Atlas M0: ✅ Ücretsiz (512MB)
- Redis Cloud: ✅ Ücretsiz (30MB)
- Railway: ✅ $5 ücretsiz kredi/ay (yeterli olmalı)
- Vercel: ✅ Ücretsiz (hobby plan)
- **TOPLAM: $0/ay** (Railway kredisi biterse ~$5-10/ay)

### Ücretli Yükseltme (İleride gerekirse)
- MongoDB Atlas M10: ~$57/ay (dedicated)
- Redis Cloud 1GB: ~$12/ay
- Railway Pro: ~$20/ay
- Vercel Pro: ~$20/ay
- **TOPLAM: ~$109/ay**

---

## 🎯 DEPLOYMENT SIRASI (Önerilen)

```
1. ✅ MongoDB Atlas kurulu
2. ⬜ Redis Cloud kur (5 dk)
3. ⬜ Railway'de backend deploy et (10 dk)
4. ⬜ Vercel'de frontend redeploy et (5 dk)
5. ⬜ Test et (login, dashboard, sinyaller)
6. ⬜ İsteğe bağlı: Telegram bot ekle
7. ⬜ İsteğe bağlı: OneSignal ekle
```

**Toplam süre: ~20-30 dakika**

---

Herhangi bir sorun olursa Railway ve Vercel loglarını kontrol et!

**🚀 İyi deploymentlar!**
