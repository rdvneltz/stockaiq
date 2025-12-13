import { StockData } from '../types';
import logger from '../utils/logger';

/**
 * AI Tabanlı Fiyat Hedefleri Hesaplama Servisi
 *
 * 3 Model Kullanarak Hibrit Fiyat Tahmini:
 * 1. Teknik Analiz (Destek/Direnç, Fibonacci, Trend)
 * 2. Fundamental Analiz (F/K, PD/DD, Kar Büyümesi)
 * 3. Momentum & Sentiment (Hacim, Smart Rating, Trend Gücü)
 *
 * + Al/Sat Seviyeleri (Destek/Direnç + Fair Value bazlı)
 *
 * Developed by A. Rıdvan Elitez
 */

class PriceTargetCalculatorService {
  /**
   * Ana hesaplama fonksiyonu
   */
  calculatePriceTargets(stock: StockData) {
    try {
      const currentPrice = stock.currentPrice || stock.priceData.currentPrice;

      if (!currentPrice || currentPrice <= 0) {
        logger.debug(`No valid price for ${stock.symbol}, skipping price targets`);
        return undefined;
      }

      // 3 Model ile hesapla
      const technicalTargets = this.calculateTechnicalTargets(stock);
      const fundamentalTargets = this.calculateFundamentalTargets(stock);
      const momentumTargets = this.calculateMomentumTargets(stock);

      // Hibrit hedefleri hesapla (ağırlıklı ortalama)
      const shortTerm = this.calculateHybridTarget(
        technicalTargets.shortTerm,
        fundamentalTargets.shortTerm,
        momentumTargets.shortTerm,
        [0.50, 0.30, 0.20] // Teknik ağırlıklı kısa vade
      );

      const midTerm = this.calculateHybridTarget(
        technicalTargets.midTerm,
        fundamentalTargets.midTerm,
        momentumTargets.midTerm,
        [0.40, 0.40, 0.20] // Dengeli orta vade
      );

      const longTerm = this.calculateHybridTarget(
        technicalTargets.longTerm,
        fundamentalTargets.longTerm,
        momentumTargets.longTerm,
        [0.30, 0.50, 0.20] // Fundamental ağırlıklı uzun vade
      );

      // Momentum çarpanını uygula
      const momentumMultiplier = this.getMomentumMultiplier(stock);

      const finalShortTerm = shortTerm * momentumMultiplier;
      const finalMidTerm = midTerm * momentumMultiplier;
      const finalLongTerm = longTerm * momentumMultiplier;

      // Confidence skorlarını hesapla
      const shortConfidence = this.calculateConfidence(stock, 'short');
      const midConfidence = this.calculateConfidence(stock, 'mid');
      const longConfidence = this.calculateConfidence(stock, 'long');

      // Al/Sat seviyelerini hesapla
      const { buyLevels, sellLevels } = this.calculateBuySellLevels(stock, {
        technical: technicalTargets,
        fundamental: fundamentalTargets,
        shortTermTarget: finalShortTerm,
        midTermTarget: finalMidTerm,
        longTermTarget: finalLongTerm,
      });

      return {
        shortTerm: {
          target: Number(finalShortTerm.toFixed(2)),
          confidence: shortConfidence,
          potential: Number((((finalShortTerm - currentPrice) / currentPrice) * 100).toFixed(2)),
          timeframe: '1-3 ay',
        },
        midTerm: {
          target: Number(finalMidTerm.toFixed(2)),
          confidence: midConfidence,
          potential: Number((((finalMidTerm - currentPrice) / currentPrice) * 100).toFixed(2)),
          timeframe: '3-6 ay',
        },
        longTerm: {
          target: Number(finalLongTerm.toFixed(2)),
          confidence: longConfidence,
          potential: Number((((finalLongTerm - currentPrice) / currentPrice) * 100).toFixed(2)),
          timeframe: '6-12 ay',
        },
        buyLevels,
        sellLevels,
        calculatedAt: new Date(),
        models: {
          technical: technicalTargets,
          fundamental: fundamentalTargets,
          momentum: momentumTargets,
        },
      };

    } catch (error: any) {
      logger.error(`Price target calculation error for ${stock.symbol}:`, error.message);
      return undefined;
    }
  }

  /**
   * MODEL 1: TEKNİK ANALİZ
   * Fibonacci seviyeleri ve destek/direnç bazlı
   */
  private calculateTechnicalTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;
    const week52High = stock.priceData.week52High || currentPrice * 1.3;
    const week52Low = stock.priceData.week52Low || currentPrice * 0.7;

    // Volatilite hesapla (52 haftalık range'e göre)
    const range = week52High - week52Low;
    const volatility = range / currentPrice;

    // Fibonacci seviyeleri (52 haftalık range'e göre)
    const fib236 = week52Low + (range * 0.236);
    const fib382 = week52Low + (range * 0.382);
    const fib50 = week52Low + (range * 0.5);
    const fib618 = week52Low + (range * 0.618);
    const fib786 = week52Low + (range * 0.786);
    const fib100 = week52High;
    const fib1272 = week52High + (range * 0.272); // Extension
    const fib1618 = week52High + (range * 0.618); // Extension

    // Mevcut fiyat pozisyonu
    const positionInRange = (currentPrice - week52Low) / range;

    let shortTerm: number;
    let midTerm: number;
    let longTerm: number;

    // Fiyat pozisyonuna göre hedefler belirle
    if (positionInRange < 0.3) {
      // Düşük bölgede - yukarı potansiyel yüksek
      shortTerm = Math.max(currentPrice * 1.05, fib382);
      midTerm = fib618;
      longTerm = fib786;
    } else if (positionInRange < 0.5) {
      // Orta-alt bölge
      shortTerm = fib50;
      midTerm = fib618;
      longTerm = fib100;
    } else if (positionInRange < 0.7) {
      // Orta-üst bölge
      shortTerm = fib618;
      midTerm = fib786;
      longTerm = fib100;
    } else {
      // Yüksek bölgede - hedefler extension'lara
      shortTerm = fib100;
      midTerm = fib1272;
      longTerm = fib1618;
    }

    // Minimum hedef: mevcut fiyattan %3 yukarı
    shortTerm = Math.max(shortTerm, currentPrice * 1.03);
    midTerm = Math.max(midTerm, currentPrice * 1.05);
    longTerm = Math.max(longTerm, currentPrice * 1.08);

    return {
      shortTerm: Number(shortTerm.toFixed(2)),
      midTerm: Number(midTerm.toFixed(2)),
      longTerm: Number(longTerm.toFixed(2)),
    };
  }

  /**
   * MODEL 2: FUNDAMENTAL ANALİZ
   * Fair value hesaplaması (DÜZELTME: Döngüsel hesaplama yok)
   */
  private calculateFundamentalTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;

    // Veri kontrolü - gerçek veri varsa kullan, yoksa teknik hedefe düş
    const hasRealEPS = stock.fundamentals.eps !== null && stock.fundamentals.eps !== undefined;
    const hasRealPE = stock.fundamentals.fk !== null && stock.fundamentals.fk !== undefined;
    const hasRealPB = stock.fundamentals.pdDD !== null && stock.fundamentals.pdDD !== undefined;
    const hasRealEquity = stock.financials.equity !== null && stock.financials.equity !== undefined;
    const hasRealShares = stock.fundamentals.shares !== null && stock.fundamentals.shares !== undefined;

    let fairValue = currentPrice; // Default: mevcut fiyat
    let hasValidFundamentals = false;

    // EPS ve sektör ortalama F/K ile fair value hesapla
    if (hasRealEPS && stock.fundamentals.eps! > 0) {
      // Sektöre göre hedef F/K (BIST ortalaması)
      const sectorTargetPE = this.getSectorTargetPE(stock.sector);
      const peBasedValue = stock.fundamentals.eps! * sectorTargetPE;

      fairValue = peBasedValue;
      hasValidFundamentals = true;
    }

    // Defter değeri ile fair value hesapla
    if (hasRealEquity && hasRealShares && stock.financials.equity! > 0 && stock.fundamentals.shares! > 0) {
      const bookValuePerShare = stock.financials.equity! / stock.fundamentals.shares!;
      const sectorTargetPB = this.getSectorTargetPB(stock.sector);
      const pbBasedValue = bookValuePerShare * sectorTargetPB;

      if (hasValidFundamentals) {
        // Her iki değer varsa ortalama al
        fairValue = (fairValue + pbBasedValue) / 2;
      } else {
        fairValue = pbBasedValue;
        hasValidFundamentals = true;
      }
    }

    // Büyüme oranı (ROE'den tahmin)
    const roe = stock.fundamentals.roe || 10;
    const growthRate = hasValidFundamentals
      ? Math.min(Math.max(roe, 0) / 100, 0.25) // Maksimum %25 büyüme
      : 0.05; // Veri yoksa %5 varsayılan büyüme

    // Eğer fundamental veri yoksa, teknik analize yakın hedefler ver
    if (!hasValidFundamentals) {
      const week52High = stock.priceData.week52High || currentPrice * 1.2;
      fairValue = (currentPrice + week52High) / 2;
    }

    // Kısa vadeli: Fair value + minimal büyüme
    const shortTerm = fairValue * (1 + (growthRate * 0.25));

    // Orta vadeli: Fair value + 6 aylık büyüme
    const midTerm = fairValue * (1 + (growthRate * 0.5));

    // Uzun vadeli: Fair value + 1 yıllık büyüme
    const longTerm = fairValue * (1 + growthRate);

    return {
      shortTerm: Number(shortTerm.toFixed(2)),
      midTerm: Number(midTerm.toFixed(2)),
      longTerm: Number(longTerm.toFixed(2)),
      fairValue: Number(fairValue.toFixed(2)),
      hasValidFundamentals,
    };
  }

  /**
   * Sektöre göre hedef F/K oranı
   */
  private getSectorTargetPE(sector: string | null | undefined): number {
    const sectorPE: Record<string, number> = {
      'Bankacılık': 6,
      'Holding': 8,
      'Havacılık': 10,
      'Telekomünikasyon': 12,
      'Demir Çelik': 7,
      'Enerji': 9,
      'Otomotiv': 8,
      'Perakende': 15,
      'Teknoloji': 20,
    };
    return sectorPE[sector || ''] || 12; // Default: 12
  }

  /**
   * Sektöre göre hedef PD/DD oranı
   */
  private getSectorTargetPB(sector: string | null | undefined): number {
    const sectorPB: Record<string, number> = {
      'Bankacılık': 0.8,
      'Holding': 1.0,
      'Havacılık': 2.0,
      'Telekomünikasyon': 1.3,
      'Demir Çelik': 1.0,
      'Enerji': 1.2,
      'Otomotiv': 1.5,
      'Perakende': 3.0,
      'Teknoloji': 4.0,
    };
    return sectorPB[sector || ''] || 1.5; // Default: 1.5
  }

  /**
   * MODEL 3: MOMENTUM & SENTIMENT
   * DÜZELTME: Gerçek hacim karşılaştırması
   */
  private calculateMomentumTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;

    // Hacim momentum - günlük hacim vs ortalama
    // TODO: Gerçek ortalama hacim verisi eklenince güncellenecek
    const volume = stock.tradingData.volume || 0;
    const volumeTL = stock.tradingData.volumeTL || 0;

    // Hacim bazlı momentum (yüksek hacim = daha fazla ilgi)
    let volumeMomentum = 1.0;
    if (volumeTL > 500_000_000) {
      volumeMomentum = 1.08; // 500M+ TL = çok yüksek ilgi
    } else if (volumeTL > 100_000_000) {
      volumeMomentum = 1.04; // 100M+ TL = yüksek ilgi
    } else if (volumeTL > 50_000_000) {
      volumeMomentum = 1.02; // 50M+ TL = normal
    } else if (volumeTL < 10_000_000) {
      volumeMomentum = 0.98; // 10M altı = düşük ilgi
    }

    // Smart analysis rating'e göre sentiment
    const sentimentMultiplier = this.getSentimentMultiplier(stock.smartAnalysis.rating);

    // Fiyat momentum (52 haftalık değişim)
    const week52Change = stock.priceData.week52Change || 0;
    // Normalize et: -50% ile +100% arasını -0.1 ile +0.1 arasına map'le
    const normalizedPriceMomentum = Math.max(-0.1, Math.min(0.1, week52Change / 500));

    // Günlük değişim etkisi
    const dailyChange = stock.tradingData.dailyChangePercent || 0;
    const dailyMomentum = Math.max(-0.03, Math.min(0.03, dailyChange / 100));

    // Kısa vadeli: Momentum etkisi en yüksek
    const shortTerm = currentPrice * volumeMomentum * (1 + sentimentMultiplier * 0.5 + dailyMomentum);

    // Orta vadeli: Dengeli
    const midTerm = currentPrice * (1 + sentimentMultiplier * 0.3 + normalizedPriceMomentum);

    // Uzun vadeli: Momentum etkisi azalır
    const longTerm = currentPrice * (1 + sentimentMultiplier * 0.2);

    return {
      shortTerm: Number(shortTerm.toFixed(2)),
      midTerm: Number(midTerm.toFixed(2)),
      longTerm: Number(longTerm.toFixed(2)),
    };
  }

  /**
   * Al/Sat seviyelerini hesapla
   * Destek/Direnç + Fair Value + Fibonacci bazlı
   */
  private calculateBuySellLevels(stock: StockData, targets: any) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;
    const week52High = stock.priceData.week52High || currentPrice * 1.3;
    const week52Low = stock.priceData.week52Low || currentPrice * 0.7;
    const dayLow = stock.priceData.dayLow || currentPrice * 0.98;

    const range = week52High - week52Low;

    // Fibonacci destek seviyeleri
    const fib236 = week52Low + (range * 0.236);
    const fib382 = week52Low + (range * 0.382);
    const fib50 = week52Low + (range * 0.5);
    const fib618 = week52Low + (range * 0.618);
    const fib786 = week52Low + (range * 0.786);

    // Fair value varsa kullan
    const fairValue = targets.fundamental.fairValue || currentPrice;

    // ========== ALIM SEVİYELERİ ==========
    // Güçlü alım: 52 hafta düşük yakını veya fair value'nun %15 altı
    const strongBuy = Math.max(week52Low * 1.02, fairValue * 0.85);

    // Orta alım: Fib 38.2 veya fair value'nun %8 altı
    const moderateBuy = Math.min(fib382, fairValue * 0.92);

    // Zayıf alım: Günlük düşük veya mevcut fiyatın %3 altı
    const weakBuy = Math.min(dayLow, currentPrice * 0.97);

    // ========== SATIM SEVİYELERİ ==========
    // Zayıf satım: Kısa vadeli hedef veya mevcut fiyatın %5 üstü
    const weakSell = Math.max(targets.shortTermTarget, currentPrice * 1.05);

    // Orta satım: Orta vadeli hedef veya Fib 78.6
    const moderateSell = Math.max(targets.midTermTarget, fib786);

    // Güçlü satım: 52 hafta zirvesi yakını veya uzun vadeli hedef
    const strongSell = Math.max(week52High * 0.98, targets.longTermTarget);

    return {
      buyLevels: {
        strong: Number(strongBuy.toFixed(2)),
        moderate: Number(moderateBuy.toFixed(2)),
        weak: Number(weakBuy.toFixed(2)),
      },
      sellLevels: {
        weak: Number(weakSell.toFixed(2)),
        moderate: Number(moderateSell.toFixed(2)),
        strong: Number(strongSell.toFixed(2)),
      },
    };
  }

  /**
   * Ağırlıklı hibrit hedef hesaplama
   */
  private calculateHybridTarget(
    technical: number,
    fundamental: number,
    momentum: number,
    weights: [number, number, number]
  ): number {
    const [wTech, wFund, wMom] = weights;
    return (technical * wTech) + (fundamental * wFund) + (momentum * wMom);
  }

  /**
   * Momentum çarpanı
   */
  private getMomentumMultiplier(stock: StockData): number {
    const rating = stock.smartAnalysis.rating;
    const overallScore = stock.smartAnalysis.overallScore;

    // Rating'e göre baz çarpan
    let baseMultiplier = 1.0;
    switch (rating) {
      case 'Strong Buy':
        baseMultiplier = 1.12;
        break;
      case 'Buy':
        baseMultiplier = 1.05;
        break;
      case 'Hold':
        baseMultiplier = 1.00;
        break;
      case 'Sell':
        baseMultiplier = 0.95;
        break;
      case 'Strong Sell':
        baseMultiplier = 0.88;
        break;
    }

    // Overall score ile fine-tune (50-70 arası normal)
    const scoreAdjustment = (overallScore - 60) / 200; // -0.3 ile +0.2 arası
    const finalMultiplier = baseMultiplier + scoreAdjustment;

    return Math.max(0.75, Math.min(1.25, finalMultiplier)); // 0.75 - 1.25 arası sınırla
  }

  /**
   * Sentiment çarpanı (rating bazlı)
   */
  private getSentimentMultiplier(rating: string): number {
    switch (rating) {
      case 'Strong Buy': return 0.12;
      case 'Buy': return 0.06;
      case 'Hold': return 0.00;
      case 'Sell': return -0.06;
      case 'Strong Sell': return -0.12;
      default: return 0;
    }
  }

  /**
   * Güvenilirlik skoru hesaplama
   */
  private calculateConfidence(stock: StockData, timeframe: 'short' | 'mid' | 'long'): number {
    let confidence = 0;

    // 1. Veri kalitesi (0-35 puan)
    const hasEPS = stock.fundamentals.eps !== null && stock.fundamentals.eps !== undefined;
    const hasPE = stock.fundamentals.fk !== null && stock.fundamentals.fk !== undefined;
    const hasROE = stock.fundamentals.roe !== null && stock.fundamentals.roe !== undefined;
    const hasPB = stock.fundamentals.pdDD !== null && stock.fundamentals.pdDD !== undefined;
    const has52Week = stock.priceData.week52High && stock.priceData.week52Low;

    confidence += hasEPS ? 8 : 0;
    confidence += hasPE ? 7 : 0;
    confidence += hasROE ? 7 : 0;
    confidence += hasPB ? 6 : 0;
    confidence += has52Week ? 7 : 2;

    // 2. Likidite (0-20 puan) - yüksek hacim = daha güvenilir
    const volumeTL = stock.tradingData.volumeTL || 0;
    if (volumeTL > 100_000_000) confidence += 20;
    else if (volumeTL > 50_000_000) confidence += 15;
    else if (volumeTL > 10_000_000) confidence += 10;
    else confidence += 5;

    // 3. Volatilite skoru (0-25 puan) - düşük volatilite = daha güvenilir
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 1;
    const week52High = stock.priceData.week52High || currentPrice * 1.3;
    const week52Low = stock.priceData.week52Low || currentPrice * 0.7;
    const volatility = (week52High - week52Low) / currentPrice;

    if (volatility < 0.3) confidence += 25;
    else if (volatility < 0.5) confidence += 20;
    else if (volatility < 0.7) confidence += 15;
    else if (volatility < 1.0) confidence += 10;
    else confidence += 5;

    // 4. Rating tutarlılığı (0-20 puan)
    const score = stock.smartAnalysis.overallScore;
    if (score >= 70 || score <= 30) confidence += 20; // Güçlü sinyal
    else if (score >= 60 || score <= 40) confidence += 15;
    else confidence += 10; // Nötr bölge - daha belirsiz

    // Zaman dilimi ayarı (kısa vade daha belirsiz)
    const timeframeAdjustment = {
      short: 0.80,
      mid: 0.90,
      long: 1.0,
    };
    confidence *= timeframeAdjustment[timeframe];

    return Math.round(Math.max(15, Math.min(95, confidence)));
  }
}

export default new PriceTargetCalculatorService();
