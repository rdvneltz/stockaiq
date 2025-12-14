import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stockRoutes from './routes/stock.routes';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import portfolioRoutes from './routes/portfolio.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import healthCheckService from './services/healthCheck.service';
import database from './utils/database';
import logger from './utils/logger';
import path from 'path';
import fs from 'fs';

// .env dosyasını yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Logs klasörünü oluştur (sadece local development)
if (process.env.NODE_ENV !== 'production') {
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Allowed origins for CORS
const productionOrigins: (string | RegExp)[] = [
  // Render domains
  'https://stockaiq-frontend.onrender.com',
  /^https:\/\/stockaiq.*\.onrender\.com$/,
];
if (process.env.FRONTEND_URL) {
  productionOrigins.push(process.env.FRONTEND_URL);
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? productionOrigins
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// API Routes
app.use('/api/stocks', stockRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'StockAIQ API',
    version: '2.0.0',
    description: 'BIST Hisse Analiz Sistemi - Backend API (with Auth, Portfolio, Accumulation Detection)',
    endpoints: {
      stocks: '/api/stocks/:symbol',
      multipleStocks: '/api/stocks/multiple',
      health: '/api/health',
      healthCheck: '/api/health/check',
      healthReport: '/api/health/report',
      auth: '/api/auth',
      register: '/api/auth/register',
      login: '/api/auth/login',
      portfolios: '/api/portfolios',
      portfolioAnalysis: '/api/portfolios/:id/analysis',
    },
    features: [
      'Sektör bazlı değerleme',
      'Birikim/Dağıtım tespiti',
      'Al/Sat seviyeleri',
      'Portfolio yönetimi ve risk analizi',
      'AI fiyat hedefleri',
    ],
    status: 'operational',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (en sonda olmalı)
app.use(errorHandler);

// Render veya diğer container-based hosting için sunucuyu başlat
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isServerless) {
  // Vercel/Lambda serverless ortamda periyodik check yapma
  database.connect().catch(err =>
    logger.error('MongoDB connection failed:', err)
  );
  healthCheckService.checkAllSources().catch(err =>
    logger.error('Initial health check failed:', err)
  );
} else {
  // Render, Railway veya local development için sunucuyu başlat
  app.listen(PORT, async () => {
    logger.info(`🚀 StockAIQ Backend started on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 API URL: http://localhost:${PORT}`);

    // MongoDB'ye bağlan (optional - sistem MongoDB olmadan da çalışır)
    logger.info('🗄️  Connecting to MongoDB...');
    await database.connect();

    // Başlangıçta sistem sağlık kontrolü yap
    logger.info('🏥 Running initial health check...');
    try {
      const health = await healthCheckService.checkAllSources();
      logger.info(`✅ Health check completed: ${health.overall}`);

      // Sorun varsa uyarı ver
      if (health.overall !== 'healthy') {
        logger.warn('⚠️  UYARI: Bazı veri kaynakları çalışmıyor!');
        logger.warn(healthCheckService.getHealthReport());
      }
    } catch (error) {
      logger.error('❌ Initial health check failed:', error);
    }

    // Periyodik sağlık kontrolünü başlat
    healthCheckService.startPeriodicCheck();
    logger.info('🔄 Periodic health check started (every 5 minutes)');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await database.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await database.disconnect();
    process.exit(0);
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Export for Vercel serverless
export default app;
