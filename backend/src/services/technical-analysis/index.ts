import { SMA, EMA, BollingerBands, RSI, MACD } from 'technicalindicators';
import cron from 'node-cron';
import logger from '../../utils/logger';
import PriceHistory from '../../models/PriceHistory';
import TechnicalIndicators from '../../models/TechnicalIndicators';
import Stock from '../../models/Stock';

class TechnicalAnalysisService {
  private cronJob?: cron.ScheduledTask;

  async start(): Promise<void> {
    logger.info('TechnicalAnalysisService starting...');

    // Run initial analysis
    await this.analyzeAll();

    // Schedule analysis every 15 minutes during market hours
    this.cronJob = cron.schedule('*/15 9-18 * * 1-5', async () => {
      logger.info('Running scheduled technical analysis...');
      await this.analyzeAll();
    });

    logger.info('TechnicalAnalysisService started');
  }

  private async analyzeAll(): Promise<void> {
    try {
      const stocks = await Stock.find().select('symbol');

      logger.info(`Analyzing technical indicators for ${stocks.length} stocks...`);

      // Process in batches
      const batchSize = 20;
      for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(stock => this.analyzeStock(stock.symbol))
        );
      }

      logger.info('Technical analysis completed');
    } catch (error) {
      logger.error('Error in analyzeAll:', error);
    }
  }

  private async analyzeStock(symbol: string): Promise<void> {
    try {
      // Get historical price data (last 200 days for indicators)
      const priceHistory = await PriceHistory.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(200)
        .lean();

      if (priceHistory.length < 50) {
        logger.warn(`Insufficient price history for ${symbol}`);
        return;
      }

      // Reverse to chronological order for calculations
      priceHistory.reverse();

      const closes = priceHistory.map(p => p.close);
      const highs = priceHistory.map(p => p.high);
      const lows = priceHistory.map(p => p.low);
      const volumes = priceHistory.map(p => p.volume);

      // Calculate Moving Averages
      const sma50 = SMA.calculate({ period: 50, values: closes });
      const sma100 = SMA.calculate({ period: 100, values: closes });
      const sma200 = SMA.calculate({ period: 200, values: closes });
      const ema12 = EMA.calculate({ period: 12, values: closes });
      const ema26 = EMA.calculate({ period: 26, values: closes });

      // Calculate Bollinger Bands
      const bollinger = BollingerBands.calculate({
        period: 20,
        values: closes,
        stdDev: 2,
      });

      // Calculate RSI
      const rsi = RSI.calculate({ period: 14, values: closes });

      // Calculate MACD
      const macd = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: closes,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });

      // Calculate Volume indicators
      const volumeAvg20 = SMA.calculate({ period: 20, values: volumes });

      // Calculate Support and Resistance levels
      const { support, resistance } = this.calculateSupportResistance(priceHistory);

      // Get latest values
      const latestBollinger = bollinger[bollinger.length - 1] || { upper: 0, middle: 0, lower: 0 };
      const latestMACD = macd[macd.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
      const latestRSI = rsi[rsi.length - 1] || 50;
      const latestVolumeAvg = volumeAvg20[volumeAvg20.length - 1] || 0;

      const currentVolume = volumes[volumes.length - 1];
      const volumeChange = latestVolumeAvg > 0 ? ((currentVolume - latestVolumeAvg) / latestVolumeAvg) * 100 : 0;

      // Save to database
      const indicators = {
        symbol,
        timestamp: new Date(),
        sma50: sma50[sma50.length - 1] || 0,
        sma100: sma100[sma100.length - 1] || 0,
        sma200: sma200[sma200.length - 1] || 0,
        ema12: ema12[ema12.length - 1] || 0,
        ema26: ema26[ema26.length - 1] || 0,
        bollingerUpper: latestBollinger.upper,
        bollingerMiddle: latestBollinger.middle,
        bollingerLower: latestBollinger.lower,
        rsi: latestRSI,
        macd: latestMACD.MACD || 0,
        macdSignal: latestMACD.signal || 0,
        macdHistogram: latestMACD.histogram || 0,
        support,
        resistance,
        volumeAvg20: latestVolumeAvg,
        volumeChange,
      };

      await TechnicalIndicators.findOneAndUpdate(
        { symbol },
        indicators,
        { upsert: true }
      );

      logger.debug(`Technical indicators updated for ${symbol}`);
    } catch (error) {
      logger.error(`Error analyzing ${symbol}:`, error);
    }
  }

  private calculateSupportResistance(priceHistory: any[]): {
    support: number[];
    resistance: number[];
  } {
    try {
      // Find local minima and maxima (pivots)
      const pivotPeriod = 5;
      const supports: number[] = [];
      const resistances: number[] = [];

      for (let i = pivotPeriod; i < priceHistory.length - pivotPeriod; i++) {
        const current = priceHistory[i];
        let isSupport = true;
        let isResistance = true;

        // Check if it's a pivot low (support)
        for (let j = i - pivotPeriod; j <= i + pivotPeriod; j++) {
          if (j !== i && priceHistory[j].low < current.low) {
            isSupport = false;
          }
          if (j !== i && priceHistory[j].high > current.high) {
            isResistance = false;
          }
        }

        if (isSupport) {
          supports.push(current.low);
        }
        if (isResistance) {
          resistances.push(current.high);
        }
      }

      // Get most recent 3 support and resistance levels
      return {
        support: supports.slice(-3),
        resistance: resistances.slice(-3),
      };
    } catch (error) {
      logger.error('Error calculating support/resistance:', error);
      return { support: [], resistance: [] };
    }
  }

  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    logger.info('TechnicalAnalysisService stopped');
  }
}

export default TechnicalAnalysisService;
