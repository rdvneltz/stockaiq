import { Router, Response } from 'express';
import { adminMiddleware } from '../middleware/admin.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import Stock from '../models/Stock.model';
import logger from '../utils/logger';
import dataAggregator from '../services/dataAggregator.service';

const router = Router();

// Tüm admin route'ları için admin middleware kullan
router.use(adminMiddleware);

/**
 * GET /api/admin/stats
 * Veritabanı istatistiklerini getirir
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stockCount = await Stock.countDocuments();
    const oldestStock = await Stock.findOne().sort({ 'lastUpdated.quarterly': 1 }).select('symbol lastUpdated');
    const newestStock = await Stock.findOne().sort({ 'lastUpdated.quarterly': -1 }).select('symbol lastUpdated');

    // Veri kalitesi analizi
    const stocksWithoutPrice = await Stock.countDocuments({ 'realtimeData.currentPrice': null });
    const stocksWithoutFinancials = await Stock.countDocuments({ 'quarterlyData.revenue': null });

    res.json({
      success: true,
      data: {
        totalStocks: stockCount,
        stocksWithoutPrice,
        stocksWithoutFinancials,
        oldestUpdate: oldestStock?.lastUpdated?.quarterly || null,
        newestUpdate: newestStock?.lastUpdated?.quarterly || null,
        oldestSymbol: oldestStock?.symbol || null,
        newestSymbol: newestStock?.symbol || null,
      },
    });
  } catch (error: any) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'İstatistikler alınamadı',
    });
  }
});

/**
 * DELETE /api/admin/database/stocks
 * Tüm hisse verilerini siler (sadece Stock collection)
 * Bu işlem geri alınamaz!
 */
router.delete('/database/stocks', async (req: AuthRequest, res: Response) => {
  try {
    const { confirm } = req.body;

    // Güvenlik kontrolü - confirm parametresi zorunlu
    if (confirm !== 'DELETE_ALL_STOCKS') {
      return res.status(400).json({
        success: false,
        error: 'Silme işlemi için confirm parametresi "DELETE_ALL_STOCKS" olmalıdır',
      });
    }

    logger.warn(`⚠️ ADMIN DATABASE RESET initiated by ${req.userEmail}`);

    // Önce mevcut kayıt sayısını al
    const countBefore = await Stock.countDocuments();

    // Tüm hisse verilerini sil
    const result = await Stock.deleteMany({});

    // Cache'i de temizle
    dataAggregator.clearCache();

    logger.warn(`🗑️ Database reset completed: ${result.deletedCount} stocks deleted by ${req.userEmail}`);

    res.json({
      success: true,
      message: `Veritabanı başarıyla sıfırlandı`,
      data: {
        deletedCount: result.deletedCount,
        previousCount: countBefore,
        clearedCache: true,
      },
    });
  } catch (error: any) {
    logger.error('Database reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Veritabanı sıfırlanamadı',
    });
  }
});

/**
 * DELETE /api/admin/database/stocks/:symbol
 * Belirli bir hissenin verilerini siler
 */
router.delete('/database/stocks/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.params;

    const result = await Stock.deleteOne({ symbol: symbol.toUpperCase() });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: `${symbol} bulunamadı`,
      });
    }

    // Bu hisse için cache'i temizle
    dataAggregator.clearCache(symbol);

    logger.info(`Stock ${symbol} deleted by admin ${req.userEmail}`);

    res.json({
      success: true,
      message: `${symbol} başarıyla silindi`,
    });
  } catch (error: any) {
    logger.error(`Delete stock ${req.params.symbol} error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Hisse silinemedi',
    });
  }
});

/**
 * POST /api/admin/database/reset-timestamps
 * Tüm hisselerin güncelleme zamanlarını sıfırlar
 * Bu, tüm verilerin yeniden çekilmesini zorunlu kılar
 */
router.post('/database/reset-timestamps', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.body; // 'all', 'realtime', 'daily', 'quarterly'

    const epochDate = new Date(0);
    let updateQuery: any = {};

    switch (category) {
      case 'realtime':
        updateQuery = { 'lastUpdated.realtime': epochDate };
        break;
      case 'daily':
        updateQuery = { 'lastUpdated.daily': epochDate };
        break;
      case 'quarterly':
        updateQuery = { 'lastUpdated.quarterly': epochDate };
        break;
      case 'all':
      default:
        updateQuery = {
          'lastUpdated.realtime': epochDate,
          'lastUpdated.daily': epochDate,
          'lastUpdated.quarterly': epochDate,
        };
    }

    const result = await Stock.updateMany({}, { $set: updateQuery });

    // Cache'i temizle
    dataAggregator.clearCache();

    logger.info(`Timestamps reset (${category || 'all'}) for ${result.modifiedCount} stocks by ${req.userEmail}`);

    res.json({
      success: true,
      message: `${result.modifiedCount} hisse için güncelleme zamanları sıfırlandı`,
      data: {
        modifiedCount: result.modifiedCount,
        category: category || 'all',
      },
    });
  } catch (error: any) {
    logger.error('Reset timestamps error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Güncelleme zamanları sıfırlanamadı',
    });
  }
});

export default router;
