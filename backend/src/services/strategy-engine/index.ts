import cron from 'node-cron';
import logger from '../../utils/logger';
import NotificationService from '../notifications';
import Stock from '../../models/Stock';
import FinancialData from '../../models/FinancialData';
import Ratios from '../../models/Ratios';
import TechnicalIndicators from '../../models/TechnicalIndicators';
import SentimentData from '../../models/SentimentData';
import TradingSignal from '../../models/TradingSignal';
import Strategy from '../../models/Strategy';
import PriceHistory from '../../models/PriceHistory';

interface SignalReason {
  category: 'fundamental' | 'technical' | 'sentiment';
  criterion: string;
  value: any;
  threshold: any;
  impact: number;
  description: string;
}

class StrategyEngineService {
  private notificationService: NotificationService;
  private cronJob?: cron.ScheduledTask;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  async start(): Promise<void> {
    logger.info('StrategyEngineService starting...');

    // Run initial signal generation
    await this.generateSignals();

    // Schedule signal generation every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      logger.info('Running scheduled signal generation...');
      await this.generateSignals();
    });

    logger.info('StrategyEngineService started');
  }

  private async generateSignals(): Promise<void> {
    try {
      const stocks = await Stock.find().select('symbol');

      logger.info(`Generating trading signals for ${stocks.length} stocks...`);

      // Process in batches
      const batchSize = 20;
      for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(stock => this.generateStockSignal(stock.symbol))
        );
      }

      logger.info('Signal generation completed');
    } catch (error) {
      logger.error('Error in generateSignals:', error);
    }
  }

  private async generateStockSignal(symbol: string): Promise<void> {
    try {
      const [stock, ratios, technical, financials, sentiments] = await Promise.all([
        Stock.findOne({ symbol }),
        Ratios.findOne({ symbol }),
        TechnicalIndicators.findOne({ symbol }),
        FinancialData.findOne({ symbol }).sort({ year: -1, quarter: -1 }),
        SentimentData.find({ symbol }).sort({ timestamp: -1 }).limit(10),
      ]);

      if (!stock || !ratios || !technical) {
        logger.debug(`Insufficient data for ${symbol}`);
        return;
      }

      const reasons: SignalReason[] = [];

      // Fundamental Analysis
      const fundamentalScore = this.calculateFundamentalScore(
        ratios,
        financials,
        reasons
      );

      // Technical Analysis
      const technicalScore = this.calculateTechnicalScore(
        stock,
        technical,
        reasons
      );

      // Sentiment Analysis
      const sentimentScore = this.calculateSentimentScore(sentiments, reasons);

      // Calculate overall signal strength (weighted average)
      const overallScore =
        fundamentalScore * 0.4 + technicalScore * 0.4 + sentimentScore * 0.2;

      // Determine signal type
      let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      if (overallScore >= 70) {
        signalType = 'BUY';
      } else if (overallScore <= 30) {
        signalType = 'SELL';
      }

      // Calculate target prices using 3 methods
      const targetPrices = await this.calculateTargetPrices(symbol, stock, ratios);

      // Calculate stop loss and risk-reward
      const stopLoss = this.calculateStopLoss(stock, technical);
      const avgTargetPrice =
        (targetPrices.sector + targetPrices.fibonacci + targetPrices.support) / 3;
      const riskRewardRatio =
        stopLoss > 0 ? (avgTargetPrice - stock.price) / (stock.price - stopLoss) : 0;

      // Create trading signal
      const signal = await TradingSignal.findOneAndUpdate(
        { symbol },
        {
          symbol,
          timestamp: new Date(),
          type: signalType,
          strength: Math.round(overallScore),
          fundamentalScore: Math.round(fundamentalScore),
          technicalScore: Math.round(technicalScore),
          sentimentScore: Math.round(sentimentScore),
          reasons,
          targetPriceSector: targetPrices.sector,
          targetPriceFibonacci: targetPrices.fibonacci,
          targetPriceSupport: targetPrices.support,
          stopLoss,
          riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
        },
        { upsert: true, new: true }
      );

      // Send notification for strong signals
      if (signalType !== 'HOLD' && overallScore > 75) {
        await this.notificationService.sendTradingSignal(signal);
      }

      logger.debug(
        `Signal generated for ${symbol}: ${signalType} (${Math.round(overallScore)})`
      );
    } catch (error) {
      logger.error(`Error generating signal for ${symbol}:`, error);
    }
  }

  private calculateFundamentalScore(
    ratios: any,
    financials: any | null,
    reasons: SignalReason[]
  ): number {
    let score = 50; // Start neutral

    // P/B Ratio - Lower is better (undervalued)
    if (ratios.pb < 0.8) {
      score += 15;
      reasons.push({
        category: 'fundamental',
        criterion: 'P/B Ratio',
        value: ratios.pb.toFixed(2),
        threshold: '< 0.8',
        impact: 15,
        description: `P/D oranı ${ratios.pb.toFixed(2)} - Düşük (Değer fırsatı)`,
      });
    } else if (ratios.pb > 2) {
      score -= 10;
    }

    // P/E Ratio - Check for reasonable valuation
    if (ratios.pe > 0 && ratios.pe < 10) {
      score += 12;
      reasons.push({
        category: 'fundamental',
        criterion: 'P/E Ratio',
        value: ratios.pe.toFixed(2),
        threshold: '< 10',
        impact: 12,
        description: `F/K oranı ${ratios.pe.toFixed(2)} - Düşük (İyi değerleme)`,
      });
    } else if (ratios.pe > 25 || ratios.pe < 0) {
      score -= 10;
    }

    // ROE - Profitability
    if (ratios.roe > 15) {
      score += 10;
      reasons.push({
        category: 'fundamental',
        criterion: 'ROE',
        value: `${ratios.roe.toFixed(1)}%`,
        threshold: '> 15%',
        impact: 10,
        description: `Özkaynak karlılığı %${ratios.roe.toFixed(1)} - Yüksek`,
      });
    } else if (ratios.roe < 0) {
      score -= 15;
    }

    // Debt to Equity - Lower is better
    if (ratios.debtToEquity < 0.5) {
      score += 8;
      reasons.push({
        category: 'fundamental',
        criterion: 'Debt/Equity',
        value: ratios.debtToEquity.toFixed(2),
        threshold: '< 0.5',
        impact: 8,
        description: `Borç/Özkaynak oranı ${ratios.debtToEquity.toFixed(2)} - Düşük (Güçlü bilanço)`,
      });
    } else if (ratios.debtToEquity > 2) {
      score -= 12;
    }

    // Current Ratio - Liquidity
    if (ratios.currentRatio > 1.5) {
      score += 5;
    } else if (ratios.currentRatio < 1) {
      score -= 8;
    }

    // Revenue Growth
    if (ratios.revenueGrowth > 10) {
      score += 8;
      reasons.push({
        category: 'fundamental',
        criterion: 'Revenue Growth',
        value: `${ratios.revenueGrowth.toFixed(1)}%`,
        threshold: '> 10%',
        impact: 8,
        description: `Hasılat artışı %${ratios.revenueGrowth.toFixed(1)} - Güçlü büyüme`,
      });
    } else if (ratios.revenueGrowth < -10) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTechnicalScore(
    stock: any,
    technical: any,
    reasons: SignalReason[]
  ): number {
    let score = 50; // Start neutral

    const price = stock.price;

    // RSI - Oversold/Overbought
    if (technical.rsi < 30) {
      score += 15;
      reasons.push({
        category: 'technical',
        criterion: 'RSI',
        value: technical.rsi.toFixed(1),
        threshold: '< 30 (Oversold)',
        impact: 15,
        description: `RSI ${technical.rsi.toFixed(1)} - Aşırı satım bölgesinde`,
      });
    } else if (technical.rsi > 70) {
      score -= 15;
      reasons.push({
        category: 'technical',
        criterion: 'RSI',
        value: technical.rsi.toFixed(1),
        threshold: '> 70 (Overbought)',
        impact: -15,
        description: `RSI ${technical.rsi.toFixed(1)} - Aşırı alım bölgesinde`,
      });
    }

    // Bollinger Bands
    if (price <= technical.bollingerLower * 1.02) {
      score += 12;
      reasons.push({
        category: 'technical',
        criterion: 'Bollinger Bands',
        value: price.toFixed(2),
        threshold: `≤ ${technical.bollingerLower.toFixed(2)}`,
        impact: 12,
        description: 'Fiyat Bollinger alt bandında - Al sinyali',
      });
    } else if (price >= technical.bollingerUpper * 0.98) {
      score -= 12;
    }

    // MACD
    if (technical.macd > technical.macdSignal && technical.macdHistogram > 0) {
      score += 10;
      reasons.push({
        category: 'technical',
        criterion: 'MACD',
        value: 'Bullish Crossover',
        threshold: 'MACD > Signal',
        impact: 10,
        description: 'MACD yukarı kesişi - Yükseliş sinyali',
      });
    } else if (technical.macd < technical.macdSignal && technical.macdHistogram < 0) {
      score -= 10;
    }

    // Moving Average Crossover
    if (technical.sma50 > technical.sma200 && price > technical.sma50) {
      score += 10;
      reasons.push({
        category: 'technical',
        criterion: 'MA Crossover',
        value: 'Golden Cross',
        threshold: 'SMA50 > SMA200',
        impact: 10,
        description: '50 günlük ortalama 200 günlük üzerinde - Yükseliş trendi',
      });
    } else if (technical.sma50 < technical.sma200 && price < technical.sma50) {
      score -= 10;
    }

    // Volume Analysis
    if (technical.volumeChange > 50) {
      score += 8;
      reasons.push({
        category: 'technical',
        criterion: 'Volume',
        value: `+${technical.volumeChange.toFixed(1)}%`,
        threshold: '> 50%',
        impact: 8,
        description: `Hacim artışı %${technical.volumeChange.toFixed(1)} - Güçlü hareket`,
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSentimentScore(sentiments: any[], reasons: SignalReason[]): number {
    if (!sentiments || sentiments.length === 0) {
      return 50; // Neutral if no sentiment data
    }

    // Calculate weighted average sentiment (recent news weighted more)
    let totalSentiment = 0;
    let totalWeight = 0;

    sentiments.forEach((sentiment, index) => {
      const weight = 1 / (index + 1); // Recent news have higher weight
      const importanceMultiplier =
        sentiment.importance === 'critical'
          ? 2
          : sentiment.importance === 'high'
          ? 1.5
          : 1;

      totalSentiment += sentiment.sentiment * weight * importanceMultiplier;
      totalWeight += weight * importanceMultiplier;
    });

    const avgSentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0;

    // Convert from -100/+100 to 0/100 scale
    const score = 50 + avgSentiment / 2;

    // Add reason for significant sentiment
    if (Math.abs(avgSentiment) > 30) {
      reasons.push({
        category: 'sentiment',
        criterion: 'News Sentiment',
        value: avgSentiment.toFixed(1),
        threshold: avgSentiment > 0 ? '> +30' : '< -30',
        impact: Math.abs(avgSentiment) / 2,
        description: `Haber duyarlılığı ${avgSentiment > 0 ? 'olumlu' : 'olumsuz'} (${avgSentiment.toFixed(1)})`,
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private async calculateTargetPrices(
    symbol: string,
    stock: any,
    ratios: any
  ): Promise<{ sector: number; fibonacci: number; support: number }> {
    try {
      // Method 1: Sector Average P/B
      const sector = stock.sector;
      const sectorStocks = await Ratios.find({}).lean();
      const sectorPBs = sectorStocks
        .filter(s => s.pb > 0 && s.pb < 10) // Filter outliers
        .map(s => s.pb);
      const avgSectorPB = sectorPBs.length > 0
        ? sectorPBs.reduce((a, b) => a + b, 0) / sectorPBs.length
        : ratios.pb;

      const stockData = await Stock.findOne({ symbol });
      const equity = (await FinancialData.findOne({ symbol }).sort({ year: -1 }))?.equity || 1;
      const targetPriceSector = avgSectorPB * (equity / (stockData?.marketCap || 1)) * stock.price;

      // Method 2: Fibonacci Levels
      const priceHistory = await PriceHistory.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(260) // Last year
        .lean();

      const high52w = Math.max(...priceHistory.map(p => p.high));
      const low52w = Math.min(...priceHistory.map(p => p.low));
      const targetPriceFibonacci = low52w + (high52w - low52w) * 0.618; // 61.8% Fibonacci

      // Method 3: Support/Resistance
      const technical = await TechnicalIndicators.findOne({ symbol });
      const resistanceLevels = technical?.resistance || [];
      const targetPriceSupport =
        resistanceLevels.length > 0
          ? Math.max(...resistanceLevels)
          : stock.price * 1.15;

      return {
        sector: parseFloat(targetPriceSector.toFixed(2)),
        fibonacci: parseFloat(targetPriceFibonacci.toFixed(2)),
        support: parseFloat(targetPriceSupport.toFixed(2)),
      };
    } catch (error) {
      logger.error(`Error calculating target prices for ${symbol}:`, error);
      return {
        sector: stock.price * 1.1,
        fibonacci: stock.price * 1.15,
        support: stock.price * 1.2,
      };
    }
  }

  private calculateStopLoss(stock: any, technical: any): number {
    // Stop loss at 5% below current price or below nearest support
    const supportLevels = technical.support || [];
    const nearestSupport = supportLevels.find((s: number) => s < stock.price);

    const defaultStopLoss = stock.price * 0.95;

    return nearestSupport || defaultStopLoss;
  }

  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    logger.info('StrategyEngineService stopped');
  }
}

export default StrategyEngineService;
