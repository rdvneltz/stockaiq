# 🚀 StockAIQ - Hızlı Başlangıç Kılavuzu

## ⚡ İlk Kurulum (5 dakika)

### 1️⃣ MongoDB Atlas Kurulumu
```bash
1. https://cloud.mongodb.com adresine git
2. Ücretsiz cluster oluştur (M0 Sandbox)
3. Database User oluştur
4. Network Access → "0.0.0.0/0" ekle (tüm IP'ler)
5. Connection string'i kopyala
```

### 2️⃣ Redis Cloud Kurulumu (Opsiyonel ama önerilen)
```bash
1. https://redis.com/try-free/ adresine git
2. Ücretsiz 30MB veritabanı oluştur
3. Connection string'i kopyala

# VEYA Local Redis
brew install redis  # Mac
redis-server       # Start
```

### 3️⃣ Backend Başlatma
```bash
cd backend

# Packages yükle
npm install

# Environment variables ayarla
cp .env.example .env

# .env dosyasını düzenle:
# - MONGODB_URI=<Atlas connection string>
# - REDIS_URL=redis://localhost:6379 (veya Redis Cloud URL)
# - JWT_SECRET=<rastgele-güvenli-anahtar>

# Klasör oluştur (logs için)
mkdir -p logs

# Sunucuyu başlat
npm run dev

# ✅ Backend http://localhost:5000 adresinde çalışacak
```

### 4️⃣ Frontend Başlatma
```bash
# Yeni terminal aç
cd frontend

# Packages yükle
npm install

# Environment variables
cp .env.local.example .env.local

# Sunucuyu başlat
npm run dev

# ✅ Frontend http://localhost:3000 adresinde açılacak
```

## 🎯 İlk Kullanım

### 1. Kayıt Ol
- http://localhost:3000/register adresine git
- İsim, email, şifre gir
- Otomatik login olacaksın

### 2. İlk Veri Yüklemesi
Backend başladığında otomatik olarak:
- ✅ Borsa verilerini çekmeye başlar
- ✅ Teknik analiz yapar
- ✅ Sentiment analizi çalıştırır
- ✅ Al-sat sinyalleri üretir

**İlk verilerin gelmesi 2-5 dakika sürebilir!**

### 3. Dashboard Kullanımı
- **Dashboard**: Genel bakış, son sinyaller
- **Screener**: P/B, F/K gibi kriterlere göre filtrele
- **Sinyaller**: Tüm al-sat sinyallerini gör
- **Hisse Detay**: Bir hisseye tıkla, detaylı analiz gör

## 🔧 Troubleshooting

### Backend çalışmıyor?
```bash
# Port kullanımda mı kontrol et
lsof -i :5000
kill -9 <PID>  # Varsa kill et

# MongoDB bağlantı hatası?
# - Connection string doğru mu?
# - Network Access ayarları doğru mu?
# - Database user şifresi doğru mu?

# Redis hatası?
# - Local Redis çalışıyor mu? → redis-cli ping
# - REDIS_URL doğru mu?
```

### Frontend çalışmıyor?
```bash
# Port kontrol
lsof -i :3000

# Node modules silip tekrar yükle
rm -rf node_modules package-lock.json
npm install

# Cache temizle
rm -rf .next
npm run dev
```

### Veri gelmiyor?
```bash
# Backend loglarını kontrol et
cd backend
tail -f logs/combined.log

# Servislerin çalıştığını kontrol et
# Logda şunları görmeli:
# - "PriceUpdateService started"
# - "DataCollectorService started"
# - "SentimentAnalysisService started"
```

## 🌐 Deployment (Production)

### Backend → Railway
```bash
1. https://railway.app → Sign up
2. "New Project" → "Deploy from GitHub"
3. StockAIQ repo'yu seç → backend klasörü
4. Environment Variables ekle:
   - MONGODB_URI
   - REDIS_URL
   - JWT_SECRET
   - TWITTER_BEARER_TOKEN (opsiyonel)
   - TELEGRAM_BOT_TOKEN (opsiyonel)
5. Deploy!

# Backend URL: https://stockaiq-backend.railway.app
```

### Frontend → Vercel
```bash
1. https://vercel.com → Sign up
2. "Import Project" → GitHub'dan repo seç
3. Root Directory: "frontend"
4. Environment Variables:
   - NEXT_PUBLIC_API_URL=<Railway backend URL>
   - NEXT_PUBLIC_WS_URL=<Railway backend WS URL>
5. Deploy!

# Frontend URL: https://stockaiq.vercel.app
```

## 📊 Veri Kaynakları Yapılandırma

### Twitter API (Opsiyonel)
```bash
1. https://developer.twitter.com → Apply
2. Free tier Bearer Token al
3. Backend .env → TWITTER_BEARER_TOKEN=...
```

### Telegram Bot (Opsiyonel)
```bash
1. Telegram'da @BotFather'a yaz
2. /newbot → Bot oluştur
3. Token al
4. Backend .env → TELEGRAM_BOT_TOKEN=...
```

### OneSignal (Push Notifications - Opsiyonel)
```bash
1. https://onesignal.com → Sign up
2. Web Push kurulumu yap
3. App ID ve API Key al
4. Backend .env → ONESIGNAL_APP_ID=... ve ONESIGNAL_API_KEY=...
```

## ⚙️ Performans İyileştirmeleri

### Backend
```bash
# PM2 ile production'da çalıştır
npm install -g pm2
pm2 start dist/index.js --name stockaiq
pm2 save
pm2 startup
```

### MongoDB İndeksleme
```javascript
// Backend otomatik oluşturuyor, ama manuel kontrol:
db.stocks.createIndex({ symbol: 1 })
db.pricehistories.createIndex({ symbol: 1, timestamp: -1 })
db.ratios.createIndex({ pb: 1, pe: 1 })
```

### Redis Cache Temizleme
```bash
redis-cli
FLUSHALL  # Tüm cache'i sil
```

## 📈 Sistem Gereksinimleri

### Minimum
- **CPU**: 2 cores
- **RAM**: 2GB
- **Disk**: 10GB
- **Network**: Stable internet

### Önerilen
- **CPU**: 4+ cores
- **RAM**: 4GB+
- **Disk**: 20GB+
- **Network**: 10 Mbps+

## 🔐 Güvenlik

### Production Checklist
- [ ] JWT_SECRET güçlü ve rastgele
- [ ] MongoDB IP whitelist ayarlanmış
- [ ] CORS sadece frontend domain'e izin veriyor
- [ ] Rate limiting aktif
- [ ] HTTPS kullanılıyor
- [ ] Environment variables güvenli
- [ ] Hassas loglar kapatılmış

## 📞 Destek

Herhangi bir sorun yaşarsan:

1. **Logları kontrol et**: `backend/logs/error.log`
2. **GitHub Issues**: Repo'da issue aç
3. **README.md**: Detaylı dokümantasyon

---

**🎉 Başarılar! Artık StockAIQ kullanmaya hazırsın!**

Sistem tamamen çalışır durumda ve:
- ✅ Real-time fiyat güncellemeleri (1-3 sn)
- ✅ Sentiment analizi (1 dk)
- ✅ Al-sat sinyalleri (5 dk)
- ✅ Teknik analiz (15 dk)
- ✅ Finansal veri toplama (6 saat)

aktif olarak çalışıyor! 🚀
