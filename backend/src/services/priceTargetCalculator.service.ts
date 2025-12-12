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
   */
  private calculateTechnicalTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;
    const week52High = stock.priceData.week52High || currentPrice * 1.3;
    const week52Low = stock.priceData.week52Low || currentPrice * 0.7;
    const dayHigh = stock.priceData.dayHigh || currentPrice * 1.02;
    const dayLow = stock.priceData.dayLow || currentPrice * 0.98;

    // Volatilite hesapla (52 haftalık range'e göre)
    const volatility = (week52High - week52Low) / currentPrice;

    // Fibonacci seviyeleri (52 haftalık range'e göre)
    const range = week52High - week52Low;
    const fib382 = week52Low + (range * 0.382);
    const fib50 = week52Low + (range * 0.5);
    const fib618 = week52Low + (range * 0.618);
    const fib100 = week52High;
    const fib1618 = week52High + (range * 0.618); // Extension
    const fib2618 = week52High + (range * 1.618); // Extension

    // Kısa vadeli: İlk direnç + volatilite faktörü
    const shortTerm = currentPrice * (1 + (volatility * 0.5));

    // Orta vadeli: Fibonacci seviyeleri ortalaması
    const midTerm = (fib618 + fib100) / 2;

    // Uzun vadeli: Fibonacci extension + trend projeksiyonu
    const longTerm = fib1618;

    return {
      shortTerm: Number(shortTerm.toFixed(2)),
      midTerm: Number(midTerm.toFixed(2)),
      longTerm: Number(longTerm.toFixed(2)),
    };
  }

  /**
   * MODEL 2: FUNDAMENTAL ANALİZ
   */
  private calculateFundamentalTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;
    const fk = stock.fundamentals.fk || 15; // Ortalama F/K
    const eps = stock.fundamentals.eps || (currentPrice / fk);
    const pddd = stock.fundamentals.pdDD || 2; // Ortalama PD/DD
    const bookValuePerShare = currentPrice / (pddd || 1);

    // Fair value hesaplamaları
    const peBasedValue = eps * fk;
    const pbBasedValue = bookValuePerShare * pddd;
    const fairValue = (peBasedValue + pbBasedValue) / 2;

    // Kar büyüme oranını tahmin et (ROE'den)
    const roe = stock.fundamentals.roe || 10;
    const growthRate = Math.min(roe / 100, 0.30); // Maksimum %30 büyüme varsay

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
    };
  }

  /**
   * MODEL 3: MOMENTUM & SENTIMENT
   */
  private calculateMomentumTargets(stock: StockData) {
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;

    // Hacim momentum (günlük değişim varsa)
    const volumeChange = stock.tradingData.volume || 0;
    const volumeMomentum = volumeChange > 0 ? 1.05 : 1.0;

    // Smart analysis rating'e göre sentiment
    const sentimentMultiplier = this.getSentimentMultiplier(stock.smartAnalysis.rating);

    // Fiyat momentum (52 haftalık değişim)
    const week52Change = stock.priceData.week52Change || 0;
    const priceMomentum = 1 + (week52Change / 100);

    // Kısa vadeli momentum etkisi en yüksek
    const shortTerm = currentPrice * volumeMomentum * (1 + (sentimentMultiplier * 0.15));

    // Orta vadeli dengeli
    const midTerm = currentPrice * priceMomentum * (1 + (sentimentMultiplier * 0.10));

    // Uzun vadeli momentum etkisi azalır
    const longTerm = currentPrice * (1 + (sentimentMultiplier * 0.07));

    return {
      shortTerm: Number(shortTerm.toFixed(2)),
      midTerm: Number(midTerm.toFixed(2)),
      longTerm: Number(longTerm.toFixed(2)),
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
        baseMultiplier = 1.15;
        break;
      case 'Buy':
        baseMultiplier = 1.07;
        break;
      case 'Hold':
        baseMultiplier = 1.00;
        break;
      case 'Sell':
        baseMultiplier = 0.93;
        break;
      case 'Strong Sell':
        baseMultiplier = 0.85;
        break;
    }

    // Overall score ile fine-tune (60-80 arası normal)
    const scoreAdjustment = (overallScore - 60) / 100; // -0.6 ile +0.4 arası
    const finalMultiplier = baseMultiplier + scoreAdjustment * 0.1;

    return Math.max(0.7, Math.min(1.3, finalMultiplier)); // 0.7 - 1.3 arası sınırla
  }

  /**
   * Sentiment çarpanı (rating bazlı)
   */
  private getSentimentMultiplier(rating: string): number {
    switch (rating) {
      case 'Strong Buy': return 0.15;
      case 'Buy': return 0.07;
      case 'Hold': return 0.00;
      case 'Sell': return -0.07;
      case 'Strong Sell': return -0.15;
      default: return 0;
    }
  }

  /**
   * Güvenilirlik skoru hesaplama
   */
  private calculateConfidence(stock: StockData, timeframe: 'short' | 'mid' | 'long'): number {
    let confidence = 0;

    // 1. Veri kalitesi (0-30 puan)
    const hasFullFinancials = stock.fundamentals.fk && stock.fundamentals.eps && stock.fundamentals.roe;
    const hasFullPrice = stock.priceData.week52High && stock.priceData.week52Low;
    const dataQuality = (hasFullFinancials ? 15 : 5) + (hasFullPrice ? 15 : 5);
    confidence += dataQuality;

    // 2. Model tutarlılığı (0-40 puan)
    // Not: Gerçek implementasyonda modeller arasındaki farkı ölçeriz
    // Şimdilik varsayılan değer
    confidence += 30;

    // 3. Volatilite skoru (0-30 puan)
    const currentPrice = stock.currentPrice || stock.priceData.currentPrice || 0;
    const week52High = stock.priceData.week52High || currentPrice * 1.3;
    const week52Low = stock.priceData.week52Low || currentPrice * 0.7;
    const volatility = (week52High - week52Low) / currentPrice;

    // Düşük volatilite = yüksek güven
    const volatilityScore = Math.max(0, 30 - (volatility * 50));
    confidence += volatilityScore;

    // Zaman dilimi ayarı (kısa vade daha belirsiz)
    const timeframeAdjustment = {
      short: 0.85,
      mid: 0.95,
      long: 1.0,
    };
    confidence *= timeframeAdjustment[timeframe];

    return Math.round(Math.max(10, Math.min(95, confidence)));
  }
}

export default new PriceTargetCalculatorService();
