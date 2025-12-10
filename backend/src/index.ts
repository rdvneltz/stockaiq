import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stockRoutes from './routes/stock.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import healthCheckService from './services/healthCheck.service';
import logger from './utils/logger';
import path from 'path';
import fs from 'fs';

// .env dosyasını yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Logs klasörünü oluştur
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://stockaiq.vercel.app', 'https://stockaiq-*.vercel.app']
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'StockAIQ API',
    version: '1.0.0',
    description: 'BIST Hisse Analiz Sistemi - Backend API',
    endpoints: {
      stocks: '/api/stocks/:symbol',
      multipleStocks: '/api/stocks/multiple',
      health: '/api/health',
      healthCheck: '/api/health/check',
      healthReport: '/api/health/report',
    },
    status: 'operational',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (en sonda olmalı)
app.use(errorHandler);

// Sunucuyu başlat
app.listen(PORT, async () => {
  logger.info(`🚀 StockAIQ Backend started on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}`);

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
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
