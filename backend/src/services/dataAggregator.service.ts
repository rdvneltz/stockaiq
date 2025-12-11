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

      // Akıllı analiz yap
      this.performSmartAnalysis(aggregatedData);

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
        eps: null, // Hesaplanacak
        roe: null, // Hesaplanacak
        roa: null, // Hesaplanacak
      },

      financials: {
        period: kap.financials?.period || yahoo.financials?.period || null,
        revenue: kap.financials?.revenue || yahoo.financials?.revenue || null,
        grossProfit: kap.financials?.grossProfit || yahoo.financials?.grossProfit || null,
        netIncome: kap.financials?.netIncome || yahoo.financials?.netIncome || null,
        profitability: kap.financials?.profitability || yahoo.financials?.profitability || null,
        grossProfitMargin: null, // Hesaplanacak
        equity: kap.financials?.equity || yahoo.financials?.equity || null,
        currentAssets: kap.financials?.currentAssets || yahoo.financials?.currentAssets || null,
        fixedAssets: kap.financials?.fixedAssets || null, // enrichData'da hesaplanacak
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
        totalDebt: null, // Hesaplanacak
        netDebt: null, // Hesaplanacak
        workingCapital: null, // Hesaplanacak
      },

      analysis: {
        domesticSalesRatio: yahoo.analysis?.domesticSalesRatio || null,
        foreignSalesRatio: yahoo.analysis?.foreignSalesRatio || null,
        exportRatio: yahoo.analysis?.exportRatio || null,
        averageDividend: yahoo.analysis?.averageDividend || null,
      },

      liquidity: {
        currentRatio: null, // Hesaplanacak
        acidTestRatio: null, // Hesaplanacak
        cashRatio: null, // Hesaplanacak
      },

      leverage: {
        debtToEquity: null, // Hesaplanacak
        debtToAssets: null, // Hesaplanacak
        shortTermDebtRatio: null, // Hesaplanacak
        longTermDebtRatio: null, // Hesaplanacak
      },

      smartAnalysis: {
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
   * Akıllı analiz ve öneriler oluşturur
   */
  private performSmartAnalysis(data: StockData): void {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    let valuationScore = 50;
    let profitabilityScore = 50;
    let liquidityScore = 50;
    let leverageScore = 50;

    // ========== DEĞERLEME ANALİZİ ==========
    // F/K Oranı analizi
    if (data.fundamentals.fk) {
      if (data.fundamentals.fk < 10) {
        valuationScore += 20;
        strengths.push(`F/K oranı çok düşük (${data.fundamentals.fk.toFixed(2)}), hisse ucuz görünüyor`);
      } else if (data.fundamentals.fk < 15) {
        valuationScore += 10;
        strengths.push(`F/K oranı makul seviyede (${data.fundamentals.fk.toFixed(2)})`);
      } else if (data.fundamentals.fk > 25) {
        valuationScore -= 15;
        weaknesses.push(`F/K oranı yüksek (${data.fundamentals.fk.toFixed(2)}), hisse pahalı olabilir`);
      }
    }

    // PD/DD analizi
    if (data.fundamentals.pdDD) {
      if (data.fundamentals.pdDD < 1) {
        valuationScore += 20;
        strengths.push(`PD/DD oranı 1'in altında (${data.fundamentals.pdDD.toFixed(2)}), defter değerinin altında işlem görüyor`);
      } else if (data.fundamentals.pdDD < 2) {
        valuationScore += 10;
        strengths.push(`PD/DD oranı makul seviyede (${data.fundamentals.pdDD.toFixed(2)})`);
      } else if (data.fundamentals.pdDD > 3) {
        valuationScore -= 15;
        weaknesses.push(`PD/DD oranı yüksek (${data.fundamentals.pdDD.toFixed(2)})`);
      }
    }

    // ========== KARLILIK ANALİZİ ==========
    // ROE analizi
    if (data.fundamentals.roe) {
      if (data.fundamentals.roe > 20) {
        profitabilityScore += 25;
        strengths.push(`ROE çok yüksek (${data.fundamentals.roe.toFixed(1)}%), şirket öz sermayesini çok verimli kullanıyor`);
      } else if (data.fundamentals.roe > 15) {
        profitabilityScore += 15;
        strengths.push(`ROE güçlü seviyede (${data.fundamentals.roe.toFixed(1)}%)`);
      } else if (data.fundamentals.roe < 5) {
        profitabilityScore -= 20;
        weaknesses.push(`ROE düşük (${data.fundamentals.roe.toFixed(1)}%), karlılık zayıf`);
        warnings.push('⚠️ Düşük öz sermaye karlılığı');
      } else if (data.fundamentals.roe < 0) {
        profitabilityScore -= 30;
        weaknesses.push('Şirket zarar ediyor');
        warnings.push('⚠️ NEGATİF KARLILIK - Şirket zarar ediyor!');
      }
    }

    // Net Kar Marjı analizi
    if (data.financials.profitability) {
      if (data.financials.profitability > 20) {
        profitabilityScore += 20;
        strengths.push(`Net kar marjı yüksek (${data.financials.profitability.toFixed(1)}%)`);
      } else if (data.financials.profitability < 5) {
        profitabilityScore -= 15;
        weaknesses.push(`Net kar marjı düşük (${data.financials.profitability.toFixed(1)}%)`);
      }
    }

    // ========== LİKİDİTE ANALİZİ ==========
    // Cari Oran analizi
    if (data.liquidity.currentRatio) {
      if (data.liquidity.currentRatio > 2) {
        liquidityScore += 20;
        strengths.push(`Cari oran güçlü (${data.liquidity.currentRatio.toFixed(2)}), kısa vadeli borçları rahatça karşılayabilir`);
      } else if (data.liquidity.currentRatio > 1.5) {
        liquidityScore += 10;
        strengths.push(`Cari oran sağlıklı (${data.liquidity.currentRatio.toFixed(2)})`);
      } else if (data.liquidity.currentRatio < 1) {
        liquidityScore -= 25;
        weaknesses.push(`Cari oran zayıf (${data.liquidity.currentRatio.toFixed(2)}), likidite problemi olabilir`);
        warnings.push('⚠️ LİKİDİTE RİSKİ - Cari oran 1\'in altında!');
      }
    }

    // İşletme Sermayesi analizi
    if (data.financials.workingCapital && data.financials.workingCapital < 0) {
      liquidityScore -= 20;
      weaknesses.push('İşletme sermayesi negatif');
      warnings.push('⚠️ Negatif işletme sermayesi tespit edildi');
    }

    // ========== BORÇLULUK ANALİZİ ==========
    // Borç/Öz Sermaye analizi
    if (data.leverage.debtToEquity) {
      if (data.leverage.debtToEquity < 0.5) {
        leverageScore += 25;
        strengths.push(`Borç/Öz Sermaye oranı düşük (${data.leverage.debtToEquity.toFixed(2)}), borç yükü hafif`);
      } else if (data.leverage.debtToEquity < 1) {
        leverageScore += 10;
        strengths.push(`Borç/Öz Sermaye oranı sağlıklı (${data.leverage.debtToEquity.toFixed(2)})`);
      } else if (data.leverage.debtToEquity > 2) {
        leverageScore -= 25;
        weaknesses.push(`Borç/Öz Sermaye oranı yüksek (${data.leverage.debtToEquity.toFixed(2)}), yüksek borç yükü`);
        warnings.push('⚠️ YÜKSEK BORÇ YÜKÜ tespit edildi!');
      } else if (data.leverage.debtToEquity > 1.5) {
        leverageScore -= 15;
        weaknesses.push(`Borç/Öz Sermaye oranı yüksek (${data.leverage.debtToEquity.toFixed(2)})`);
      }
    }

    // Kısa Vadeli Borç Oranı yüksekse uyarı
    if (data.leverage.shortTermDebtRatio && data.leverage.shortTermDebtRatio > 70) {
      leverageScore -= 10;
      warnings.push(`⚠️ Toplam borcun %${data.leverage.shortTermDebtRatio.toFixed(0)}'ü kısa vadeli!`);
    }

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
    if (overallScore >= 80) {
      rating = 'Strong Buy';
      recommendations.push('📈 GÜÇLÜ AL - Hisse temel analizlere göre çok çekici görünüyor');
    } else if (overallScore >= 65) {
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

    // Öneriler ekle
    if (valuationScore > 70) {
      recommendations.push('💎 Değerleme açısından çekici, fiyat makul seviyelerde');
    }
    if (profitabilityScore > 70) {
      recommendations.push('💰 Karlılık metrikleri güçlü, şirket para kazanıyor');
    }
    if (liquidityScore < 40) {
      recommendations.push('⚠️ Likidite zayıf, kısa vadeli ödeme gücünü takip edin');
    }
    if (leverageScore < 40) {
      recommendations.push('📊 Borç yükü yüksek, faiz oranı artışları riski yaratabilir');
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
