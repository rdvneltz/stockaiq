import StockModel, { DataCategory } from '../models/Stock.model';
import { StockData } from '../types';
import logger from '../utils/logger';
import database from '../utils/database';

class StockDbService {
  // Veri güncelleme süreleri (ms)
  private readonly EXPIRATION_TIMES = {
    [DataCategory.REALTIME]: 10 * 1000,        // 10 saniye
    [DataCategory.DAILY]: 24 * 60 * 60 * 1000, // 24 saat
    [DataCategory.QUARTERLY]: 30 * 24 * 60 * 60 * 1000, // 30 gün
    [DataCategory.STATIC]: Infinity,            // Değişmez
  };

  /**
   * Veri gerekli mi kontrol et (expired mı?)
   */
  needsUpdate(category: DataCategory, lastUpdated: Date): boolean {
    const expirationTime = this.EXPIRATION_TIMES[category];
    const elapsed = Date.now() - lastUpdated.getTime();
    return elapsed > expirationTime;
  }

  /**
   * DB'den hisse verisini al (varsa ve güncel ise)
   */
  async getStock(symbol: string): Promise<StockData | null> {
    if (!database.isConnected()) {
      return null;
    }

    try {
      const stock = await StockModel.findOne({ symbol: symbol.toUpperCase() });
      if (!stock) {
        return null;
      }

      // Her kategori için güncellik kontrolü
      const needsRealtimeUpdate = this.needsUpdate(DataCategory.REALTIME, stock.lastUpdated.realtime);
      const needsDailyUpdate = this.needsUpdate(DataCategory.DAILY, stock.lastUpdated.daily);
      const needsQuarterlyUpdate = this.needsUpdate(DataCategory.QUARTERLY, stock.lastUpdated.quarterly);

      // Eğer herhangi bir kategori expired ise, partial return (sadece güncel olanlar)
      if (needsRealtimeUpdate || needsDailyUpdate || needsQuarterlyUpdate) {
        logger.debug(`Stock ${symbol} needs update: RT=${needsRealtimeUpdate}, Daily=${needsDailyUpdate}, Quarterly=${needsQuarterlyUpdate}`);
        return this.convertToStockData(stock, {
          includeRealtime: !needsRealtimeUpdate,
          includeDaily: !needsDailyUpdate,
          includeQuarterly: !needsQuarterlyUpdate,
        });
      }

      // Tüm veriler güncel
      return this.convertToStockData(stock, {
        includeRealtime: true,
        includeDaily: true,
        includeQuarterly: true,
      });

    } catch (error: any) {
      logger.error(`DB read error for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Hisse verisini DB'ye kaydet/güncelle
   */
  async saveStock(stockData: StockData, updateCategories: {
    realtime?: boolean;
    daily?: boolean;
    quarterly?: boolean;
    static?: boolean;
  }): Promise<void> {
    if (!database.isConnected()) {
      return;
    }

    try {
      const now = new Date();
      const updateData: any = {};

      // Realtime data güncelleme
      if (updateCategories.realtime) {
        updateData['lastUpdated.realtime'] = now;
        updateData.realtimeData = {
          currentPrice: stockData.currentPrice,
          dayHigh: stockData.priceData.dayHigh,
          dayLow: stockData.priceData.dayLow,
          dayAverage: stockData.priceData.dayAverage,
          dailyOpen: stockData.tradingData.dailyOpen,
          dailyChange: stockData.tradingData.dailyChange,
          dailyChangePercent: stockData.tradingData.dailyChangePercent,
          volume: stockData.tradingData.volume,
          volumeTL: stockData.tradingData.volumeTL,
          bid: stockData.tradingData.bid,
          ask: stockData.tradingData.ask,
        };
      }

      // Daily data güncelleme
      if (updateCategories.daily) {
        updateData['lastUpdated.daily'] = now;
        updateData.dailyData = {
          week52High: stockData.priceData.week52High,
          week52Low: stockData.priceData.week52Low,
          week52Change: stockData.priceData.week52Change,
          week52ChangeTL: stockData.priceData.week52ChangeTL,
          week1High: stockData.priceData.week1High,
          week1Low: stockData.priceData.week1Low,
          day30High: stockData.priceData.day30High,
          day30Low: stockData.priceData.day30Low,
          marketCap: stockData.fundamentals.marketCap,
          fk: stockData.fundamentals.fk,
          pdDD: stockData.fundamentals.pdDD,
          fdFAVO: stockData.fundamentals.fdFAVO,
          pdEBITDA: stockData.fundamentals.pdEBITDA,
        };
      }

      // Quarterly data güncelleme
      if (updateCategories.quarterly) {
        updateData['lastUpdated.quarterly'] = now;
        updateData.quarterlyData = {
          period: stockData.financials.period,
          revenue: stockData.financials.revenue,
          grossProfit: stockData.financials.grossProfit,
          grossProfitMargin: stockData.financials.grossProfitMargin,
          netIncome: stockData.financials.netIncome,
          profitability: stockData.financials.profitability,
          equity: stockData.financials.equity,
          currentAssets: stockData.financials.currentAssets,
          fixedAssets: stockData.financials.fixedAssets,
          totalAssets: stockData.financials.totalAssets,
          shortTermLiabilities: stockData.financials.shortTermLiabilities,
          longTermLiabilities: stockData.financials.longTermLiabilities,
          shortTermBankLoans: stockData.financials.shortTermBankLoans,
          longTermBankLoans: stockData.financials.longTermBankLoans,
          tradeReceivables: stockData.financials.tradeReceivables,
          financialInvestments: stockData.financials.financialInvestments,
          investmentProperty: stockData.financials.investmentProperty,
          prepaidExpenses: stockData.financials.prepaidExpenses,
          deferredTax: stockData.financials.deferredTax,
          totalDebt: stockData.financials.totalDebt,
          netDebt: stockData.financials.netDebt,
          workingCapital: stockData.financials.workingCapital,
          eps: stockData.fundamentals.eps,
          roe: stockData.fundamentals.roe,
          roa: stockData.fundamentals.roa,
          shares: stockData.fundamentals.shares,
          paidCapital: stockData.fundamentals.paidCapital,
          currentRatio: stockData.liquidity.currentRatio,
          acidTestRatio: stockData.liquidity.acidTestRatio,
          cashRatio: stockData.liquidity.cashRatio,
          debtToEquity: stockData.leverage.debtToEquity,
          debtToAssets: stockData.leverage.debtToAssets,
          shortTermDebtRatio: stockData.leverage.shortTermDebtRatio,
          longTermDebtRatio: stockData.leverage.longTermDebtRatio,
        };
        updateData.analysis = stockData.analysis;
        updateData.smartAnalysis = stockData.smartAnalysis;
      }

      // Static data güncelleme (ilk kayıt veya değişiklik varsa)
      if (updateCategories.static) {
        updateData['lastUpdated.static'] = now;
        updateData.staticData = {
          companyName: stockData.companyName,
          sector: null,
          industry: null,
          lotSize: stockData.tradingData.lotSize,
        };
      }

      await StockModel.findOneAndUpdate(
        { symbol: stockData.symbol.toUpperCase() },
        { $set: updateData },
        { upsert: true, new: true }
      );

      logger.debug(`Stock ${stockData.symbol} saved to DB with updates: ${Object.keys(updateCategories).join(', ')}`);

    } catch (error: any) {
      logger.error(`DB save error for ${stockData.symbol}:`, error.message);
    }
  }

  /**
   * DB model'i StockData type'ına dönüştür
   */
  private convertToStockData(stock: any, include: {
    includeRealtime: boolean;
    includeDaily: boolean;
    includeQuarterly: boolean;
  }): StockData {
    return {
      symbol: stock.symbol,
      companyName: stock.staticData.companyName,
      currentPrice: include.includeRealtime ? stock.realtimeData.currentPrice : null,

      priceData: {
        currentPrice: include.includeRealtime ? stock.realtimeData.currentPrice : null,
        dayHigh: include.includeRealtime ? stock.realtimeData.dayHigh : null,
        dayLow: include.includeRealtime ? stock.realtimeData.dayLow : null,
        dayAverage: include.includeRealtime ? stock.realtimeData.dayAverage : null,
        week1High: include.includeDaily ? stock.dailyData.week1High : null,
        week1Low: include.includeDaily ? stock.dailyData.week1Low : null,
        day30High: include.includeDaily ? stock.dailyData.day30High : null,
        day30Low: include.includeDaily ? stock.dailyData.day30Low : null,
        week52High: include.includeDaily ? stock.dailyData.week52High : null,
        week52Low: include.includeDaily ? stock.dailyData.week52Low : null,
        week52Change: include.includeDaily ? stock.dailyData.week52Change : null,
        week52ChangeTL: include.includeDaily ? stock.dailyData.week52ChangeTL : null,
      },

      tradingData: {
        bid: include.includeRealtime ? stock.realtimeData.bid : null,
        ask: include.includeRealtime ? stock.realtimeData.ask : null,
        volume: include.includeRealtime ? stock.realtimeData.volume : null,
        volumeTL: include.includeRealtime ? stock.realtimeData.volumeTL : null,
        lotSize: stock.staticData.lotSize,
        dailyChange: include.includeRealtime ? stock.realtimeData.dailyChange : null,
        dailyChangePercent: include.includeRealtime ? stock.realtimeData.dailyChangePercent : null,
        dailyOpen: include.includeRealtime ? stock.realtimeData.dailyOpen : null,
      },

      fundamentals: {
        marketCap: include.includeDaily ? stock.dailyData.marketCap : null,
        pdDD: include.includeDaily ? stock.dailyData.pdDD : null,
        fk: include.includeDaily ? stock.dailyData.fk : null,
        fdFAVO: include.includeDaily ? stock.dailyData.fdFAVO : null,
        pdEBITDA: include.includeDaily ? stock.dailyData.pdEBITDA : null,
        shares: include.includeQuarterly ? stock.quarterlyData.shares : null,
        paidCapital: include.includeQuarterly ? stock.quarterlyData.paidCapital : null,
        eps: include.includeQuarterly ? stock.quarterlyData.eps : null,
        roe: include.includeQuarterly ? stock.quarterlyData.roe : null,
        roa: include.includeQuarterly ? stock.quarterlyData.roa : null,
      },

      financials: include.includeQuarterly ? {
        period: stock.quarterlyData.period,
        revenue: stock.quarterlyData.revenue,
        grossProfit: stock.quarterlyData.grossProfit,
        grossProfitMargin: stock.quarterlyData.grossProfitMargin,
        netIncome: stock.quarterlyData.netIncome,
        profitability: stock.quarterlyData.profitability,
        equity: stock.quarterlyData.equity,
        currentAssets: stock.quarterlyData.currentAssets,
        fixedAssets: stock.quarterlyData.fixedAssets,
        totalAssets: stock.quarterlyData.totalAssets,
        shortTermLiabilities: stock.quarterlyData.shortTermLiabilities,
        longTermLiabilities: stock.quarterlyData.longTermLiabilities,
        shortTermBankLoans: stock.quarterlyData.shortTermBankLoans,
        longTermBankLoans: stock.quarterlyData.longTermBankLoans,
        tradeReceivables: stock.quarterlyData.tradeReceivables,
        financialInvestments: stock.quarterlyData.financialInvestments,
        investmentProperty: stock.quarterlyData.investmentProperty,
        prepaidExpenses: stock.quarterlyData.prepaidExpenses,
        deferredTax: stock.quarterlyData.deferredTax,
        totalDebt: stock.quarterlyData.totalDebt,
        netDebt: stock.quarterlyData.netDebt,
        workingCapital: stock.quarterlyData.workingCapital,
      } : {} as any,

      analysis: include.includeQuarterly ? stock.analysis : {} as any,

      liquidity: include.includeQuarterly ? {
        currentRatio: stock.quarterlyData.currentRatio,
        acidTestRatio: stock.quarterlyData.acidTestRatio,
        cashRatio: stock.quarterlyData.cashRatio,
      } : {} as any,

      leverage: include.includeQuarterly ? {
        debtToEquity: stock.quarterlyData.debtToEquity,
        debtToAssets: stock.quarterlyData.debtToAssets,
        shortTermDebtRatio: stock.quarterlyData.shortTermDebtRatio,
        longTermDebtRatio: stock.quarterlyData.longTermDebtRatio,
      } : {} as any,

      smartAnalysis: include.includeQuarterly ? stock.smartAnalysis : {} as any,

      lastUpdated: stock.updatedAt,
    };
  }

  /**
   * Belirli bir hissenin MongoDB verisini siler
   * Bozuk veri temizlemek için kullanılır
   */
  async deleteStock(symbol: string): Promise<boolean> {
    if (!database.isConnected()) {
      return false;
    }

    try {
      const result = await StockModel.deleteOne({ symbol: symbol.toUpperCase() });
      if (result.deletedCount > 0) {
        logger.info(`Stock ${symbol} deleted from MongoDB`);
        return true;
      }
      logger.warn(`Stock ${symbol} not found in MongoDB`);
      return false;
    } catch (error: any) {
      logger.error(`DB delete error for ${symbol}:`, error.message);
      return false;
    }
  }

  /**
   * Tüm hisse verilerini siler (DİKKATLİ KULLAN!)
   */
  async deleteAllStocks(): Promise<number> {
    if (!database.isConnected()) {
      return 0;
    }

    try {
      const result = await StockModel.deleteMany({});
      logger.info(`All stocks deleted from MongoDB: ${result.deletedCount} records`);
      return result.deletedCount;
    } catch (error: any) {
      logger.error('DB delete all error:', error.message);
      return 0;
    }
  }
}

export default new StockDbService();
