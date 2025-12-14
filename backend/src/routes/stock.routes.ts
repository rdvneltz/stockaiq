import { Router, Request, Response } from 'express';
import dataAggregator from '../services/dataAggregator.service';
import yahooFinanceService from '../services/yahooFinance.service';
import twelveDataService from '../services/twelveData.service';
import logger from '../utils/logger';

const router = Router();

// Historical data cache - reduces API calls significantly
interface HistoricalCacheEntry {
  data: any[];
  timestamp: number;
}
const historicalDataCache = new Map<string, HistoricalCacheEntry>();

// Cache durations based on interval
const getCacheDuration = (interval: string): number => {
  switch (interval) {
    case '1h':
      return 5 * 60 * 1000; // 5 dakika - gün içi veriler için kısa cache
    case '4h':
      return 15 * 60 * 1000; // 15 dakika
    case '1d':
      return 30 * 60 * 1000; // 30 dakika - günlük veriler
    case '1wk':
      return 60 * 60 * 1000; // 1 saat - haftalık veriler
    case '1mo':
      return 2 * 60 * 60 * 1000; // 2 saat - aylık veriler
    default:
      return 30 * 60 * 1000;
  }
};

// Clean old cache entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of historicalDataCache.entries()) {
    // Remove entries older than 2 hours
    if (now - entry.timestamp > 2 * 60 * 60 * 1000) {
      historicalDataCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Historical cache cleanup: removed ${cleaned} old entries`);
  }
}, 10 * 60 * 1000);

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
 * POST /api/stocks/prices
 * Sadece fiyat verilerini hızlıca getirir (hafif endpoint)
 * Bilanço, analiz vb. ağır veriler çekilmez
 */
router.post('/prices', async (req: Request, res: Response) => {
  const { symbols } = req.body;

  try {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir hisse listesi giriniz',
      });
    }

    if (symbols.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'En fazla 100 hisse sorgulanabilir',
      });
    }

    logger.info(`Price-only request for ${symbols.length} stocks`);

    // Sadece fiyat verilerini çek (hafif işlem)
    const priceData: Array<{
      symbol: string;
      currentPrice: number | null;
      dailyChange: number | null;
      dailyChangePercent: number | null;
      dayHigh: number | null;
      dayLow: number | null;
      volume: number | null;
      lastUpdated: Date;
    }> = [];

    // Hisseleri sırayla çek (paralel = rate limit)
    for (const symbol of symbols) {
      try {
        const quote = await yahooFinanceService.getQuoteOnly(symbol);
        if (quote) {
          priceData.push({
            symbol: symbol.toUpperCase(),
            currentPrice: quote.currentPrice,
            dailyChange: quote.dailyChange,
            dailyChangePercent: quote.dailyChangePercent,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            volume: quote.volume,
            lastUpdated: new Date(),
          });
        }
      } catch (e) {
        // Sessizce devam et
        logger.warn(`Price fetch failed for ${symbol}`);
      }

      // Rate limiting - her hisse arasında 100ms bekle
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      data: priceData,
      count: priceData.length,
    });

  } catch (error: any) {
    logger.error('Price-only API error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Fiyat verileri alınamadı',
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
 * Query params:
 *   - period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y) - default: 6mo (ignored for intraday)
 *   - interval (1h, 4h, 1d, 1wk, 1mo) - default: 1d
 * Not: Intraday (1h, 4h) için Twelve Data kullanılır, diğerleri için Yahoo Finance
 * Cache: Interval'e göre değişken süre (5dk - 2 saat)
 */
router.get('/:symbol/historical', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { period = '6mo', interval = '1d' } = req.query;

  try {
    if (!symbol || symbol.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir hisse sembolü giriniz',
      });
    }

    const validIntervals = ['1h', '4h', '1d', '1wk', '1mo'];
    if (!validIntervals.includes(interval as string)) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir interval giriniz (1h, 4h, 1d, 1wk, 1mo)',
      });
    }

    // Check cache first
    const cacheKey = `${symbol.toUpperCase()}-${period}-${interval}`;
    const cached = historicalDataCache.get(cacheKey);
    const cacheDuration = getCacheDuration(interval as string);

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      logger.debug(`Historical cache HIT for ${cacheKey}`);
      return res.json({
        success: true,
        data: cached.data,
        count: cached.data.length,
        period,
        interval,
        symbol: symbol.toUpperCase(),
        source: (interval === '1h' || interval === '4h') ? 'Twelve Data (cached)' : 'Yahoo Finance (cached)',
        cached: true,
      });
    }

    logger.info(`API request for historical data: ${symbol} (period: ${period}, interval: ${interval})`);

    let data: any[] = [];

    // Intraday (1h, 4h) için Twelve Data kullan
    if (interval === '1h' || interval === '4h') {
      // Intraday için outputsize hesapla
      const outputsize = interval === '1h' ? 120 : 180; // 1h için 5 gün (~120 saat), 4h için 1 ay (~180 saat)

      data = await twelveDataService.getHistoricalData(
        symbol,
        interval as '1h' | '4h',
        outputsize
      );
    } else {
      // Günlük ve üzeri için Yahoo Finance kullan
      const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y'];
      if (!validPeriods.includes(period as string)) {
        return res.status(400).json({
          success: false,
          error: 'Geçerli bir period giriniz (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y)',
        });
      }

      data = await yahooFinanceService.getHistoricalData(
        symbol,
        period as '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y',
        interval as '1d' | '1wk' | '1mo'
      );
    }

    // Store in cache
    if (data.length > 0) {
      historicalDataCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      data,
      count: data.length,
      period,
      interval,
      symbol: symbol.toUpperCase(),
      source: (interval === '1h' || interval === '4h') ? 'Twelve Data' : 'Yahoo Finance',
      cached: false,
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
