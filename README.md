# 📊 StockAIQ - BIST Hisse Analiz Sistemi

Borsa İstanbul (BIST) hisselerinin detaylı analizini yapmanızı sağlayan profesyonel bir web uygulaması.

## ✨ Özellikler

### 🎯 Tek Ekran Detaylı Analiz
- Hisse seçimi ile **tek tıkla** kapsamlı bilanço ve piyasa analizi
- 50+ veri noktası tek ekranda
- Gerçek zamanlı fiyat ve hacim verileri
- Finansal tablo detayları (hasılat, karlılık, borç yapısı)

### 📈 Veri Noktaları
- **Fiyat Verileri**: Anlık, günlük, 7 gün, 30 gün, 52 hafta yüksek/düşük
- **İşlem Verileri**: Alış/satış, hacim, lot büyüklüğü
- **Temel Göstergeler**: F/K, PD/DD, FD/FAVO, PD/EBITDA, piyasa değeri
- **Finansal Tablo**: Hasılat, brüt kar, net kar, karlılık, öz sermaye, varlıklar, borçlar
- **Detaylı Bilanço**: Ticari alacaklar, finansal yatırımlar, banka kredileri, vb.
- **AI Değerlendirme**: Otomatik değerleme, karlılık, borç analizi

### 🏥 Self-Monitoring Sistem
- Veri kaynaklarının otomatik sağlık kontrolü
- Sorun durumunda anlık kullanıcı uyarısı
- 5 dakikalık periyodik kontrol
- Kaynak bazında hata raporlama

### 🔄 Çoklu Veri Kaynağı
- **Yahoo Finance**: Fiyat ve temel finansal veriler
- **KAP (Kamu Aydınlatma Platformu)**: Resmi bilanço verileri
- **Investing.com**: Güncel piyasa verileri
- Otomatik veri birleştirme ve önceliklendirme

### ⚙️ Ücretli API Desteği
- Gelecekte kullanılmak üzere API entegrasyonu altyapısı
- Finnet, Matriks, BIST API hazır
- Ayarlar sayfasından kolay aktivasyon

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Backend Kurulumu

```bash
cd backend
npm install
npm run dev
```

Backend http://localhost:5000 adresinde çalışacaktır.

### Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

Frontend http://localhost:3000 adresinde çalışacaktır.

## 📖 Kullanım

1. **Hisse Arama**: Ana sayfada hisse sembolünü girin (örn: THYAO, GARAN, AKBNK)
2. **Analiz Görüntüleme**: "Analiz Et" butonuna tıklayın
3. **Veri İnceleme**: Tek ekranda tüm verileri görüntüleyin
4. **Sistem Durumu**: Ayarlar sayfasından veri kaynaklarını kontrol edin

## 🛠️ Teknoloji Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Yahoo Finance API** - Fiyat ve finansal veriler
- **Axios** + **Cheerio** - Web scraping (KAP, Investing.com)
- **Winston** - Loglama
- **Node-Cache** - Veri önbellekleme
- **Express Rate Limit** - API koruma

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Hızlı geliştirme
- **React Router** - Sayfa yönlendirme
- **Axios** - API iletişimi
- **Lucide Icons** - İkonlar

## 🔧 Konfigürasyon

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
CACHE_TTL=15                    # Dakika
RATE_LIMIT_WINDOW_MS=60000      # 1 dakika
RATE_LIMIT_MAX_REQUESTS=100

# Ücretli API Anahtarları (opsiyonel)
# FINNET_API_KEY=
# MATRIKS_API_KEY=
# BIST_API_KEY=
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🏗️ Mimari

```
Frontend (React/Vite)
    ↓
Backend API (Express)
    ↓
┌─────────────────────────────┐
│   Data Aggregator Service   │
│  (Veri Birleştirme Katmanı) │
└─────────────────────────────┘
    ↓           ↓           ↓
Yahoo Finance  KAP  Investing.com
    ↓
Cache (15 dakika TTL)
    ↓
Health Check (5 dakika periyodik)
```

## 📊 API Endpoints

### Hisse Verileri
- `GET /api/stocks/:symbol` - Tek hisse verisi
- `POST /api/stocks/multiple` - Çoklu hisse verisi
- `DELETE /api/stocks/:symbol/cache` - Cache temizle

### Sistem Sağlığı
- `GET /api/health` - Sistem durumu
- `GET /api/health/check` - Yeni sağlık kontrolü
- `GET /api/health/report` - Detaylı rapor
- `GET /api/health/stats` - Sistem istatistikleri

## ⚠️ Önemli Notlar

### Web Scraping
- Sistem KAP ve Investing.com'dan web scraping ile veri çeker
- Site yapısı değişirse scraper'lar güncellenmelidir
- Health check sistemi sorunları otomatik tespit eder

### Rate Limiting
- API varsayılan: 100 istek/dakika
- Aşırı yüklenmeyi önler
- Gerekirse .env'den ayarlanabilir

### Cache
- Veriler 15 dakika önbelleklenir
- Manuel temizleme mümkün
- Gereksiz API çağrılarını azaltır

## 🔮 Gelecek Özellikler

- [ ] Çoklu hisse karşılaştırma
- [ ] Grafik ve görselleştirme (Recharts)
- [ ] PDF/Excel export
- [ ] Watchlist (favori hisseler)
- [ ] E-posta bildirimleri
- [ ] Tarihsel veri grafikleri
- [ ] Sektör analizi
- [ ] OpenAI entegrasyonu (GPT analiz)

## 📝 Lisans

Bu proje özel kullanım içindir.

## 🤝 Katkıda Bulunma

Sorun bildirimi ve öneriler için GitHub Issues kullanabilirsiniz.

---

**Not**: Bu sistem ücretsiz veri kaynaklarını kullanır. Gerçek zamanlı ve tam doğruluk için ücretli API'ler gerekebilir.
