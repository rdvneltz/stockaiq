import yahooFinanceService from './yahooFinance.service';
import kapService from './kap.service';
import investingService from './investing.service';
import twelveDataService from './twelveData.service';
import finnhubService from './finnhub.service';
import fmpService from './fmp.service';
import isYatirimService from './isyatirim.service';
import stockDbService from './stockDb.service';
import priceTargetCalculator from './priceTargetCalculator.service';
import accumulationDetector from './accumulationDetector.service';
import { DataCategory } from '../models/Stock.model';
import cache from '../utils/cache';
import logger from '../utils/logger';
import { StockData, DEFAULT_SECTOR_THRESHOLDS, SectorThresholds } from '../types';

// BIST hisselerini sektörlerine mapping
const STOCK_SECTOR_MAP: Record<string, string> = {
  // Bankacılık
  'GARAN': 'Bankacılık', 'AKBNK': 'Bankacılık', 'YKBNK': 'Bankacılık', 'VAKBN': 'Bankacılık',
  'HALKB': 'Bankacılık', 'ISCTR': 'Bankacılık', 'TSKB': 'Bankacılık', 'SKBNK': 'Bankacılık',
  // Holding
  'SAHOL': 'Holding', 'KCHOL': 'Holding', 'DOHOL': 'Holding', 'AGHOL': 'Holding', 'GLYHO': 'Holding',
  // Havacılık
  'THYAO': 'Havacılık', 'PGSUS': 'Havacılık', 'TAVHL': 'Havacılık', 'CLEBI': 'Havacılık',
  // Telekomünikasyon
  'TCELL': 'Telekomünikasyon', 'TTKOM': 'Telekomünikasyon',
  // Demir Çelik
  'EREGL': 'Demir Çelik', 'KRDMD': 'Demir Çelik', 'ISDMR': 'Demir Çelik',
  // Enerji
  'TUPRS': 'Enerji', 'PETKM': 'Enerji', 'AYGAZ': 'Enerji', 'ENJSA': 'Enerji',
  'AKENR': 'Enerji', 'AYDEM': 'Enerji', 'ODAS': 'Enerji',
  // Otomotiv
  'TOASO': 'Otomotiv', 'FROTO': 'Otomotiv', 'OTKAR': 'Otomotiv', 'DOAS': 'Otomotiv',
  // Perakende
  'BIMAS': 'Perakende', 'MGROS': 'Perakende', 'SOKM': 'Perakende', 'MAVI': 'Perakende',
  // Teknoloji
  'ASELS': 'Teknoloji', 'LOGO': 'Teknoloji', 'NETAS': 'Teknoloji', 'ARENA': 'Teknoloji',
  // Beyaz Eşya/Elektronik
  'ARCLK': 'Teknoloji', 'VESTL': 'Teknoloji', 'VESBE': 'Teknoloji',
};

// Maksimum mantıklı değerler (Türkiye'nin en büyük şirketleri bile bu değerlere ulaşamaz)
const MAX_FINANCIAL_VALUE = 10_000_000_000_000; // 10 trilyon TL
const MAX_RATIO = 10000; // %10000 (100x)
const MIN_RATIO = -10000; // %-10000

/**
 * Finansal değerin mantıklı olup olmadığını kontrol eder
 * Absürt büyük/küçük değerleri null yapar
 */
function validateFinancialValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!isFinite(value)) return null;
  if (Math.abs(value) > MAX_FINANCIAL_VALUE) {
    return null; // Absürt büyük değer
  }
  return value;
}

/**
 * Oran değerinin mantıklı olup olmadığını kontrol eder
 */
function validateRatio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!isFinite(value)) return null;
  if (value > MAX_RATIO || value < MIN_RATIO) {
    return null; // Absürt oran
  }
  return value;
}

/**
 * Yüzde değerinin mantıklı olup olmadığını kontrol eder (max %1000)
 */
function validatePercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!isFinite(value)) return null;
  if (value > 1000 || value < -1000) {
    return null; // Brüt kar marjı %200 olamaz mesela
  }
  return value;
}

class DataAggregatorService {
  /**
   * Tüm kaynaklardan veri çeker ve birleştirir (MongoDB-first yaklaşımı)
   * NOT: API çağrıları artık SEQUENTIAL yapılıyor (paralel = server crash)
   */
  async getCompleteStockData(symbol: string): Promise<StockData> {
    const cacheKey = `stock:${symbol.toUpperCase()}`;

    // Önce in-memory cache'e bak (10 saniye)
    const cached = cache.get<StockData>(cacheKey);
    if (cached) {
      logger.debug(`Returning in-memory cached data for ${symbol}`);
      return cached;
    }

    logger.info(`Fetching data for ${symbol}`);

    try {
      // 1. MongoDB'den veriyi al
      const dbData = await stockDbService.getStock(symbol);

      // 2. Hangi kategorilerin güncellenmesi gerektiğini belirle
      const needsRealtimeUpdate = !dbData || !dbData.currentPrice;
      const needsDailyUpdate = !dbData || !dbData.fundamentals?.marketCap;
      const needsQuarterlyUpdate = !dbData || !dbData.financials?.revenue;
      const needsStaticUpdate = !dbData || !dbData.companyName;

      // 3. Eğer tüm veriler güncel ise, direkt dön
      if (dbData && !needsRealtimeUpdate && !needsDailyUpdate && !needsQuarterlyUpdate && !needsStaticUpdate) {
        logger.info(`All data is fresh for ${symbol}, returning from DB`);
        cache.set(cacheKey, dbData);
        return dbData;
      }

      // 4. SEQUENTIAL API çağrıları (paralel = server crash!)
      // Her API çağrısı arasında rate limit bekleme süresi var
      logger.info(`Fetching updates for ${symbol}: RT=${needsRealtimeUpdate}, Daily=${needsDailyUpdate}, Quarterly=${needsQuarterlyUpdate}`);

      // Yahoo Finance - ana veri kaynağı (öncelikli)
      let yahooData: Partial<StockData> = {};
      try {
        yahooData = await yahooFinanceService.getStockData(symbol);
        await this.waitBetweenRequests(300); // 300ms bekle
      } catch (e) {
        logger.warn(`Yahoo Finance failed for ${symbol}`);
      }

      // Twelve Data - sadece Yahoo başarısızsa veya eksik veri varsa
      let twelveData: Partial<StockData> = {};
      if (!yahooData.currentPrice) {
        try {
          twelveData = await twelveDataService.getStockData(symbol);
          await this.waitBetweenRequests(300);
        } catch (e) {
          logger.warn(`Twelve Data failed for ${symbol}`);
        }
      }

      // Investing - sadece fiyat verisi hala eksikse
      let investingData: Partial<StockData> = {};
      if (!yahooData.currentPrice && !twelveData.currentPrice) {
        try {
          investingData = await investingService.getStockData(symbol);
          await this.waitBetweenRequests(300);
        } catch (e) {
          logger.warn(`Investing failed for ${symbol}`);
        }
      }

      // Quarterly veriler için ayrı çağrı (sadece gerektiğinde)
      let kapData: Partial<StockData> = {};
      let isYatirimData: Partial<StockData> = {};

      if (needsQuarterlyUpdate) {
        try {
          kapData = await kapService.getFinancialData(symbol);
          await this.waitBetweenRequests(300);
        } catch (e) {
          logger.warn(`KAP failed for ${symbol}`);
        }

        // İş Yatırım - OPTİMİZE EDİLDİ: 5s timeout + 24 saat cache
        try {
          isYatirimData = await isYatirimService.getFinancialStatements(symbol);
          await this.waitBetweenRequests(200); // Daha kısa bekleme (cache olduğu için)
        } catch (e) {
          logger.warn(`IsYatirim failed for ${symbol}`);
        }
      }

      // Kullanılmayan değişkenler için boş değer
      const finnhubData: Partial<StockData> = {};
      const fmpData: Partial<StockData> = {};

      // 5. Veri birleştir
      const aggregatedData = this.mergeData(
        symbol,
        yahooData,
        twelveData,
        finnhubData,
        fmpData,
        kapData,
        isYatirimData,
        investingData,
        dbData // DB'den gelen eski veriyi de birleştir
      );

      // 5.5. VERİ VALİDASYONU - Absürt değerleri temizle
      this.validateAndSanitizeData(aggregatedData);

      // 6. Ek hesaplamalar yap
      this.enrichData(aggregatedData);

      // 7. Sektör bilgisini ekle
      this.assignSector(aggregatedData);

      // 8. Akıllı analiz yap (sektör bazlı eşiklerle)
      this.performSmartAnalysis(aggregatedData);

      // 9. AI fiyat hedefleri hesapla (smart analysis sonrası)
      const priceTargets = priceTargetCalculator.calculatePriceTargets(aggregatedData);
      if (priceTargets) {
        aggregatedData.priceTargets = priceTargets;
      }

      // 10. Birikim/Dağıtım tespiti - GEÇİCİ DEVRE DIŞI
      // Her hisse için 2 ekstra Yahoo API çağrısı yapıyor, bellek taşmasına sebep oluyor
      // TODO: Historical data cache'den alınacak şekilde optimize et
      // const accumulationSignals = await accumulationDetector.detectAccumulation(aggregatedData);
      // if (accumulationSignals) {
      //   aggregatedData.accumulationSignals = accumulationSignals;
      // }

      // 11. MongoDB'ye kaydet (hangi kategoriler güncellendi?)
      await stockDbService.saveStock(aggregatedData, {
        realtime: needsRealtimeUpdate,
        daily: needsDailyUpdate,
        quarterly: needsQuarterlyUpdate,
        static: needsStaticUpdate,
      });

      // 10. In-memory cache'e kaydet
      cache.set(cacheKey, aggregatedData);

      logger.info(`Data aggregation completed for ${symbol}`);
      return aggregatedData;

    } catch (error: any) {
      logger.error(`Data aggregation error for ${symbol}:`, error);
      throw new Error(`Veri toplama hatası: ${error.message}`);
    }
  }

  /**
   * API çağrıları arasında bekleme süresi (rate limit için)
   */
  private async waitBetweenRequests(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Veri validasyonu - absürt değerleri null yapar
   * Yahoo Finance bazen hatalı veriler döndürüyor, bu fonksiyon onları temizler
   */
  private validateAndSanitizeData(data: StockData): void {
    // Finansal değerleri valide et
    if (data.financials) {
      data.financials.revenue = validateFinancialValue(data.financials.revenue);
      data.financials.grossProfit = validateFinancialValue(data.financials.grossProfit);
      data.financials.netIncome = validateFinancialValue(data.financials.netIncome);
      data.financials.equity = validateFinancialValue(data.financials.equity);
      data.financials.currentAssets = validateFinancialValue(data.financials.currentAssets);
      data.financials.fixedAssets = validateFinancialValue(data.financials.fixedAssets);
      data.financials.totalAssets = validateFinancialValue(data.financials.totalAssets);
      data.financials.shortTermLiabilities = validateFinancialValue(data.financials.shortTermLiabilities);
      data.financials.longTermLiabilities = validateFinancialValue(data.financials.longTermLiabilities);
      data.financials.shortTermBankLoans = validateFinancialValue(data.financials.shortTermBankLoans);
      data.financials.longTermBankLoans = validateFinancialValue(data.financials.longTermBankLoans);
      data.financials.tradeReceivables = validateFinancialValue(data.financials.tradeReceivables);
      data.financials.financialInvestments = validateFinancialValue(data.financials.financialInvestments);
      data.financials.totalDebt = validateFinancialValue(data.financials.totalDebt);
      data.financials.netDebt = validateFinancialValue(data.financials.netDebt);
      data.financials.workingCapital = validateFinancialValue(data.financials.workingCapital);

      // Yüzde değerleri valide et
      data.financials.profitability = validatePercent(data.financials.profitability);
      data.financials.grossProfitMargin = validatePercent(data.financials.grossProfitMargin);
    }

    // Temel göstergeleri valide et
    if (data.fundamentals) {
      data.fundamentals.marketCap = validateFinancialValue(data.fundamentals.marketCap);
      data.fundamentals.paidCapital = validateFinancialValue(data.fundamentals.paidCapital);
      data.fundamentals.shares = validateFinancialValue(data.fundamentals.shares);

      // Oranları valide et
      data.fundamentals.pdDD = validateRatio(data.fundamentals.pdDD);
      data.fundamentals.fk = validateRatio(data.fundamentals.fk);
      data.fundamentals.fdFAVO = validateRatio(data.fundamentals.fdFAVO);
      data.fundamentals.pdEBITDA = validateRatio(data.fundamentals.pdEBITDA);
      data.fundamentals.eps = validateRatio(data.fundamentals.eps);
      data.fundamentals.roe = validatePercent(data.fundamentals.roe);
      data.fundamentals.roa = validatePercent(data.fundamentals.roa);
    }

    // Likidite oranlarını valide et
    if (data.liquidity) {
      data.liquidity.currentRatio = validateRatio(data.liquidity.currentRatio);
      data.liquidity.acidTestRatio = validateRatio(data.liquidity.acidTestRatio);
      data.liquidity.cashRatio = validateRatio(data.liquidity.cashRatio);
    }

    // Kaldıraç oranlarını valide et
    if (data.leverage) {
      data.leverage.debtToEquity = validateRatio(data.leverage.debtToEquity);
      data.leverage.debtToAssets = validateRatio(data.leverage.debtToAssets);
      data.leverage.shortTermDebtRatio = validatePercent(data.leverage.shortTermDebtRatio);
      data.leverage.longTermDebtRatio = validatePercent(data.leverage.longTermDebtRatio);
    }

    logger.debug(`Data validation completed for ${data.symbol}`);
  }

  /**
   * Farklı kaynaklardan gelen verileri birleştirir (Fallback Chain)
   * İş Yatırım eklendi - BIST finansal verileri için öncelikli kaynak
   */
  private mergeData(
    symbol: string,
    yahoo: Partial<StockData>,
    twelve: Partial<StockData>,
    finnhub: Partial<StockData>,
    fmp: Partial<StockData>,
    kap: Partial<StockData>,
    isYatirim: Partial<StockData>,
    investing: Partial<StockData>,
    db: Partial<StockData> | null = null
  ): StockData {
    return {
      symbol: symbol.toUpperCase(),
      companyName: twelve.companyName || finnhub.companyName || yahoo.companyName || investing.companyName || db?.companyName || symbol,
      currentPrice: twelve.currentPrice || finnhub.currentPrice || yahoo.currentPrice || investing.priceData?.currentPrice || db?.currentPrice || null,
      sector: (yahoo as any).sector || db?.sector || STOCK_SECTOR_MAP[symbol.toUpperCase()] || null,
      industry: (yahoo as any).industry || db?.industry || null,

      priceData: {
        currentPrice: twelve.priceData?.currentPrice || finnhub.priceData?.currentPrice || yahoo.priceData?.currentPrice || investing.priceData?.currentPrice || db?.priceData?.currentPrice || null,
        dayHigh: investing.priceData?.dayHigh || yahoo.priceData?.dayHigh || db?.priceData?.dayHigh || null,
        dayLow: investing.priceData?.dayLow || yahoo.priceData?.dayLow || db?.priceData?.dayLow || null,
        dayAverage: investing.priceData?.dayAverage || yahoo.priceData?.dayAverage || db?.priceData?.dayAverage || null,
        week1High: investing.priceData?.week1High || yahoo.priceData?.week1High || db?.priceData?.week1High || null,
        week1Low: investing.priceData?.week1Low || yahoo.priceData?.week1Low || db?.priceData?.week1Low || null,
        day30High: investing.priceData?.day30High || yahoo.priceData?.day30High || db?.priceData?.day30High || null,
        day30Low: investing.priceData?.day30Low || yahoo.priceData?.day30Low || db?.priceData?.day30Low || null,
        week52High: investing.priceData?.week52High || yahoo.priceData?.week52High || db?.priceData?.week52High || null,
        week52Low: investing.priceData?.week52Low || yahoo.priceData?.week52Low || db?.priceData?.week52Low || null,
        week52Change: investing.priceData?.week52Change || yahoo.priceData?.week52Change || db?.priceData?.week52Change || null,
        week52ChangeTL: investing.priceData?.week52ChangeTL || yahoo.priceData?.week52ChangeTL || db?.priceData?.week52ChangeTL || null,
      },

      tradingData: {
        bid: investing.tradingData?.bid || yahoo.tradingData?.bid || db?.tradingData?.bid || null,
        ask: investing.tradingData?.ask || yahoo.tradingData?.ask || db?.tradingData?.ask || null,
        volume: investing.tradingData?.volume || yahoo.tradingData?.volume || db?.tradingData?.volume || null,
        volumeTL: investing.tradingData?.volumeTL || yahoo.tradingData?.volumeTL || db?.tradingData?.volumeTL || null,
        lotSize: investing.tradingData?.lotSize || yahoo.tradingData?.lotSize || db?.tradingData?.lotSize || null,
        dailyChange: investing.tradingData?.dailyChange || yahoo.tradingData?.dailyChange || db?.tradingData?.dailyChange || null,
        dailyChangePercent: investing.tradingData?.dailyChangePercent || yahoo.tradingData?.dailyChangePercent || db?.tradingData?.dailyChangePercent || null,
        dailyOpen: investing.tradingData?.dailyOpen || yahoo.tradingData?.dailyOpen || db?.tradingData?.dailyOpen || null,
      },

      fundamentals: {
        marketCap: twelve.fundamentals?.marketCap || finnhub.fundamentals?.marketCap || fmp.fundamentals?.marketCap || isYatirim.fundamentals?.marketCap || yahoo.fundamentals?.marketCap || investing.fundamentals?.marketCap || db?.fundamentals?.marketCap || null,
        pdDD: isYatirim.fundamentals?.pdDD || twelve.fundamentals?.pdDD || finnhub.fundamentals?.pdDD || fmp.fundamentals?.pdDD || yahoo.fundamentals?.pdDD || investing.fundamentals?.pdDD || db?.fundamentals?.pdDD || null,
        fk: isYatirim.fundamentals?.fk || twelve.fundamentals?.fk || finnhub.fundamentals?.fk || fmp.fundamentals?.fk || yahoo.fundamentals?.fk || investing.fundamentals?.fk || db?.fundamentals?.fk || null,
        fdFAVO: isYatirim.fundamentals?.fdFAVO || yahoo.fundamentals?.fdFAVO || db?.fundamentals?.fdFAVO || null,
        pdEBITDA: isYatirim.fundamentals?.pdEBITDA || yahoo.fundamentals?.pdEBITDA || db?.fundamentals?.pdEBITDA || null,
        shares: twelve.fundamentals?.shares || finnhub.fundamentals?.shares || fmp.fundamentals?.shares || yahoo.fundamentals?.shares || kap.fundamentals?.shares || db?.fundamentals?.shares || null,
        paidCapital: isYatirim.fundamentals?.paidCapital || fmp.fundamentals?.paidCapital || kap.fundamentals?.paidCapital || db?.fundamentals?.paidCapital || null,
        eps: twelve.fundamentals?.eps || finnhub.fundamentals?.eps || fmp.fundamentals?.eps || isYatirim.fundamentals?.eps || db?.fundamentals?.eps || null,
        roe: isYatirim.fundamentals?.roe || finnhub.fundamentals?.roe || fmp.fundamentals?.roe || db?.fundamentals?.roe || null,
        roa: isYatirim.fundamentals?.roa || finnhub.fundamentals?.roa || fmp.fundamentals?.roa || db?.fundamentals?.roa || null,
      },

      financials: {
        period: fmp.financials?.period || isYatirim.financials?.period || kap.financials?.period || yahoo.financials?.period || db?.financials?.period || null,
        revenue: isYatirim.financials?.revenue || fmp.financials?.revenue || kap.financials?.revenue || yahoo.financials?.revenue || db?.financials?.revenue || null,
        grossProfit: isYatirim.financials?.grossProfit || fmp.financials?.grossProfit || kap.financials?.grossProfit || yahoo.financials?.grossProfit || db?.financials?.grossProfit || null,
        netIncome: isYatirim.financials?.netIncome || fmp.financials?.netIncome || kap.financials?.netIncome || yahoo.financials?.netIncome || db?.financials?.netIncome || null,
        profitability: isYatirim.financials?.profitability || kap.financials?.profitability || yahoo.financials?.profitability || db?.financials?.profitability || null,
        grossProfitMargin: db?.financials?.grossProfitMargin || null, // Hesaplanacak
        equity: isYatirim.financials?.equity || kap.financials?.equity || yahoo.financials?.equity || db?.financials?.equity || null,
        currentAssets: isYatirim.financials?.currentAssets || kap.financials?.currentAssets || yahoo.financials?.currentAssets || db?.financials?.currentAssets || null,
        fixedAssets: isYatirim.financials?.fixedAssets || kap.financials?.fixedAssets || db?.financials?.fixedAssets || null,
        totalAssets: isYatirim.financials?.totalAssets || kap.financials?.totalAssets || yahoo.financials?.totalAssets || db?.financials?.totalAssets || null,
        shortTermLiabilities: isYatirim.financials?.shortTermLiabilities || kap.financials?.shortTermLiabilities || yahoo.financials?.shortTermLiabilities || db?.financials?.shortTermLiabilities || null,
        longTermLiabilities: isYatirim.financials?.longTermLiabilities || kap.financials?.longTermLiabilities || yahoo.financials?.longTermLiabilities || db?.financials?.longTermLiabilities || null,
        shortTermBankLoans: isYatirim.financials?.shortTermBankLoans || kap.financials?.shortTermBankLoans || db?.financials?.shortTermBankLoans || null,
        longTermBankLoans: isYatirim.financials?.longTermBankLoans || kap.financials?.longTermBankLoans || db?.financials?.longTermBankLoans || null,
        tradeReceivables: isYatirim.financials?.tradeReceivables || kap.financials?.tradeReceivables || db?.financials?.tradeReceivables || null,
        financialInvestments: isYatirim.financials?.financialInvestments || kap.financials?.financialInvestments || db?.financials?.financialInvestments || null,
        investmentProperty: kap.financials?.investmentProperty || db?.financials?.investmentProperty || null,
        prepaidExpenses: kap.financials?.prepaidExpenses || db?.financials?.prepaidExpenses || null,
        deferredTax: kap.financials?.deferredTax || db?.financials?.deferredTax || null,
        totalDebt: db?.financials?.totalDebt || null, // Hesaplanacak
        netDebt: db?.financials?.netDebt || null, // Hesaplanacak
        workingCapital: db?.financials?.workingCapital || null, // Hesaplanacak
      },

      analysis: {
        domesticSalesRatio: yahoo.analysis?.domesticSalesRatio || db?.analysis?.domesticSalesRatio || null,
        foreignSalesRatio: yahoo.analysis?.foreignSalesRatio || db?.analysis?.foreignSalesRatio || null,
        exportRatio: yahoo.analysis?.exportRatio || db?.analysis?.exportRatio || null,
        averageDividend: yahoo.analysis?.averageDividend || db?.analysis?.averageDividend || null,
      },

      liquidity: {
        currentRatio: db?.liquidity?.currentRatio || null, // Hesaplanacak
        acidTestRatio: db?.liquidity?.acidTestRatio || null, // Hesaplanacak
        cashRatio: db?.liquidity?.cashRatio || null, // Hesaplanacak
      },

      leverage: {
        debtToEquity: db?.leverage?.debtToEquity || null, // Hesaplanacak
        debtToAssets: db?.leverage?.debtToAssets || null, // Hesaplanacak
        shortTermDebtRatio: db?.leverage?.shortTermDebtRatio || null, // Hesaplanacak
        longTermDebtRatio: db?.leverage?.longTermDebtRatio || null, // Hesaplanacak
      },

      smartAnalysis: db?.smartAnalysis || {
        overallScore: 50,
        rating: 'Hold',
        valuationScore: 50,
        profitabilityScore: 50,
        liquidityScore: 50,
        leverageScore: 50,
        strengths: [],
        weaknesses: [],
        warnings: [],
        recommendations: [],
      },

      lastUpdated: new Date(),
    };
  }

  /**
   * Verilere ek hesaplamalar ve analizler ekler
   */
  private enrichData(data: StockData): void {
    // ========== FİYAT VERİLERİ ==========
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

    // ========== İŞLEM VERİLERİ ==========
    // Hacim TL hesapla
    if (data.tradingData.volume && data.priceData.currentPrice) {
      data.tradingData.volumeTL = data.tradingData.volume * data.priceData.currentPrice;
    }

    // ========== FİNANSAL VERİLER ==========
    // Net Karlılık (Net Kar Marjı) hesapla
    if (data.financials.netIncome && data.financials.revenue && data.financials.revenue !== 0) {
      data.financials.profitability = (data.financials.netIncome / data.financials.revenue) * 100;
    }

    // Brüt Kar Marjı hesapla
    if (data.financials.grossProfit && data.financials.revenue && data.financials.revenue !== 0) {
      data.financials.grossProfitMargin = (data.financials.grossProfit / data.financials.revenue) * 100;
    }

    // Duran varlıklar hesapla (toplam - dönen)
    if (data.financials.totalAssets && data.financials.currentAssets) {
      data.financials.fixedAssets = data.financials.totalAssets - data.financials.currentAssets;
    }

    // Toplam Borç hesapla
    const shortTermLiabilities = data.financials.shortTermLiabilities || 0;
    const longTermLiabilities = data.financials.longTermLiabilities || 0;
    if (shortTermLiabilities > 0 || longTermLiabilities > 0) {
      data.financials.totalDebt = shortTermLiabilities + longTermLiabilities;
    }

    // Net Borç hesapla (Borç - Nakit/Finansal Yatırımlar)
    if (data.financials.totalDebt && data.financials.financialInvestments) {
      data.financials.netDebt = data.financials.totalDebt - data.financials.financialInvestments;
    } else if (data.financials.totalDebt) {
      data.financials.netDebt = data.financials.totalDebt;
    }

    // İşletme Sermayesi hesapla (Dönen Varlıklar - Kısa Vadeli Borçlar)
    if (data.financials.currentAssets && data.financials.shortTermLiabilities) {
      data.financials.workingCapital = data.financials.currentAssets - data.financials.shortTermLiabilities;
    }

    // ========== TEMEL GÖSTERGELER ==========
    // EPS (Hisse Başına Kazanç) hesapla
    if (data.financials.netIncome && data.fundamentals.shares && data.fundamentals.shares > 0) {
      data.fundamentals.eps = data.financials.netIncome / data.fundamentals.shares;
    }

    // ROE (Öz Sermaye Karlılığı) hesapla
    if (data.financials.netIncome && data.financials.equity && data.financials.equity !== 0) {
      data.fundamentals.roe = (data.financials.netIncome / data.financials.equity) * 100;
    }

    // ROA (Varlık Karlılığı) hesapla
    if (data.financials.netIncome && data.financials.totalAssets && data.financials.totalAssets !== 0) {
      data.fundamentals.roa = (data.financials.netIncome / data.financials.totalAssets) * 100;
    }

    // ========== LİKİDİTE ORANLARI ==========
    // Cari Oran hesapla
    if (data.financials.currentAssets && data.financials.shortTermLiabilities && data.financials.shortTermLiabilities !== 0) {
      data.liquidity.currentRatio = data.financials.currentAssets / data.financials.shortTermLiabilities;
    }

    // Asit-Test Oranı hesapla (Dönen Varlıklar - Stoklar) / Kısa Vadeli Borçlar
    // Not: Stok verisi yok, basitleştirilmiş hesaplama
    if (data.financials.currentAssets && data.financials.shortTermLiabilities && data.financials.shortTermLiabilities !== 0) {
      const liquidAssets = (data.financials.tradeReceivables || 0) + (data.financials.financialInvestments || 0);
      if (liquidAssets > 0) {
        data.liquidity.acidTestRatio = liquidAssets / data.financials.shortTermLiabilities;
      }
    }

    // Nakit Oranı hesapla
    if (data.financials.financialInvestments && data.financials.shortTermLiabilities && data.financials.shortTermLiabilities !== 0) {
      data.liquidity.cashRatio = data.financials.financialInvestments / data.financials.shortTermLiabilities;
    }

    // ========== BORÇLULUK ORANLARI ==========
    // Borç/Öz Sermaye hesapla
    if (data.financials.totalDebt && data.financials.equity && data.financials.equity !== 0) {
      data.leverage.debtToEquity = data.financials.totalDebt / data.financials.equity;
    }

    // Borç/Varlıklar hesapla
    if (data.financials.totalDebt && data.financials.totalAssets && data.financials.totalAssets !== 0) {
      data.leverage.debtToAssets = data.financials.totalDebt / data.financials.totalAssets;
    }

    // Kısa Vadeli Borç Oranı hesapla
    if (data.financials.totalDebt && data.financials.totalDebt !== 0 && data.financials.shortTermLiabilities) {
      data.leverage.shortTermDebtRatio = (data.financials.shortTermLiabilities / data.financials.totalDebt) * 100;
    }

    // Uzun Vadeli Borç Oranı hesapla
    if (data.financials.totalDebt && data.financials.totalDebt !== 0 && data.financials.longTermLiabilities) {
      data.leverage.longTermDebtRatio = (data.financials.longTermLiabilities / data.financials.totalDebt) * 100;
    }
  }

  /**
   * Hisseye sektör atar (Yahoo'dan gelmezse mapping kullanır)
   */
  private assignSector(data: StockData): void {
    if (!data.sector) {
      data.sector = STOCK_SECTOR_MAP[data.symbol] || null;
    }
  }

  /**
   * Sektör eşiklerini alır
   */
  private getSectorThresholds(sector: string | null | undefined): SectorThresholds {
    if (!sector) return DEFAULT_SECTOR_THRESHOLDS['default'];
    return DEFAULT_SECTOR_THRESHOLDS[sector] || DEFAULT_SECTOR_THRESHOLDS['default'];
  }

  /**
   * Akıllı analiz ve öneriler oluşturur (SEKTÖR BAZLI EŞİKLERLE)
   */
  private performSmartAnalysis(data: StockData): void {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Sektör bazlı eşikleri al
    const thresholds = this.getSectorThresholds(data.sector);
    const sectorName = thresholds.sectorName;

    let valuationScore = 50;
    let profitabilityScore = 50;
    let liquidityScore = 50;
    let leverageScore = 50;

    // Veri eksikliği cezası (yeni: veri yoksa 50 değil, biraz düşük başla)
    let dataQualityPenalty = 0;

    // ========== DEĞERLEME ANALİZİ (SEKTÖR BAZLI) ==========
    if (data.fundamentals.fk !== null && data.fundamentals.fk !== undefined) {
      // Negatif F/K = şirket zarar ediyor
      if (data.fundamentals.fk < 0) {
        valuationScore -= 30;
        weaknesses.push(`F/K negatif (${data.fundamentals.fk.toFixed(2)}), şirket zarar ediyor`);
        warnings.push('⚠️ NEGATİF F/K - Şirket zarar ediyor!');
      } else if (data.fundamentals.fk < thresholds.peRatioLow) {
        valuationScore += 25;
        strengths.push(`F/K oranı sektör ortalamasının altında (${data.fundamentals.fk.toFixed(2)} < ${thresholds.peRatioLow}), ${sectorName} sektöründe ucuz`);
      } else if (data.fundamentals.fk <= thresholds.peRatioHigh) {
        valuationScore += 10;
        strengths.push(`F/K oranı ${sectorName} sektörü için makul (${data.fundamentals.fk.toFixed(2)})`);
      } else {
        valuationScore -= 20;
        weaknesses.push(`F/K oranı sektör ortalamasının üstünde (${data.fundamentals.fk.toFixed(2)} > ${thresholds.peRatioHigh}), ${sectorName} sektöründe pahalı`);
      }
    } else {
      dataQualityPenalty += 5;
    }

    // PD/DD analizi (sektör bazlı)
    if (data.fundamentals.pdDD !== null && data.fundamentals.pdDD !== undefined) {
      if (data.fundamentals.pdDD < 0) {
        valuationScore -= 25;
        warnings.push('⚠️ Negatif PD/DD - Öz sermaye negatif olabilir!');
      } else if (data.fundamentals.pdDD < thresholds.pbRatioLow) {
        valuationScore += 25;
        strengths.push(`PD/DD çok düşük (${data.fundamentals.pdDD.toFixed(2)} < ${thresholds.pbRatioLow}), defter değerinin altında işlem görüyor`);
      } else if (data.fundamentals.pdDD <= thresholds.pbRatioHigh) {
        valuationScore += 10;
        strengths.push(`PD/DD ${sectorName} sektörü için makul (${data.fundamentals.pdDD.toFixed(2)})`);
      } else {
        valuationScore -= 15;
        weaknesses.push(`PD/DD yüksek (${data.fundamentals.pdDD.toFixed(2)} > ${thresholds.pbRatioHigh})`);
      }
    } else {
      dataQualityPenalty += 5;
    }

    // ========== KARLILIK ANALİZİ (DÜZELTME: ROE < 0 önce kontrol) ==========
    if (data.fundamentals.roe !== null && data.fundamentals.roe !== undefined) {
      // ÖNEMLİ: Negatif ROE kontrolü EN ÖNCE!
      if (data.fundamentals.roe < 0) {
        profitabilityScore -= 35;
        weaknesses.push(`ROE negatif (${data.fundamentals.roe.toFixed(1)}%), şirket zarar ediyor`);
        warnings.push('🔴 NEGATİF KARLILIK - Şirket zarar ediyor!');
      } else if (data.fundamentals.roe >= thresholds.roeGood) {
        profitabilityScore += 30;
        strengths.push(`ROE çok iyi (${data.fundamentals.roe.toFixed(1)}% >= ${thresholds.roeGood}%), ${sectorName} sektöründe üst düzey`);
      } else if (data.fundamentals.roe >= thresholds.roeBad) {
        profitabilityScore += 10;
        strengths.push(`ROE makul (${data.fundamentals.roe.toFixed(1)}%)`);
      } else {
        profitabilityScore -= 20;
        weaknesses.push(`ROE düşük (${data.fundamentals.roe.toFixed(1)}% < ${thresholds.roeBad}%), ${sectorName} sektörü ortalamasının altında`);
        warnings.push('⚠️ Düşük öz sermaye karlılığı');
      }
    } else {
      dataQualityPenalty += 5;
    }

    // Net Kar Marjı analizi (sektör bazlı)
    if (data.financials.profitability !== null && data.financials.profitability !== undefined) {
      if (data.financials.profitability < 0) {
        profitabilityScore -= 25;
        weaknesses.push(`Net kar marjı negatif (${data.financials.profitability.toFixed(1)}%)`);
      } else if (data.financials.profitability >= thresholds.profitMarginGood) {
        profitabilityScore += 25;
        strengths.push(`Net kar marjı yüksek (${data.financials.profitability.toFixed(1)}% >= ${thresholds.profitMarginGood}%)`);
      } else if (data.financials.profitability >= thresholds.profitMarginBad) {
        profitabilityScore += 5;
      } else {
        profitabilityScore -= 15;
        weaknesses.push(`Net kar marjı düşük (${data.financials.profitability.toFixed(1)}% < ${thresholds.profitMarginBad}%)`);
      }
    } else {
      dataQualityPenalty += 5;
    }

    // ========== LİKİDİTE ANALİZİ ==========
    if (data.liquidity.currentRatio !== null && data.liquidity.currentRatio !== undefined) {
      if (data.liquidity.currentRatio >= 2) {
        liquidityScore += 25;
        strengths.push(`Cari oran güçlü (${data.liquidity.currentRatio.toFixed(2)}), kısa vadeli borçları rahatça karşılayabilir`);
      } else if (data.liquidity.currentRatio >= 1.5) {
        liquidityScore += 15;
        strengths.push(`Cari oran sağlıklı (${data.liquidity.currentRatio.toFixed(2)})`);
      } else if (data.liquidity.currentRatio >= 1) {
        liquidityScore += 5;
      } else {
        liquidityScore -= 30;
        weaknesses.push(`Cari oran zayıf (${data.liquidity.currentRatio.toFixed(2)}), likidite problemi olabilir`);
        warnings.push('⚠️ LİKİDİTE RİSKİ - Cari oran 1\'in altında!');
      }
    } else {
      dataQualityPenalty += 3;
    }

    // İşletme Sermayesi analizi
    if (data.financials.workingCapital !== null && data.financials.workingCapital !== undefined) {
      if (data.financials.workingCapital < 0) {
        liquidityScore -= 25;
        weaknesses.push('İşletme sermayesi negatif');
        warnings.push('⚠️ Negatif işletme sermayesi tespit edildi');
      } else if (data.financials.workingCapital > 0 && data.financials.currentAssets) {
        const wcRatio = data.financials.workingCapital / data.financials.currentAssets;
        if (wcRatio > 0.3) {
          liquidityScore += 10;
        }
      }
    }

    // ========== BORÇLULUK ANALİZİ ==========
    if (data.leverage.debtToEquity !== null && data.leverage.debtToEquity !== undefined) {
      if (data.leverage.debtToEquity < 0) {
        // Negatif öz sermaye
        leverageScore -= 30;
        warnings.push('⚠️ Negatif öz sermaye - Borçlar varlıkları aşmış olabilir!');
      } else if (data.leverage.debtToEquity < 0.5) {
        leverageScore += 30;
        strengths.push(`Borç/Öz Sermaye çok düşük (${data.leverage.debtToEquity.toFixed(2)}), borç yükü hafif`);
      } else if (data.leverage.debtToEquity < 1) {
        leverageScore += 15;
        strengths.push(`Borç/Öz Sermaye sağlıklı (${data.leverage.debtToEquity.toFixed(2)})`);
      } else if (data.leverage.debtToEquity < 1.5) {
        leverageScore += 0;
      } else if (data.leverage.debtToEquity < 2) {
        leverageScore -= 15;
        weaknesses.push(`Borç/Öz Sermaye yüksek (${data.leverage.debtToEquity.toFixed(2)})`);
      } else {
        leverageScore -= 30;
        weaknesses.push(`Borç/Öz Sermaye çok yüksek (${data.leverage.debtToEquity.toFixed(2)}), ciddi borç yükü`);
        warnings.push('🔴 YÜKSEK BORÇ YÜKÜ tespit edildi!');
      }
    } else {
      dataQualityPenalty += 3;
    }

    // Kısa Vadeli Borç Oranı yüksekse uyarı
    if (data.leverage.shortTermDebtRatio && data.leverage.shortTermDebtRatio > 70) {
      leverageScore -= 15;
      warnings.push(`⚠️ Toplam borcun %${data.leverage.shortTermDebtRatio.toFixed(0)}'ü kısa vadeli - Yeniden finansman riski!`);
    }

    // ========== VERİ KALİTESİ CEZASI ==========
    valuationScore -= dataQualityPenalty;
    profitabilityScore -= dataQualityPenalty;

    // ========== GENEL DEĞERLENDİRME ==========
    // Skorları normalize et (0-100 arası)
    valuationScore = Math.max(0, Math.min(100, valuationScore));
    profitabilityScore = Math.max(0, Math.min(100, profitabilityScore));
    liquidityScore = Math.max(0, Math.min(100, liquidityScore));
    leverageScore = Math.max(0, Math.min(100, leverageScore));

    // Genel skor hesapla (ağırlıklı ortalama)
    const overallScore = Math.round(
      valuationScore * 0.30 +
      profitabilityScore * 0.35 +
      liquidityScore * 0.15 +
      leverageScore * 0.20
    );

    // Rating belirle
    let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
    if (overallScore >= 75) {
      rating = 'Strong Buy';
      recommendations.push('📈 GÜÇLÜ AL - Hisse temel analizlere göre çok çekici görünüyor');
    } else if (overallScore >= 60) {
      rating = 'Buy';
      recommendations.push('✅ AL - Hisse alım için uygun görünüyor');
    } else if (overallScore >= 45) {
      rating = 'Hold';
      recommendations.push('⏸️ TUT - Pozisyon almak için beklemek daha iyi olabilir');
    } else if (overallScore >= 30) {
      rating = 'Sell';
      recommendations.push('⚠️ SAT - Hisse zayıf görünüyor, pozisyon azaltmayı düşünebilirsiniz');
    } else {
      rating = 'Strong Sell';
      recommendations.push('🔴 GÜÇLÜ SAT - Hisse ciddi riskler taşıyor');
    }

    // Sektör bilgisi ekle
    if (data.sector) {
      recommendations.push(`📊 Sektör: ${data.sector} - Değerlendirme sektörel eşiklere göre yapıldı`);
    }

    // Detaylı öneriler
    if (valuationScore >= 70) {
      recommendations.push('💎 Değerleme açısından çekici, fiyat makul seviyelerde');
    }
    if (profitabilityScore >= 70) {
      recommendations.push('💰 Karlılık metrikleri güçlü, şirket para kazanıyor');
    }
    if (liquidityScore < 40) {
      recommendations.push('⚠️ Likidite zayıf, kısa vadeli ödeme gücünü takip edin');
    }
    if (leverageScore < 40) {
      recommendations.push('📊 Borç yükü yüksek, faiz oranı artışları riski yaratabilir');
    }

    // Veri eksikliği uyarısı
    if (dataQualityPenalty > 10) {
      warnings.push('⚠️ Bazı kritik veriler eksik, analiz sınırlı doğrulukta');
    }

    // Veriyi güncelle
    data.smartAnalysis = {
      overallScore,
      rating,
      valuationScore,
      profitabilityScore,
      liquidityScore,
      leverageScore,
      strengths,
      weaknesses,
      warnings,
      recommendations,
    };
  }

  /**
   * Birden fazla hissenin verilerini SEQUENTIAL çeker (paralel = server crash)
   * Her hisse için API çağrıları tamamlandıktan sonra bir sonrakine geçer
   */
  async getMultipleStocks(symbols: string[]): Promise<StockData[]> {
    logger.info(`Fetching data for ${symbols.length} stocks (SEQUENTIAL mode)`);

    const results: StockData[] = [];

    // Her hisseyi SIRAYLA işle (paralel değil!)
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];

      try {
        const data = await this.getCompleteStockData(symbol);
        results.push(data);

        // Her 3 hissede bir progress log
        if ((i + 1) % 3 === 0) {
          logger.info(`Progress: ${i + 1}/${symbols.length} stocks loaded`);
        }
      } catch (error) {
        logger.warn(`Failed to load ${symbol}, skipping`);
      }

      // Her hisse arasında 500ms bekle (rate limit ve memory için)
      if (i < symbols.length - 1) {
        await this.waitBetweenRequests(500);
      }
    }

    logger.info(`Completed: ${results.length}/${symbols.length} stocks loaded`);
    return results;
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
