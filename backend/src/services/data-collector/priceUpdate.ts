import { Server as SocketIOServer } from 'socket.io';
import { Redis } from 'ioredis';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import logger from '../../utils/logger';
import Stock from '../../models/Stock';
import PriceHistory from '../../models/PriceHistory';

class PriceUpdateService {
  private io: SocketIOServer;
  private redis: Redis;
  private intervalId?: NodeJS.Timeout;
  private activeSymbols: Set<string> = new Set();
  private updateInterval: number;

  constructor(io: SocketIOServer, redis: Redis) {
    this.io = io;
    this.redis = redis;
    this.updateInterval = parseInt(process.env.PRICE_UPDATE_INTERVAL || '3000', 10);
  }

  async start(): Promise<void> {
    logger.info('PriceUpdateService starting...');

    // Load active symbols from watchlists
    await this.loadActiveSymbols();

    // Start real-time price updates
    this.startPriceUpdates();

    logger.info(`PriceUpdateService started with ${this.activeSymbols.size} symbols`);
  }

  private async loadActiveSymbols(): Promise<void> {
    try {
      // Get all stocks from database
      const stocks = await Stock.find().select('symbol').limit(500);
      stocks.forEach(stock => this.activeSymbols.add(stock.symbol));

      logger.info(`Loaded ${this.activeSymbols.size} symbols for price tracking`);
    } catch (error) {
      logger.error('Failed to load active symbols:', error);
    }
  }

  private startPriceUpdates(): void {
    this.intervalId = setInterval(async () => {
      await this.updatePrices();
    }, this.updateInterval);

    // Initial update
    this.updatePrices();
  }

  private async updatePrices(): Promise<void> {
    try {
      const symbols = Array.from(this.activeSymbols);

      // Process in batches of 30 for performance
      const batchSize = 30;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        await Promise.all(batch.map(symbol => this.updateSinglePrice(symbol)));
      }
    } catch (error) {
      logger.error('Error updating prices:', error);
    }
  }

  private async updateSinglePrice(symbol: string): Promise<void> {
    try {
      // Try Yahoo Finance first (add .IS suffix for Istanbul)
      const yahooSymbol = `${symbol}.IS`;

      // Get from cache first
      const cached = await this.redis.get(`price:${symbol}`);

      let priceData: any;

      try {
        // Yahoo Finance quote
        const quote = await yahooFinance.quote(yahooSymbol);

        if (quote && quote.regularMarketPrice) {
          priceData = {
            symbol,
            price: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || 0,
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice,
            open: quote.regularMarketOpen || quote.regularMarketPrice,
          };
        }
      } catch (yahooError) {
        // Fallback to IS Investment scraping
        logger.warn(`Yahoo Finance failed for ${symbol}, trying IS Investment`);
        priceData = await this.fetchFromISInvestment(symbol);
      }

      if (!priceData) {
        logger.warn(`No price data found for ${symbol}`);
        return;
      }

      // Update in database
      await Stock.findOneAndUpdate(
        { symbol },
        {
          price: priceData.price,
          previousClose: priceData.previousClose,
          change: priceData.change,
          changePercent: priceData.changePercent,
          volume: priceData.volume,
          marketCap: priceData.marketCap,
          lastUpdate: new Date(),
        },
        { upsert: true }
      );

      // Save to price history
      await PriceHistory.create({
        symbol,
        timestamp: new Date(),
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.price,
        volume: priceData.volume,
      });

      // Cache for 3 seconds
      await this.redis.setex(`price:${symbol}`, 3, JSON.stringify(priceData));

      // Emit to WebSocket clients
      this.io.to(symbol).emit('price_update', {
        symbol,
        ...priceData,
        timestamp: new Date(),
      });

      // Check for significant changes and emit alerts
      if (Math.abs(priceData.changePercent) > 5) {
        this.io.to(symbol).emit('price_alert', {
          symbol,
          price: priceData.price,
          changePercent: priceData.changePercent,
          type: priceData.changePercent > 0 ? 'surge' : 'drop',
        });
      }
    } catch (error) {
      logger.error(`Error updating price for ${symbol}:`, error);
    }
  }

  private async fetchFromISInvestment(symbol: string): Promise<any> {
    try {
      // IS Investment API endpoint (örnek - gerçek endpoint'i kullan)
      const response = await axios.get(`https://www.isyatirim.com.tr/api/stock/${symbol}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (response.data) {
        return {
          symbol,
          price: response.data.price || 0,
          previousClose: response.data.previousClose || 0,
          change: response.data.change || 0,
          changePercent: response.data.changePercent || 0,
          volume: response.data.volume || 0,
          marketCap: response.data.marketCap || 0,
          high: response.data.high || response.data.price,
          low: response.data.low || response.data.price,
          open: response.data.open || response.data.price,
        };
      }
    } catch (error) {
      logger.error(`IS Investment fetch failed for ${symbol}`);
      return null;
    }
  }

  public addSymbol(symbol: string): void {
    this.activeSymbols.add(symbol);
    logger.info(`Added ${symbol} to active tracking`);
  }

  public removeSymbol(symbol: string): void {
    this.activeSymbols.delete(symbol);
    logger.info(`Removed ${symbol} from active tracking`);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.info('PriceUpdateService stopped');
  }
}

export default PriceUpdateService;
