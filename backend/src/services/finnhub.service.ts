import axios from 'axios';
import logger from '../utils/logger';
import { StockData } from '../types';

class FinnhubService {
  private readonly API_KEY = process.env.FINNHUB_API_KEY;
  private readonly BASE_URL = 'https://finnhub.io/api/v1';
  private readonly enabled = !!this.API_KEY;

  async getStockData(symbol: string): Promise<Partial<StockData>> {
    if (!this.enabled) {
      logger.debug('Finnhub API key not configured');
      return {};
    }

    try {
      const tickerSymbol = `${symbol}.IS`; // BIST için .IS

      // Quote
      const quoteRes = await axios.get(`${this.BASE_URL}/quote`, {
        params: { symbol: tickerSymbol, token: this.API_KEY },
        timeout: 5000,
      });

      // Company Profile
      const profileRes = await axios.get(`${this.BASE_URL}/stock/profile2`, {
        params: { symbol: tickerSymbol, token: this.API_KEY },
        timeout: 5000,
      }).catch(() => ({ data: {} }));

      // Metrics
      const metricsRes = await axios.get(`${this.BASE_URL}/stock/metric`, {
        params: { symbol: tickerSymbol, token: this.API_KEY, metric: 'all' },
        timeout: 5000,
      }).catch(() => ({ data: { metric: {} } }));

      const quote = quoteRes.data;
      const profile = profileRes.data;
      const metrics = metricsRes.data?.metric || {};

      return {
        symbol: symbol.toUpperCase(),
        companyName: profile.name || symbol,
        currentPrice: quote.c || null,

        priceData: {
          currentPrice: quote.c || null,
          dayHigh: quote.h || null,
          dayLow: quote.l || null,
          dayAverage: null,
          week1High: null,
          week1Low: null,
          day30High: null,
          day30Low: null,
          week52High: metrics['52WeekHigh'] || null,
          week52Low: metrics['52WeekLow'] || null,
          week52Change: null,
          week52ChangeTL: null,
        },

        tradingData: {
          bid: null,
          ask: null,
          volume: null,
          volumeTL: null,
          lotSize: null,
          dailyChange: quote.d || null,
          dailyChangePercent: quote.dp || null,
          dailyOpen: quote.o || null,
        },

        fundamentals: {
          marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null,
          pdDD: metrics.pbAnnual || null,
          fk: metrics.peAnnual || null,
          fdFAVO: null,
          pdEBITDA: null,
          shares: profile.shareOutstanding ? profile.shareOutstanding * 1000000 : null,
          paidCapital: null,
          eps: metrics.epsAnnual || null,
          roe: metrics.roeTTM || null,
          roa: metrics.roaTTM || null,
        },

        lastUpdated: new Date(),
      };

    } catch (error: any) {
      logger.error(`Finnhub error for ${symbol}:`, error.message);
      return {};
    }
  }

  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    if (!this.enabled) {
      return { status: true, responseTime: 0, error: 'API key not configured (optional)' };
    }

    const startTime = Date.now();
    try {
      await axios.get(`${this.BASE_URL}/quote`, {
        params: { symbol: 'AAPL', token: this.API_KEY },
        timeout: 5000,
      });

      return { status: true, responseTime: Date.now() - startTime };
    } catch (error: any) {
      return { status: false, responseTime: Date.now() - startTime, error: error.message };
    }
  }
}

export default new FinnhubService();
