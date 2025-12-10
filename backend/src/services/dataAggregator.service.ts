import yahooFinanceService from './yahooFinance.service';
import kapService from './kap.service';
import investingService from './investing.service';
import cache from '../utils/cache';
import logger from '../utils/logger';
import { StockData } from '../types';

class DataAggregatorService {
  /**
   * Tüm kaynaklardan veri çeker ve birleştirir
   */
  async getCompleteStockData(symbol: string): Promise<StockData> {
    const cacheKey = `stock:${symbol.toUpperCase()}`;

    // Önce cache'e bak
    const cached = cache.get<StockData>(cacheKey);
    if (cached) {
      logger.info(`Returning cached data for ${symbol}`);
      return cached;
    }

    logger.info(`Aggregating data from all sources for ${symbol}`);

    try {
      // Tüm kaynaklardan paralel veri çek
      const [yahooData, kapData, investingData] = await Promise.allSettled([
        yahooFinanceService.getStockData(symbol),
        kapService.getFinancialData(symbol),
        investingService.getStockData(symbol),
      ]);

      // Veri birleştir - öncelik sırası: Investing > Yahoo > KAP
      const aggregatedData = this.mergeData(
        symbol,
        this.getResultValue(yahooData),
        this.getResultValue(kapData),
        this.getResultValue(investingData)
      );

      // Ek hesaplamalar yap
      this.enrichData(aggregatedData);

      // Cache'e kaydet
      cache.set(cacheKey, aggregatedData);

      logger.info(`Data aggregation completed for ${symbol}`);
      return aggregatedData;

    } catch (error: any) {
      logger.error(`Data aggregation error for ${symbol}:`, error);
      throw new Error(`Veri toplama hatası: ${error.message}`);
    }
  }

  /**
   * Promise.allSettled sonucunu güvenli şekilde çıkarır
   */
  private getResultValue(result: PromiseSettledResult<Partial<StockData>>): Partial<StockData> {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.warn('Data source failed:', result.reason);
      return {};
    }
  }

  /**
   * Farklı kaynaklardan gelen verileri birleştirir
   */
  private mergeData(
    symbol: string,
    yahoo: Partial<StockData>,
    kap: Partial<StockData>,
    investing: Partial<StockData>
  ): StockData {
    return {
      symbol: symbol.toUpperCase(),
      companyName: investing.companyName || yahoo.companyName || symbol,
      currentPrice: investing.priceData?.currentPrice || yahoo.currentPrice || null,

      priceData: {
        currentPrice: investing.priceData?.currentPrice || yahoo.priceData?.currentPrice || null,
        dayHigh: investing.priceData?.dayHigh || yahoo.priceData?.dayHigh || null,
        dayLow: investing.priceData?.dayLow || yahoo.priceData?.dayLow || null,
        dayAverage: investing.priceData?.dayAverage || yahoo.priceData?.dayAverage || null,
        week1High: investing.priceData?.week1High || yahoo.priceData?.week1High || null,
        week1Low: investing.priceData?.week1Low || yahoo.priceData?.week1Low || null,
        day30High: investing.priceData?.day30High || yahoo.priceData?.day30High || null,
        day30Low: investing.priceData?.day30Low || yahoo.priceData?.day30Low || null,
        week52High: investing.priceData?.week52High || yahoo.priceData?.week52High || null,
        week52Low: investing.priceData?.week52Low || yahoo.priceData?.week52Low || null,
        week52Change: investing.priceData?.week52Change || yahoo.priceData?.week52Change || null,
        week52ChangeTL: investing.priceData?.week52ChangeTL || yahoo.priceData?.week52ChangeTL || null,
      },

      tradingData: {
        bid: investing.tradingData?.bid || yahoo.tradingData?.bid || null,
        ask: investing.tradingData?.ask || yahoo.tradingData?.ask || null,
        volume: investing.tradingData?.volume || yahoo.tradingData?.volume || null,
        volumeTL: investing.tradingData?.volumeTL || yahoo.tradingData?.volumeTL || null,
        lotSize: investing.tradingData?.lotSize || yahoo.tradingData?.lotSize || null,
        dailyChange: investing.tradingData?.dailyChange || yahoo.tradingData?.dailyChange || null,
        dailyChangePercent: investing.tradingData?.dailyChangePercent || yahoo.tradingData?.dailyChangePercent || null,
        dailyOpen: investing.tradingData?.dailyOpen || yahoo.tradingData?.dailyOpen || null,
      },

      fundamentals: {
        marketCap: yahoo.fundamentals?.marketCap || investing.fundamentals?.marketCap || null,
        pdDD: yahoo.fundamentals?.pdDD || investing.fundamentals?.pdDD || null,
        fk: yahoo.fundamentals?.fk || investing.fundamentals?.fk || null,
        fdFAVO: yahoo.fundamentals?.fdFAVO || null,
        pdEBITDA: yahoo.fundamentals?.pdEBITDA || null,
        shares: yahoo.fundamentals?.shares || kap.fundamentals?.shares || null,
        paidCapital: kap.fundamentals?.paidCapital || null,
      },

      financials: {
        period: kap.financials?.period || yahoo.financials?.period || null,
        revenue: kap.financials?.revenue || yahoo.financials?.revenue || null,
        grossProfit: kap.financials?.grossProfit || yahoo.financials?.grossProfit || null,
        netIncome: kap.financials?.netIncome || yahoo.financials?.netIncome || null,
        profitability: kap.financials?.profitability || yahoo.financials?.profitability || null,
        equity: kap.financials?.equity || yahoo.financials?.equity || null,
        currentAssets: kap.financials?.currentAssets || yahoo.financials?.currentAssets || null,
        fixedAssets: kap.financials?.fixedAssets || null,
        totalAssets: kap.financials?.totalAssets || yahoo.financials?.totalAssets || null,
        shortTermLiabilities: kap.financials?.shortTermLiabilities || yahoo.financials?.shortTermLiabilities || null,
        longTermLiabilities: kap.financials?.longTermLiabilities || yahoo.financials?.longTermLiabilities || null,
        shortTermBankLoans: kap.financials?.shortTermBankLoans || null,
        longTermBankLoans: kap.financials?.longTermBankLoans || null,
        tradeReceivables: kap.financials?.tradeReceivables || null,
        financialInvestments: kap.financials?.financialInvestments || null,
        investmentProperty: kap.financials?.investmentProperty || null,
        prepaidExpenses: kap.financials?.prepaidExpenses || null,
        deferredTax: kap.financials?.deferredTax || null,
      },

      analysis: {
        domesticSalesRatio: yahoo.analysis?.domesticSalesRatio || null,
        foreignSalesRatio: yahoo.analysis?.foreignSalesRatio || null,
        exportRatio: yahoo.analysis?.exportRatio || null,
        averageDividend: yahoo.analysis?.averageDividend || null,
      },

      lastUpdated: new Date(),
    };
  }

  /**
   * Verilere ek hesaplamalar ve analizler ekler
   */
  private enrichData(data: StockData): void {
    // 52 hafta değişim hesapla
    if (data.priceData.week52Low && data.priceData.currentPrice) {
      data.priceData.week52Change =
        ((data.priceData.currentPrice - data.priceData.week52Low) / data.priceData.week52Low) * 100;
      data.priceData.week52ChangeTL = data.priceData.currentPrice - data.priceData.week52Low;
    }

    // Gün ortalaması hesapla
    if (data.priceData.dayHigh && data.priceData.dayLow) {
      data.priceData.dayAverage = (data.priceData.dayHigh + data.priceData.dayLow) / 2;
    }

    // Hacim TL hesapla
    if (data.tradingData.volume && data.priceData.currentPrice) {
      data.tradingData.volumeTL = data.tradingData.volume * data.priceData.currentPrice;
    }

    // Karlılık hesapla
    if (data.financials.netIncome && data.financials.revenue && data.financials.revenue !== 0) {
      data.financials.profitability = (data.financials.netIncome / data.financials.revenue) * 100;
    }

    // Duran varlıklar hesapla (toplam - dönen)
    if (data.financials.totalAssets && data.financials.currentAssets) {
      data.financials.fixedAssets = data.financials.totalAssets - data.financials.currentAssets;
    }
  }

  /**
   * Birden fazla hissenin verilerini paralel çeker
   */
  async getMultipleStocks(symbols: string[]): Promise<StockData[]> {
    logger.info(`Fetching data for ${symbols.length} stocks`);

    const results = await Promise.allSettled(
      symbols.map(symbol => this.getCompleteStockData(symbol))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<StockData> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Cache'i temizler
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      const cacheKey = `stock:${symbol.toUpperCase()}`;
      cache.del(cacheKey);
      logger.info(`Cache cleared for ${symbol}`);
    } else {
      cache.flush();
      logger.info('All cache cleared');
    }
  }
}

export default new DataAggregatorService();
