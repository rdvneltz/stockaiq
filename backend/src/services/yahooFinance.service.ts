import yahooFinance from 'yahoo-finance2';
import logger from '../utils/logger';
import { StockData } from '../types';

class YahooFinanceService {
  private readonly BIST_SUFFIX = '.IS';
  private enabled = true;
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 3; // 429 hatası alırsa hızlı devre dışı bırak
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 500; // Her istek arasında minimum 500ms bekle
  private rateLimitedUntil = 0; // Rate limit sona erme zamanı

  /**
   * BIST hisse sembolünü Yahoo Finance formatına dönüştürür
   * Örnek: THYAO -> THYAO.IS
   */
  private formatSymbol(symbol: string): string {
    const cleanSymbol = symbol.toUpperCase().trim();
    return cleanSymbol.endsWith(this.BIST_SUFFIX) ? cleanSymbol : `${cleanSymbol}${this.BIST_SUFFIX}`;
  }

  /**
   * Rate limit kontrolü - gerekirse bekle
   */
  private async waitForRateLimit(): Promise<boolean> {
    const now = Date.now();

    // Rate limit aktifse, boş döndür
    if (this.rateLimitedUntil > now) {
      const waitTime = Math.ceil((this.rateLimitedUntil - now) / 1000);
      logger.debug(`Yahoo Finance rate limited, ${waitTime}s kaldı`);
      return false;
    }

    // Son istekten beri yeterli zaman geçmediyse bekle
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    return true;
  }

  /**
   * Yahoo Finance'den hisse verilerini çeker
   */
  async getStockData(symbol: string): Promise<Partial<StockData>> {
    // Servis devre dışıysa boş döndür
    if (!this.enabled) {
      logger.debug(`Yahoo Finance is temporarily disabled, skipping ${symbol}`);
      return {};
    }

    // Rate limit kontrolü
    const canProceed = await this.waitForRateLimit();
    if (!canProceed) {
      return {};
    }

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
          roe: quoteSummary?.returnOnEquity ? quoteSummary.returnOnEquity * 100 : null, // Yüzdeye çevir
          roa: quoteSummary?.returnOnAssets ? quoteSummary.returnOnAssets * 100 : null, // Yüzdeye çevir
        },

        financials: {
          period,
          revenue: quoteSummary?.totalRevenue || null,
          grossProfit: quoteSummary?.grossProfit || null, // DÜZELTME: Artık doğru değer geliyor
          netIncome: quoteSummary?.netIncome || null,
          profitability: quoteSummary?.profitMargins ? quoteSummary.profitMargins * 100 : null, // Yüzdeye çevir
          grossProfitMargin: quoteSummary?.grossMargins ? quoteSummary.grossMargins * 100 : null, // Yüzdeye çevir
          equity: quoteSummary?.totalStockholderEquity || null, // DÜZELTME: Artık doğru değer
          currentAssets: quoteSummary?.totalCurrentAssets || null, // DÜZELTME: Artık doğru değer
          fixedAssets: null, // enrichData'da hesaplanacak
          totalAssets: quoteSummary?.totalAssets || null, // DÜZELTME: Artık doğru değer
          shortTermLiabilities: quoteSummary?.totalCurrentLiabilities || null, // DÜZELTME: Artık doğru değer
          longTermLiabilities: quoteSummary?.totalLiabilities && quoteSummary?.totalCurrentLiabilities
            ? quoteSummary.totalLiabilities - quoteSummary.totalCurrentLiabilities
            : null,
          shortTermBankLoans: quoteSummary?.shortTermDebt || null,
          longTermBankLoans: quoteSummary?.longTermDebt || null,
          tradeReceivables: quoteSummary?.receivables || null,
          financialInvestments: quoteSummary?.cash || null,
          investmentProperty: null,
          prepaidExpenses: null,
          deferredTax: null,
          totalDebt: quoteSummary?.totalLiabilities || null,
          netDebt: null, // enrichData'da hesaplanacak
          workingCapital: null, // enrichData'da hesaplanacak
        },

        // Sektör ve endüstri bilgisi
        sector: quoteSummary?.sector || null,
        industry: quoteSummary?.industry || null,

        analysis: {
          domesticSalesRatio: null,
          foreignSalesRatio: null,
          exportRatio: null,
          averageDividend: quoteSummary?.dividendYield || null,
        },

        lastUpdated: new Date(),
      };

      // Başarılı - hata sayacını sıfırla
      this.consecutiveFailures = 0;

      logger.info(`Yahoo Finance data fetched successfully: ${symbol}`);
      return data;

    } catch (error: any) {
      this.handleError(error, symbol);
      // Hata fırlatmak yerine boş data döndür - diğer kaynaklar kullanılsın
      return {};
    }
  }

  /**
   * Hata yönetimi - 429 hatası için özel işlem
   */
  private handleError(error: any, symbol: string): void {
    const errorMessage = error?.message || '';
    const is429Error = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

    this.consecutiveFailures++;
    logger.warn(`Yahoo Finance error for ${symbol} (${this.consecutiveFailures}/${this.MAX_FAILURES}):`, errorMessage);

    // 429 hatası için anında rate limit uygula
    if (is429Error) {
      // Exponential backoff: 30s, 60s, 120s, 240s...
      const backoffTime = Math.min(30 * 1000 * Math.pow(2, this.consecutiveFailures - 1), 5 * 60 * 1000);
      this.rateLimitedUntil = Date.now() + backoffTime;
      logger.warn(`Yahoo Finance rate limited for ${backoffTime / 1000}s due to 429 error`);
    }

    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      logger.warn('Yahoo Finance temporarily disabled due to consecutive failures');
      this.enabled = false;

      // 429 hatası için 5 dakika, diğer hatalar için 2 dakika bekle
      const cooldownTime = is429Error ? 5 * 60 * 1000 : 2 * 60 * 1000;
      setTimeout(() => {
        this.enabled = true;
        this.consecutiveFailures = 0;
        this.rateLimitedUntil = 0;
        logger.info('Yahoo Finance re-enabled after cooldown');
      }, cooldownTime);
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
   * Sadece fiyat verilerini çeker (hafif endpoint için)
   * quoteSummary çağrılmaz - çok daha hızlı
   */
  async getQuoteOnly(symbol: string): Promise<{
    currentPrice: number | null;
    dailyChange: number | null;
    dailyChangePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    volume: number | null;
  } | null> {
    // Servis devre dışıysa boş döndür
    if (!this.enabled) {
      return null;
    }

    // Rate limit kontrolü
    const canProceed = await this.waitForRateLimit();
    if (!canProceed) {
      return null;
    }

    const yahooSymbol = this.formatSymbol(symbol);

    try {
      const quote = await yahooFinance.quote(yahooSymbol);

      if (!quote) {
        return null;
      }

      // Başarılı - hata sayacını sıfırla
      this.consecutiveFailures = 0;

      return {
        currentPrice: quote.regularMarketPrice || null,
        dailyChange: quote.regularMarketChange || null,
        dailyChangePercent: quote.regularMarketChangePercent || null,
        dayHigh: quote.regularMarketDayHigh || null,
        dayLow: quote.regularMarketDayLow || null,
        volume: quote.regularMarketVolume || null,
      };
    } catch (error: any) {
      this.handleError(error, symbol);
      return null;
    }
  }

  /**
   * Quote summary verilerini çeker
   */
  private async getQuoteSummary(symbol: string) {
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'balanceSheetHistory', 'incomeStatementHistory', 'assetProfile'],
      });

      const mostRecentQuarter = result.defaultKeyStatistics?.mostRecentQuarter;

      // Balance sheet verilerini al (en son dönem)
      const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements?.[0];
      const incomeStatement = result.incomeStatementHistory?.incomeStatementHistory?.[0];

      return {
        marketCap: result.price?.marketCap,
        priceToBook: result.defaultKeyStatistics?.priceToBook,
        trailingPE: result.summaryDetail?.trailingPE,
        forwardPE: result.summaryDetail?.forwardPE,
        enterpriseToEbitda: result.defaultKeyStatistics?.enterpriseToEbitda,
        sharesOutstanding: result.defaultKeyStatistics?.sharesOutstanding,
        mostRecentQuarter: mostRecentQuarter ? new Date(mostRecentQuarter).toISOString() : null,

        // Income Statement verileri (DÜZELTME: Doğru alanlardan al)
        totalRevenue: incomeStatement?.totalRevenue || result.financialData?.totalRevenue,
        grossProfit: incomeStatement?.grossProfit || null, // DÜZELTME: grossMargins DEĞİL, grossProfit
        netIncome: incomeStatement?.netIncome || result.defaultKeyStatistics?.netIncomeToCommon,
        operatingIncome: incomeStatement?.operatingIncome || null,
        ebitda: result.financialData?.ebitda || incomeStatement?.ebit,

        // Balance Sheet verileri (DÜZELTME: Doğru alanlardan al)
        totalStockholderEquity: balanceSheet?.totalStockholderEquity || null, // DÜZELTME: totalCash DEĞİL
        totalCurrentAssets: balanceSheet?.totalCurrentAssets || null, // DÜZELTME: totalCash DEĞİL
        totalAssets: balanceSheet?.totalAssets || null, // DÜZELTME: totalCash DEĞİL
        totalCurrentLiabilities: balanceSheet?.totalCurrentLiabilities || null, // DÜZELTME: totalDebt DEĞİL
        totalLiabilities: balanceSheet?.totalLiab || null,
        longTermDebt: balanceSheet?.longTermDebt || null,
        shortTermDebt: balanceSheet?.shortLongTermDebt || null,
        cash: balanceSheet?.cash || result.financialData?.totalCash,
        inventory: balanceSheet?.inventory || null,
        receivables: balanceSheet?.netReceivables || null,

        // Diğer veriler
        dividendYield: result.summaryDetail?.dividendYield,
        profitMargins: result.financialData?.profitMargins,
        grossMargins: result.financialData?.grossMargins,
        operatingMargins: result.financialData?.operatingMargins,
        returnOnEquity: result.financialData?.returnOnEquity,
        returnOnAssets: result.financialData?.returnOnAssets,

        // Şirket bilgileri
        sector: result.assetProfile?.sector || null,
        industry: result.assetProfile?.industry || null,
      };
    } catch (error) {
      logger.warn(`Yahoo Finance quoteSummary error: ${symbol}`, error);
      return null;
    }
  }

  /**
   * Yahoo Finance'den historical price data çeker (candlestick için)
   * Not: Yahoo Finance intraday (saatlik) data desteklemiyor, sadece günlük ve üzeri
   */
  async getHistoricalData(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' = '3mo',
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<any[]> {
    // Rate limit kontrolü
    const canProceed = await this.waitForRateLimit();
    if (!canProceed) {
      logger.warn(`Rate limited, skipping historical data for ${symbol}`);
      return [];
    }

    const yahooSymbol = this.formatSymbol(symbol);
    logger.info(`Fetching historical data from Yahoo Finance: ${yahooSymbol} (period: ${period}, interval: ${interval})`);

    try {
      const queryOptions = {
        period1: this.getPeriodStartDate(period),
        period2: new Date(),
        interval: interval as '1d' | '1wk' | '1mo'
      };
      const result = await yahooFinance.historical(yahooSymbol, queryOptions);

      // Yahoo Finance formatını lightweight-charts formatına dönüştür
      const chartData = result.map((candle: any) => ({
        time: Math.floor(candle.date.getTime() / 1000), // Unix timestamp in seconds
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      }));

      logger.info(`Historical data fetched: ${chartData.length} candles`);
      return chartData;
    } catch (error: any) {
      logger.error(`Yahoo Finance historical data error for ${symbol}:`, error);
      throw new Error(`Historical data çekme hatası: ${error.message}`);
    }
  }

  /**
   * Period string'ini başlangıç tarihine çevirir
   */
  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '5d':
        startDate.setDate(now.getDate() - 5);
        break;
      case '1mo':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3mo':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6mo':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case '5y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      case '10y':
        startDate.setFullYear(now.getFullYear() - 10);
        break;
      default:
        startDate.setMonth(now.getMonth() - 3);
    }

    return startDate;
  }

  /**
   * Health check - Yahoo Finance servisinin çalışıp çalışmadığını kontrol eder
   */
  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    // Servis geçici olarak devre dışıysa
    if (!this.enabled) {
      return {
        status: true,
        responseTime: 0,
        error: 'Temporarily disabled (cooling down from errors)'
      };
    }

    const startTime = Date.now();
    try {
      // BIST30 endeksini test için kullan
      await yahooFinance.quote('XU030.IS');
      const responseTime = Date.now() - startTime;

      logger.debug(`Yahoo Finance health check: OK (${responseTime}ms)`);
      return { status: true, responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error?.message || 'Unknown error';
      logger.warn('Yahoo Finance health check failed:', errorMessage);
      return { status: false, responseTime, error: errorMessage };
    }
  }

  /**
   * Servisi manuel olarak sıfırla
   */
  resetService(): void {
    this.enabled = true;
    this.consecutiveFailures = 0;
    logger.info('Yahoo Finance service manually reset');
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
