# StockAIQ - Borsa İstanbul Al-Sat Platformu

**Profesyonel Real-time Hisse Analizi ve Trading Sinyalleri**

## ✨ Özellikler

### 📊 Real-time Veri
- **1-3 saniye** fiyat güncellemeleri (WebSocket)
- Anlık hacim ve fiyat değişimleri
- Live trading sinyalleri

### 🎯 Al-Sat Sinyalleri
- Fundamental + Technical + Sentiment hibrit analiz
- 3 farklı hedef fiyat yöntemi (Sektör, Fibonacci, Destek-Direnç)
- Özelleştirilebilir sinyal kriterleri
- Risk/Ödül oranı hesaplama

### 📰 Sentiment Analizi (1 dakika interval)
- KAP bildirimleri
- Twitter/X feeds
- Bloomberg HT & Ekonomi siteleri RSS
- Türkçe NLP analizi
- Önem seviyesi filtreleme

### 🔍 Gelişmiş Screener
- P/B, F/K, ROE, Borç/Özkaynak filtreleme
- Özel kriterlere göre tarama
- AND/OR mantıksal bağlantılar
- Kayıtlı strateji şablonları

### 📈 Teknik Analiz
- RSI, MACD, Bollinger Bands
- SMA 50/100/200
- Destek-Direnç seviyeleri
- Hacim analizi

### 💼 Portföy Takibi
- Watchlist (20+ hisse)
- Portfolio tracking
- Performans analizi

### 🔔 Bildirimler
- Push notifications (OneSignal)
- Telegram bot
- Sesli uyarılar
- Email bildirimleri

## 🛠️ Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- Redis (Caching)
- Socket.IO (WebSocket)
- Node-cron (Scheduler)

### Frontend
- Next.js 14 (App Router)
- React 18 + TypeScript
- TailwindCSS + Shadcn/UI
- React Query
- Lightweight Charts

### Services
- **PriceUpdateService**: Real-time fiyat güncellemeleri
- **DataCollectorService**: KAP finansal veri toplama
- **TechnicalAnalysisService**: Teknik indikatör hesaplama
- **SentimentAnalysisService**: Haber ve sentiment analizi
- **StrategyEngineService**: Al-sat sinyal üretimi
- **NotificationService**: Multi-channel bildirimler

## 🚀 Kurulum

### 1. Prerequisites
```bash
Node.js 18+
MongoDB
Redis
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### 4. Docker (Opsiyonel)
```bash
docker-compose up -d
```

## 📁 Proje Yapısı

```
StockAIQ/
├── backend/
│   ├── src/
│   │   ├── controllers/       # API controllers
│   │   ├── models/            # MongoDB models
│   │   ├── routes/            # Express routes
│   │   ├── services/          # Business logic
│   │   │   ├── data-collector/
│   │   │   ├── technical-analysis/
│   │   │   ├── sentiment/
│   │   │   ├── strategy-engine/
│   │   │   └── notifications/
│   │   ├── utils/             # Helper functions
│   │   └── index.ts           # Entry point
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   └── lib/              # Utils, API, WebSocket
└── shared/
    └── types/                # Shared TypeScript types
```

## 🔑 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=...
TWITTER_BEARER_TOKEN=...
TELEGRAM_BOT_TOKEN=...
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5001
```

## 🔄 Data Sources

| Kaynak | Veri Türü | Güncelleme | Maliyet |
|--------|-----------|------------|---------|
| Yahoo Finance | Fiyat | Real-time | ✅ Ücretsiz |
| KAP API | Finansal tablolar | 6 saat | ✅ Ücretsiz |
| Twitter API | Sentiment | Real-time | ✅ Free tier |
| Bloomberg HT RSS | Haberler | 30 saniye | ✅ Ücretsiz |

## 📊 Veri Akışı

1. **PriceUpdateService** → Yahoo Finance/IS Investment → MongoDB + Redis → WebSocket → Frontend
2. **DataCollectorService** → KAP API → Finansal hesaplama → MongoDB
3. **TechnicalAnalysisService** → Price History → Indicator calculation → MongoDB
4. **SentimentAnalysisService** → KAP/Twitter/RSS → NLP Analysis → MongoDB → Notifications
5. **StrategyEngineService** → All Data → Signal Generation → MongoDB → Notifications

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş yap
- `GET /api/auth/profile` - Profil bilgisi

### Stocks
- `GET /api/stocks` - Tüm hisseler
- `GET /api/stocks/:symbol` - Hisse detayı
- `POST /api/stocks/screen` - Filtreleme

### Signals
- `GET /api/signals` - Tüm sinyaller
- `GET /api/signals/:symbol` - Hisse sinyali

### Watchlist
- `GET /api/watchlist` - Takip listesi
- `POST /api/watchlist` - Hisse ekle
- `DELETE /api/watchlist/:symbol` - Hisse çıkar

### Portfolio
- `GET /api/portfolio` - Portföy
- `POST /api/portfolio` - Pozisyon ekle
- `DELETE /api/portfolio/:symbol` - Pozisyon çıkar

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Railway/Render)
```bash
# Railway
railway up

# Render
# Dashboard'dan deploy
```

### Environment Variables
Backend ve Frontend için gerekli environment variable'ları deployment platformunda ayarla.

## 📝 Todo / Roadmap

- [ ] Advanced chart drawing tools
- [ ] Custom strategy builder UI
- [ ] Backtesting engine
- [ ] Machine learning price prediction
- [ ] Mobile app (React Native)
- [ ] Portfolio optimization
- [ ] Alert rule builder
- [ ] Sector analysis dashboard
- [ ] Peer comparison tool
- [ ] Export reports (PDF/Excel)

## 🤝 Contributing

Bu proje private kullanım için geliştirilmiştir.

## 📄 License

MIT

## 👤 Developer

[@rdvneltz](https://github.com/rdvneltz)

---

**⚠️ Disclaimer**: Bu platform sadece bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir. Yatırım kararlarınızdan siz sorumlusunuz.
