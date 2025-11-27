import { Redis } from 'ioredis';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import logger from '../../utils/logger';
import FinancialData from '../../models/FinancialData';
import Stock from '../../models/Stock';
import Ratios from '../../models/Ratios';

class DataCollectorService {
  private redis: Redis;
  private cronJob?: cron.ScheduledTask;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async start(): Promise<void> {
    logger.info('DataCollectorService starting...');

    // Run initial collection
    await this.collectAllData();

    // Schedule updates every 6 hours
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      logger.info('Running scheduled financial data collection...');
      await this.collectAllData();
    });

    logger.info('DataCollectorService started');
  }

  private async collectAllData(): Promise<void> {
    try {
      // Get all stock symbols
      const stocks = await Stock.find().select('symbol');

      logger.info(`Collecting financial data for ${stocks.length} stocks...`);

      // Process in batches to avoid overwhelming APIs
      const batchSize = 10;
      for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(stock => this.collectFinancialData(stock.symbol))
        );

        // Wait 2 seconds between batches to be respectful to APIs
        await this.sleep(2000);
      }

      logger.info('Financial data collection completed');
    } catch (error) {
      logger.error('Error in collectAllData:', error);
    }
  }

  private async collectFinancialData(symbol: string): Promise<void> {
    try {
      // Check cache first
      const cacheKey = `financial:${symbol}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug(`Using cached financial data for ${symbol}`);
        return;
      }

      // Fetch from KAP (Kamuyu Aydınlatma Platformu)
      const financialData = await this.fetchFromKAP(symbol);

      if (!financialData) {
        logger.warn(`No financial data found for ${symbol}`);
        return;
      }

      // Save to database
      await FinancialData.findOneAndUpdate(
        {
          symbol,
          year: financialData.year,
          quarter: financialData.quarter,
        },
        financialData,
        { upsert: true }
      );

      // Calculate and save ratios
      await this.calculateRatios(symbol, financialData);

      // Cache for 6 hours
      await this.redis.setex(cacheKey, 21600, JSON.stringify(financialData));

      logger.info(`Financial data updated for ${symbol}`);
    } catch (error) {
      logger.error(`Error collecting financial data for ${symbol}:`, error);
    }
  }

  private async fetchFromKAP(symbol: string): Promise<any> {
    try {
      // KAP API endpoint (örnek - gerçek KAP API'sini kullan)
      const response = await axios.get(
        `https://www.kap.org.tr/tr/api/stockFinancials/${symbol}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (response.data) {
        // Parse KAP data
        return this.parseKAPData(response.data, symbol);
      }

      return null;
    } catch (error) {
      logger.error(`KAP fetch failed for ${symbol}, trying web scraping`);
      return await this.scrapeKAPWebsite(symbol);
    }
  }

  private parseKAPData(data: any, symbol: string): any {
    // Parse KAP JSON response
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    return {
      symbol,
      year: data.year || currentYear,
      quarter: data.quarter || `Q${currentQuarter}`,

      // Balance Sheet
      currentAssets: data.currentAssets || 0,
      nonCurrentAssets: data.nonCurrentAssets || 0,
      totalAssets: data.totalAssets || 0,

      // Current Assets breakdown
      cashAndEquivalents: data.cashAndEquivalents || 0,
      tradeReceivables: data.tradeReceivables || 0,
      inventories: data.inventories || 0,

      // Non-Current Assets breakdown
      financialInvestments: data.financialInvestments || 0,
      tradeReceivablesLongTerm: data.tradeReceivablesLongTerm || 0,
      investmentProperty: data.investmentProperty || 0,
      prepaidExpenses: data.prepaidExpenses || 0,
      deferredTaxAssets: data.deferredTaxAssets || 0,
      tangibleAssets: data.tangibleAssets || 0,
      intangibleAssets: data.intangibleAssets || 0,

      // Liabilities
      shortTermLiabilities: data.shortTermLiabilities || 0,
      longTermLiabilities: data.longTermLiabilities || 0,
      totalLiabilities: data.totalLiabilities || 0,

      // Debt breakdown
      shortTermBankLoans: data.shortTermBankLoans || 0,
      longTermBankLoans: data.longTermBankLoans || 0,

      // Equity
      equity: data.equity || 0,
      paidInCapital: data.paidInCapital || 0,

      // Income Statement
      revenue: data.revenue || 0,
      grossProfit: data.grossProfit || 0,
      operatingProfit: data.operatingProfit || 0,
      netProfit: data.netProfit || 0,
      ebitda: data.ebitda || 0,

      // Exports
      exports: data.exports || 0,

      lastUpdate: new Date(),
    };
  }

  private async scrapeKAPWebsite(symbol: string): Promise<any> {
    try {
      // Web scraping fallback for KAP
      const url = `https://www.kap.org.tr/tr/sirket-bilgileri/${symbol}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract financial data from HTML tables
      // This is a placeholder - actual implementation depends on KAP HTML structure
      const financialData = {
        symbol,
        year: new Date().getFullYear(),
        quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        currentAssets: 0,
        nonCurrentAssets: 0,
        totalAssets: 0,
        // ... extract other fields from HTML
      };

      return financialData;
    } catch (error) {
      logger.error(`Web scraping failed for ${symbol}`);
      return null;
    }
  }

  private async calculateRatios(symbol: string, financialData: any): Promise<void> {
    try {
      const stock = await Stock.findOne({ symbol });

      if (!stock) {
        logger.warn(`Stock ${symbol} not found for ratio calculation`);
        return;
      }

      // Get historical data for growth calculations
      const previousYearData = await FinancialData.findOne({
        symbol,
        year: financialData.year - 1,
      });

      const ratios = {
        symbol,

        // Valuation Ratios
        pb: financialData.equity > 0 ? stock.marketCap / financialData.equity : 0,
        pe: financialData.netProfit > 0 ? stock.marketCap / financialData.netProfit : 0,
        ps: financialData.revenue > 0 ? stock.marketCap / financialData.revenue : 0,

        // Profitability Ratios
        roe: financialData.equity > 0 ? (financialData.netProfit / financialData.equity) * 100 : 0,
        roa: financialData.totalAssets > 0 ? (financialData.netProfit / financialData.totalAssets) * 100 : 0,
        profitMargin: financialData.revenue > 0 ? (financialData.netProfit / financialData.revenue) * 100 : 0,
        grossMargin: financialData.revenue > 0 ? (financialData.grossProfit / financialData.revenue) * 100 : 0,

        // Leverage Ratios
        debtToEquity: financialData.equity > 0 ? financialData.totalLiabilities / financialData.equity : 0,
        debtToAssets: financialData.totalAssets > 0 ? financialData.totalLiabilities / financialData.totalAssets : 0,
        currentRatio: financialData.shortTermLiabilities > 0 ? financialData.currentAssets / financialData.shortTermLiabilities : 0,
        quickRatio:
          financialData.shortTermLiabilities > 0
            ? (financialData.currentAssets - financialData.inventories) / financialData.shortTermLiabilities
            : 0,

        // Efficiency Ratios
        assetTurnover: financialData.totalAssets > 0 ? financialData.revenue / financialData.totalAssets : 0,
        inventoryTurnover:
          financialData.inventories > 0 ? (financialData.revenue - financialData.grossProfit) / financialData.inventories : 0,

        // Growth Rates
        revenueGrowth:
          previousYearData && previousYearData.revenue > 0
            ? ((financialData.revenue - previousYearData.revenue) / previousYearData.revenue) * 100
            : 0,
        profitGrowth:
          previousYearData && previousYearData.netProfit > 0
            ? ((financialData.netProfit - previousYearData.netProfit) / previousYearData.netProfit) * 100
            : 0,

        lastUpdate: new Date(),
      };

      await Ratios.findOneAndUpdate({ symbol }, ratios, { upsert: true });

      logger.info(`Ratios calculated for ${symbol}`);
    } catch (error) {
      logger.error(`Error calculating ratios for ${symbol}:`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    logger.info('DataCollectorService stopped');
  }
}

export default DataCollectorService;
