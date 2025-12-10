# 🚀 Deployment Guide - Vercel

## 📋 Gereksinimler

### Veritabanı/Servisler
- ❌ **MongoDB**: Gerekmiyor (şu an veritabanı kullanmıyoruz, sadece cache)
- ❌ **Redis**: Opsiyonel (production'da cache için önerilir ama şimdilik gerekli değil)
- ❌ **Cloudflare**: Gerekmiyor
- ✅ **Vercel Account**: Gerekli (ücretsiz plan yeterli)

## 🔧 Deployment Adımları

### 1. GitHub'a Push

```bash
# Repo'yu remote'a ekle (zaten ekliyse atla)
git remote add origin https://github.com/rdvneltz/stockaiq.git

# Commit ve push
git add .
git commit -m "Initial deployment setup"
git push -u origin main
```

### 2. Vercel'de Backend Deploy

1. **Vercel Dashboard**'a git
2. **"Add New Project"** tıkla
3. GitHub repo'yu seç: `rdvneltz/stockaiq`
4. **Framework Preset**: Other
5. **Root Directory**: `backend`
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`
8. **Install Command**: `npm install`

#### Environment Variables (Backend)
```
NODE_ENV=production
CACHE_TTL=15
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

9. **Deploy** tıkla
10. Backend URL'i kopyala (örn: `https://stockaiq-backend.vercel.app`)

### 3. Vercel'de Frontend Deploy

1. **"Add New Project"** tıkla (yeni bir proje)
2. Aynı GitHub repo'yu seç: `rdvneltz/stockaiq`
3. **Framework Preset**: Vite
4. **Root Directory**: `frontend`
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Install Command**: `npm install`

#### Environment Variables (Frontend)
```
VITE_API_URL=https://stockaiq-backend.vercel.app/api
```
*(Backend URL'inizi buraya yapıştırın)*

8. **Deploy** tıkla

### 4. CORS Ayarları (Backend)

Backend deploy edildikten sonra, frontend URL'ini backend CORS'a ekleyin:

`backend/src/index.ts` dosyasında:
```typescript
app.use(cors({
  origin: ['https://your-frontend-url.vercel.app'],
  credentials: true
}));
```

Push edip yeniden deploy edin.

## ✅ Test

1. Frontend URL'i aç (örn: `https://stockaiq.vercel.app`)
2. Bir hisse sembolü gir (THYAO, GARAN vb.)
3. "Analiz Et" butonuna tıkla
4. Verilerin geldiğini kontrol et

## ⚠️ Önemli Notlar

### In-Memory Cache Sorunu
Vercel serverless fonksiyonlarında her istek yeni bir container'da çalıştığı için **in-memory cache (node-cache) çalışmaz**.

**Çözüm Seçenekleri:**

1. **Redis Cloud** (Ücretsiz - Önerilir)
   - [Upstash Redis](https://upstash.com) - Ücretsiz 10,000 komut/gün
   - Environment Variables:
     ```
     REDIS_URL=redis://...
     ```

2. **Vercel KV** (Ücretli)
   - Vercel'in kendi Redis servisi
   - Entegrasyonu kolay

3. **Cache Olmadan** (Şimdilik)
   - Her istekte API'lerden veri çekecek (yavaş olabilir)
   - Rate limiting problemi yaşanabilir

### Rate Limiting
Yahoo Finance ve diğer API'ler fazla istek gelirse engelleyebilir. Production'da:
- Redis cache kullanın
- Rate limiting'i artırın
- CDN kullanın (Vercel otomatik cache yapar)

## 🔄 Güncelleme

Kod değişikliklerini push ettiğinizde Vercel otomatik deploy eder:

```bash
git add .
git commit -m "Update: ..."
git push
```

## 🐛 Sorun Giderme

### Build Hatası
- Vercel dashboard'da "Deployments" > "View Logs"
- TypeScript hatalarını kontrol edin
- Environment variables'ı kontrol edin

### CORS Hatası
- Backend'de frontend URL'ini CORS'a ekleyin
- `Access-Control-Allow-Origin` header'ını kontrol edin

### API Bağlantı Hatası
- Frontend'de `VITE_API_URL` doğru mu?
- Backend çalışıyor mu?
- Network tab'da API isteklerini kontrol edin

## 📊 Production İyileştirmeleri (Opsiyonel)

1. **Redis Cache Ekle**
   ```bash
   npm install ioredis
   ```

2. **Error Monitoring**
   - Sentry
   - LogRocket

3. **Analytics**
   - Vercel Analytics
   - Google Analytics

4. **CDN**
   - Vercel otomatik Edge Network kullanır

---

**Deployment başarılı olursa frontend URL'iniz:**
`https://stockaiq.vercel.app` (veya benzeri)

**Backend URL'iniz:**
`https://stockaiq-backend.vercel.app`
