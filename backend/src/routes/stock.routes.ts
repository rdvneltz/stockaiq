import { Router, Request, Response } from 'express';
import dataAggregator from '../services/dataAggregator.service';
import yahooFinanceService from '../services/yahooFinance.service';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/stocks/:symbol
 * Belirli bir hisse için tüm verileri getirir
 */
router.get('/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    logger.info(`API request for stock: ${symbol}`);

    if (!symbol || symbol.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir hisse sembolü giriniz',
      });
    }

    const data = await dataAggregator.getCompleteStockData(symbol);

    res.json({
      success: true,
      data,
    });

  } catch (error: any) {
    logger.error(`Stock API error for ${symbol}:`, error);

    res.status(500).json({
      success: false,
      error: error.message || 'Hisse verileri alınamadı',
    });
  }
});

/**
 * POST /api/stocks/multiple
 * Birden fazla hisse için verileri getirir
 */
router.post('/multiple', async (req: Request, res: Response) => {
  const { symbols } = req.body;

  try {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir hisse listesi giriniz',
      });
    }

    if (symbols.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'En fazla 50 hisse sorgulanabilir',
      });
    }

    logger.info(`API request for multiple stocks: ${symbols.join(', ')}`);

    const data = await dataAggregator.getMultipleStocks(symbols);

    res.json({
      success: true,
      data,
      count: data.length,
    });

  } catch (error: any) {
    logger.error('Multiple stocks API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Hisse verileri alınamadı',
    });
  }
});

/**
 * DELETE /api/stocks/:symbol/cache
 * Belirli bir hisse için cache'i temizler
 */
router.delete('/:symbol/cache', (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    dataAggregator.clearCache(symbol);

    res.json({
      success: true,
      message: `${symbol} için cache temizlendi`,
    });

  } catch (error: any) {
    logger.error(`Cache clear error for ${symbol}:`, error);

    res.status(500).json({
      success: false,
      error: error.message || 'Cache temizlenemedi',
    });
  }
});

/**
 * DELETE /api/stocks/cache/all
 * Tüm cache'i temizler
 */
router.delete('/cache/all', (req: Request, res: Response) => {
  try {
    dataAggregator.clearCache();

    res.json({
      success: true,
      message: 'Tüm cache temizlendi',
    });

  } catch (error: any) {
    logger.error('Cache clear all error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Cache temizlenemedi',
    });
  }
});

/**
 * GET /api/stocks/:symbol/historical
 * Belirli bir hisse için gerçek historical price data (candlestick) getirir
 * Query params: period (1d, 5d, 1mo, 3mo, 6mo, 1y) - default: 3mo
 */
router.get('/:symbol/historical', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { period = '3mo' } = req.query;

  try {
    logger.info(`API request for historical data: ${symbol} (${period})`);

    if (!symbol || symbol.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir hisse sembolü giriniz',
      });
    }

    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir period giriniz (1d, 5d, 1mo, 3mo, 6mo, 1y)',
      });
    }

    const data = await yahooFinanceService.getHistoricalData(
      symbol,
      period as '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'
    );

    res.json({
      success: true,
      data,
      count: data.length,
      period,
      symbol: symbol.toUpperCase(),
    });

  } catch (error: any) {
    logger.error(`Historical data API error for ${symbol}:`, error);

    res.status(500).json({
      success: false,
      error: error.message || 'Historical data alınamadı',
    });
  }
});

export default router;
