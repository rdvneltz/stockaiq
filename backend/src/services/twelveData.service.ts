import axios from 'axios';
import logger from '../utils/logger';
import { StockData } from '../types';

class TwelveDataService {
  private readonly API_KEY = process.env.TWELVE_DATA_API_KEY;
  private readonly BASE_URL = 'https://api.twelvedata.com';
  private readonly enabled = !!this.API_KEY;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 saniye bekle (Twelve Data rate limit)

  /**
   * Rate limit kontrolü - gerekirse bekle
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Twelve Data'dan hisse verilerini çeker (BIST desteği var!)
   */
  async getStockData(symbol: string): Promise<Partial<StockData>> {
    if (!this.enabled) {
      logger.debug('Twelve Data API key not configured');
      return {};
    }

    logger.info(`Fetching data from Twelve Data: ${symbol}`);

    try {
      // BIST hisseleri için .IS suffix ekle
      const tickerSymbol = `${symbol}.IS`;

      // Quote endpoint - güncel fiyat
      const quoteResponse = await axios.get(`${this.BASE_URL}/quote`, {
        params: {
          symbol: tickerSymbol,
          apikey: this.API_KEY,
        },
        timeout: 5000,
      });

      const quote = quoteResponse.data;

      // Statistics endpoint - detaylı veriler
      const statsResponse = await axios.get(`${this.BASE_URL}/statistics`, {
        params: {
          symbol: tickerSymbol,
          apikey: this.API_KEY,
        },
        timeout: 5000,
      }).catch(() => ({ data: {} }));

      const stats = statsResponse.data?.statistics || {};

      const data: Partial<StockData> = {
        symbol: symbol.toUpperCase(),
        companyName: quote.name || symbol,
        currentPrice: parseFloat(quote.close) || null,

        priceData: {
          currentPrice: parseFloat(quote.close) || null,
          dayHigh: parseFloat(quote.high) || null,
          dayLow: parseFloat(quote.low) || null,
          dayAverage: null,
          week1High: null,
          week1Low: null,
          day30High: null,
          day30Low: null,
          week52High: stats.fifty_two_week?.high || null,
          week52Low: stats.fifty_two_week?.low || null,
          week52Change: null,
          week52ChangeTL: null,
        },

        tradingData: {
          bid: null,
          ask: null,
          volume: parseInt(quote.volume) || null,
          volumeTL: null,
          lotSize: null,
          dailyChange: parseFloat(quote.change) || null,
          dailyChangePercent: parseFloat(quote.percent_change) || null,
          dailyOpen: parseFloat(quote.open) || null,
        },

        fundamentals: {
          marketCap: stats.market_cap || null,
          pdDD: stats.price_to_book_ratio || null,
          fk: stats.pe_ratio || null,
          fdFAVO: null,
          pdEBITDA: null,
          shares: stats.shares_outstanding || null,
          paidCapital: null,
          eps: stats.earnings_per_share || null,
          roe: null,
          roa: null,
        },

        lastUpdated: new Date(),
      };

      logger.info(`Twelve Data fetched successfully: ${symbol}`);
      return data;

    } catch (error: any) {
      logger.error(`Twelve Data error for ${symbol}:`, error.response?.data || error.message);
      return {};
    }
  }

  /**
   * Twelve Data'dan historical price data çeker (intraday için)
   * Desteklenen interval'ler: 1h, 4h, 1d
   */
  async getHistoricalData(
    symbol: string,
    interval: '1h' | '4h' | '1d' = '1h',
    outputsize: number = 300
  ): Promise<any[]> {
    if (!this.enabled) {
      logger.debug('Twelve Data API key not configured');
      return [];
    }

    // Rate limit kontrolü
    await this.waitForRateLimit();

    const tickerSymbol = `${symbol}.IS`;
    logger.info(`Fetching historical data from Twelve Data: ${tickerSymbol} (interval: ${interval})`);

    try {
      // Twelve Data interval mapping
      const intervalMap: Record<string, string> = {
        '1h': '1h',
        '4h': '4h',
        '1d': '1day',
      };

      const response = await axios.get(`${this.BASE_URL}/time_series`, {
        params: {
          symbol: tickerSymbol,
          interval: intervalMap[interval],
          outputsize: outputsize,
          apikey: this.API_KEY,
        },
        timeout: 10000,
      });

      if (!response.data.values || response.data.values.length === 0) {
        logger.warn(`No historical data returned from Twelve Data for ${symbol}`);
        return [];
      }

      // Twelve Data formatını lightweight-charts formatına dönüştür
      const chartData = response.data.values
        .map((candle: any) => {
          const timestamp = new Date(candle.datetime).getTime() / 1000;

          // Invalid timestamp kontrolü
          if (isNaN(timestamp)) return null;

          return {
            time: Math.floor(timestamp),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseInt(candle.volume) || 0,
          };
        })
        .filter((candle: any) => candle !== null)
        .reverse(); // Twelve Data en yeniden eskiye döner, biz tersine çevirmeli

      logger.info(`Historical data fetched from Twelve Data: ${chartData.length} candles`);
      return chartData;
    } catch (error: any) {
      logger.error(`Twelve Data historical data error for ${symbol}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    if (!this.enabled) {
      return { status: true, responseTime: 0, error: 'API key not configured (optional)' };
    }

    const startTime = Date.now();
    try {
      await axios.get(`${this.BASE_URL}/time_series`, {
        params: {
          symbol: 'AAPL',
          interval: '1day',
          outputsize: 1,
          apikey: this.API_KEY,
        },
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      logger.debug(`Twelve Data health check: OK (${responseTime}ms)`);
      return { status: true, responseTime };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Twelve Data health check failed:', error.message);
      return { status: false, responseTime, error: error.message };
    }
  }
}

export default new TwelveDataService();
