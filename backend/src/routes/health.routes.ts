import { Router, Request, Response } from 'express';
import healthCheckService from '../services/healthCheck.service';
import cache from '../utils/cache';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/health
 * Sistem sağlık durumunu kontrol eder
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Son kontrol sonucunu getir (cache'ten hızlı)
    let health = healthCheckService.getLastCheckResult();

    // Eğer hiç kontrol yapılmamışsa, şimdi yap
    if (!health) {
      health = await healthCheckService.checkAllSources();
    }

    // HTTP status code'u genel duruma göre ayarla
    const statusCode = health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 207 : 503;

    res.status(statusCode).json({
      success: true,
      health,
    });

  } catch (error: any) {
    logger.error('Health check API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Sağlık kontrolü yapılamadı',
    });
  }
});

/**
 * GET /api/health/check
 * Tüm veri kaynaklarında yeni sağlık kontrolü yapar
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    logger.info('Manual health check requested');

    const health = await healthCheckService.checkAllSources();

    const statusCode = health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 207 : 503;

    res.status(statusCode).json({
      success: true,
      health,
    });

  } catch (error: any) {
    logger.error('Health check API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Sağlık kontrolü yapılamadı',
    });
  }
});

/**
 * GET /api/health/report
 * Sağlık raporunu metinsel olarak döndürür
 */
router.get('/report', (req: Request, res: Response) => {
  try {
    const report = healthCheckService.getHealthReport();

    res.type('text/plain').send(report);

  } catch (error: any) {
    logger.error('Health report API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Sağlık raporu alınamadı',
    });
  }
});

/**
 * GET /api/health/source/:name
 * Belirli bir veri kaynağının durumunu kontrol eder
 */
router.get('/source/:name', async (req: Request, res: Response) => {
  const { name } = req.params;

  try {
    const health = await healthCheckService.checkSingleSource(name);

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Veri kaynağı bulunamadı',
      });
    }

    const statusCode = health.status === 'operational' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      health,
    });

  } catch (error: any) {
    logger.error(`Health check API error for source ${name}:`, error);

    res.status(500).json({
      success: false,
      error: error.message || 'Sağlık kontrolü yapılamadı',
    });
  }
});

/**
 * GET /api/health/stats
 * Cache ve sistem istatistiklerini döndürür
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const cacheStats = cache.getStats();

    res.json({
      success: true,
      stats: {
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    });

  } catch (error: any) {
    logger.error('Stats API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'İstatistikler alınamadı',
    });
  }
});

export default router;
