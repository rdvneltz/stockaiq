import yahooFinance from 'yahoo-finance2';
import logger from '../utils/logger';
import { StockData } from '../types';

class YahooFinanceService {
  private readonly BIST_SUFFIX = '.IS';

  /**
   * BIST hisse sembolünü Yahoo Finance formatına dönüştürür
   * Örnek: THYAO -> THYAO.IS
   */
  private formatSymbol(symbol: string): string {
    const cleanSymbol = symbol.toUpperCase().trim();
    return cleanSymbol.endsWith(this.BIST_SUFFIX) ? cleanSymbol : `${cleanSymbol}${this.BIST_SUFFIX}`;
  }

  /**
   * Yahoo Finance'den hisse verilerini çeker
   */
  async getStockData(symbol: string): Promise<Partial<StockData>> {
    const yahooSymbol = this.formatSymbol(symbol);
    logger.info(`Fetching data from Yahoo Finance: ${yahooSymbol}`);

    try {
      const [quote, quoteSummary] = await Promise.all([
        this.getQuote(yahooSymbol),
        this.getQuoteSummary(yahooSymbol),
      ]);

      // Period'u string'e çevir
      const period = quoteSummary?.mostRecentQuarter
        ? (typeof quoteSummary.mostRecentQuarter === 'string'
            ? quoteSummary.mostRecentQuarter
            : new Date(quoteSummary.mostRecentQuarter).toISOString().split('T')[0])
        : null;

      const data: Partial<StockData> = {
        symbol: symbol.toUpperCase(),
        companyName: quote?.longName || quote?.shortName || symbol,
        currentPrice: quote?.regularMarketPrice || null,

        priceData: {
          currentPrice: quote?.regularMarketPrice || null,
          dayHigh: quote?.regularMarketDayHigh || null,
          dayLow: quote?.regularMarketDayLow || null,
          dayAverage: this.calculateAverage(quote?.regularMarketDayHigh, quote?.regularMarketDayLow),
          week1High: null, // Yahoo'dan alınamıyor
          week1Low: null,
          day30High: null,
          day30Low: null,
          week52High: quote?.fiftyTwoWeekHigh || null,
          week52Low: quote?.fiftyTwoWeekLow || null,
          week52Change: this.calculatePercentChange(quote?.fiftyTwoWeekLow, quote?.regularMarketPrice),
          week52ChangeTL: this.calculateChange(quote?.fiftyTwoWeekLow, quote?.regularMarketPrice),
        },

        tradingData: {
          bid: quote?.bid || null,
          ask: quote?.ask || null,
          volume: quote?.regularMarketVolume || null,
          volumeTL: this.calculateVolumeTL(quote?.regularMarketVolume, quote?.regularMarketPrice),
          lotSize: null,
          dailyChange: quote?.regularMarketChange || null,
          dailyChangePercent: quote?.regularMarketChangePercent || null,
          dailyOpen: quote?.regularMarketOpen || null,
        },

        fundamentals: {
          marketCap: quoteSummary?.marketCap || null,
          pdDD: quoteSummary?.priceToBook || null,
          fk: quoteSummary?.trailingPE || null,
          fdFAVO: quoteSummary?.forwardPE || null,
          pdEBITDA: quoteSummary?.enterpriseToEbitda || null,
          shares: quoteSummary?.sharesOutstanding || null,
          paidCapital: null,
          eps: null,
          roe: null,
          roa: null,
        },

        financials: {
          period,
          revenue: quoteSummary?.totalRevenue || null,
          grossProfit: quoteSummary?.grossProfit || null,
          netIncome: quoteSummary?.netIncome || null,
          profitability: this.calculateProfitability(quoteSummary?.netIncome, quoteSummary?.totalRevenue),
          equity: quoteSummary?.totalStockholderEquity || null,
          currentAssets: quoteSummary?.totalCurrentAssets || null,
          fixedAssets: null,
          totalAssets: quoteSummary?.totalAssets || null,
          shortTermLiabilities: quoteSummary?.totalCurrentLiabilities || null,
          longTermLiabilities: null, // Yahoo Finance'de bu alan yok
          shortTermBankLoans: null,
          longTermBankLoans: null,
          tradeReceivables: null,
          financialInvestments: null,
          investmentProperty: null,
          prepaidExpenses: null,
          deferredTax: null,
          totalDebt: null,
          netDebt: null,
          workingCapital: null,
          grossProfitMargin: null,
        },

        analysis: {
          domesticSalesRatio: null,
          foreignSalesRatio: null,
          exportRatio: null,
          averageDividend: quoteSummary?.dividendYield || null,
        },

        lastUpdated: new Date(),
      };

      logger.info(`Yahoo Finance data fetched successfully: ${symbol}`);
      return data;

    } catch (error: any) {
      logger.error(`Yahoo Finance error for ${symbol}:`, error);
      throw new Error(`Yahoo Finance veri çekme hatası: ${error.message}`);
    }
  }

  /**
   * Quote verilerini çeker
   */
  private async getQuote(symbol: string) {
    try {
      const result = await yahooFinance.quote(symbol);
      return result;
    } catch (error) {
      logger.warn(`Yahoo Finance quote error: ${symbol}`, error);
      return null;
    }
  }

  /**
   * Quote summary verilerini çeker
   */
  private async getQuoteSummary(symbol: string) {
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData'],
      });

      const mostRecentQuarter = result.defaultKeyStatistics?.mostRecentQuarter;

      return {
        marketCap: result.price?.marketCap,
        priceToBook: result.defaultKeyStatistics?.priceToBook,
        trailingPE: result.summaryDetail?.trailingPE,
        forwardPE: result.summaryDetail?.forwardPE,
        enterpriseToEbitda: result.defaultKeyStatistics?.enterpriseToEbitda,
        sharesOutstanding: result.defaultKeyStatistics?.sharesOutstanding,
        mostRecentQuarter: mostRecentQuarter ? new Date(mostRecentQuarter).toISOString() : null,
        totalRevenue: result.financialData?.totalRevenue,
        grossProfit: result.financialData?.grossMargins,
        netIncome: result.defaultKeyStatistics?.netIncomeToCommon,
        totalStockholderEquity: result.financialData?.totalCash,
        totalCurrentAssets: result.financialData?.totalCash,
        totalAssets: result.financialData?.totalCash,
        totalCurrentLiabilities: result.financialData?.totalDebt,
        longTermDebt: null, // Yahoo Finance'de bu alan yok
        dividendYield: result.summaryDetail?.dividendYield,
      };
    } catch (error) {
      logger.warn(`Yahoo Finance quoteSummary error: ${symbol}`, error);
      return null;
    }
  }

  /**
   * Health check - Yahoo Finance servisinin çalışıp çalışmadığını kontrol eder
   */
  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      // BIST30 endeksini test için kullan
      await yahooFinance.quote('XU030.IS');
      const responseTime = Date.now() - startTime;

      logger.debug(`Yahoo Finance health check: OK (${responseTime}ms)`);
      return { status: true, responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Yahoo Finance health check failed:', error);
      return { status: false, responseTime, error: error.message };
    }
  }

  // Yardımcı hesaplama fonksiyonları
  private calculateAverage(high?: number | null, low?: number | null): number | null {
    if (high && low) return (high + low) / 2;
    return null;
  }

  private calculatePercentChange(oldValue?: number | null, newValue?: number | null): number | null {
    if (oldValue && newValue && oldValue !== 0) {
      return ((newValue - oldValue) / oldValue) * 100;
    }
    return null;
  }

  private calculateChange(oldValue?: number | null, newValue?: number | null): number | null {
    if (oldValue && newValue) {
      return newValue - oldValue;
    }
    return null;
  }

  private calculateVolumeTL(volume?: number | null, price?: number | null): number | null {
    if (volume && price) return volume * price;
    return null;
  }

  private calculateProfitability(netIncome?: number | null, revenue?: number | null): number | null {
    if (netIncome && revenue && revenue !== 0) {
      return (netIncome / revenue) * 100;
    }
    return null;
  }
}

export default new YahooFinanceService();
