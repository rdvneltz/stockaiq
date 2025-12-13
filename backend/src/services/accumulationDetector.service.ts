import yahooFinanceService from './yahooFinance.service';
import logger from '../utils/logger';
import { StockData } from '../types';

interface AccumulationSignals {
  overallScore: number;
  status: 'strong_accumulation' | 'accumulation' | 'neutral' | 'distribution' | 'strong_distribution';
  signals: {
    volumeTrend: {
      score: number;
      description: string;
      direction: 'increasing' | 'stable' | 'decreasing';
      avgVolume5d: number | null;
      avgVolume20d: number | null;
    };
    priceVolumeRelation: {
      score: number;
      description: string;
      pattern: 'bullish_accumulation' | 'bearish_distribution' | 'neutral';
    };
    foreignOwnership: {
      score: number;
      description: string;
      currentPercent: number | null;
      changeWeekly: number | null;
      changeMonthly: number | null;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    institutionalActivity: {
      score: number;
      description: string;
      insiderBuying: boolean;
      largeBlockTrades: boolean;
    };
    fundamentalMomentum: {
      score: number;
      description: string;
      revenueGrowth: number | null;
      profitGrowth: number | null;
      consecutiveGrowthQuarters: number;
    };
    technicalAccumulation: {
      score: number;
      description: string;
      priceNear52WeekLow: boolean;
      tightConsolidation: boolean;
      supportHolding: boolean;
    };
  };
  alerts: string[];
  lastUpdated: Date;
}

class AccumulationDetectorService {
  /**
   * Birikim/Dağıtım tespiti yapar
   * Gizli birikim yapan büyük oyuncuları erken tespit etmeye çalışır
   */
  async detectAccumulation(stockData: StockData): Promise<AccumulationSignals | null> {
    try {
      logger.info(`Detecting accumulation for ${stockData.symbol}`);

      const alerts: string[] = [];

      // 1. Hacim Trendi Analizi
      const volumeTrend = await this.analyzeVolumeTrend(stockData);

      // 2. Fiyat-Hacim İlişkisi
      const priceVolumeRelation = await this.analyzePriceVolumeRelation(stockData);

      // 3. Yabancı Payı (şimdilik simülasyon - gerçek veri sonra eklenecek)
      const foreignOwnership = this.analyzeForeignOwnership(stockData);

      // 4. Kurumsal Aktivite
      const institutionalActivity = this.analyzeInstitutionalActivity(stockData);

      // 5. Fundamental Momentum (karlılık artışı)
      const fundamentalMomentum = this.analyzeFundamentalMomentum(stockData);

      // 6. Teknik Birikim Patternleri
      const technicalAccumulation = this.analyzeTechnicalAccumulation(stockData);

      // Genel Skor Hesapla (ağırlıklı)
      const overallScore = Math.round(
        volumeTrend.score * 0.20 +
        priceVolumeRelation.score * 0.25 +
        foreignOwnership.score * 0.15 +
        institutionalActivity.score * 0.10 +
        fundamentalMomentum.score * 0.15 +
        technicalAccumulation.score * 0.15
      );

      // Status belirle
      let status: AccumulationSignals['status'];
      if (overallScore >= 75) {
        status = 'strong_accumulation';
        alerts.push('🚀 GÜÇLÜ BİRİKİM SİNYALİ - Büyük oyuncular pozisyon alıyor olabilir!');
      } else if (overallScore >= 55) {
        status = 'accumulation';
        alerts.push('📈 Birikim sinyalleri tespit edildi - Dikkatle takip edin');
      } else if (overallScore >= 45) {
        status = 'neutral';
      } else if (overallScore >= 30) {
        status = 'distribution';
        alerts.push('📉 Dağıtım sinyalleri var - Büyük oyuncular çıkıyor olabilir');
      } else {
        status = 'strong_distribution';
        alerts.push('🔴 GÜÇLÜ DAĞITIM - Büyük satışlar tespit edildi!');
      }

      // Özel uyarılar ekle
      if (volumeTrend.score >= 70 && priceVolumeRelation.pattern === 'bullish_accumulation') {
        alerts.push('💡 Hacim artıyor ve fiyat stabil - Klasik birikim paterni!');
      }

      if (technicalAccumulation.priceNear52WeekLow && volumeTrend.direction === 'increasing') {
        alerts.push('🎯 52 hafta düşük yakınında artan hacim - Dip oluşumu olabilir');
      }

      if (fundamentalMomentum.consecutiveGrowthQuarters >= 3) {
        alerts.push('📊 Ard arda 3+ çeyrek karlılık artışı - Fundamental güç');
      }

      if (foreignOwnership.trend === 'increasing' && foreignOwnership.changeMonthly && foreignOwnership.changeMonthly > 1) {
        alerts.push('🌍 Yabancı yatırımcı ilgisi artıyor');
      }

      return {
        overallScore,
        status,
        signals: {
          volumeTrend,
          priceVolumeRelation,
          foreignOwnership,
          institutionalActivity,
          fundamentalMomentum,
          technicalAccumulation,
        },
        alerts,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error(`Accumulation detection error for ${stockData.symbol}:`, error);
      return null;
    }
  }

  /**
   * Hacim trendi analizi
   * 5 günlük ortalama vs 20 günlük ortalama
   */
  private async analyzeVolumeTrend(stockData: StockData): Promise<AccumulationSignals['signals']['volumeTrend']> {
    try {
      // Historical data'dan hacim hesapla
      const historicalData = await yahooFinanceService.getHistoricalData(stockData.symbol, '1mo', '1d');

      if (!historicalData || historicalData.length < 5) {
        return {
          score: 50,
          description: 'Yeterli hacim verisi yok',
          direction: 'stable',
          avgVolume5d: null,
          avgVolume20d: null,
        };
      }

      // Son 5 gün ve 20 gün ortalama hacim
      const last5Days = historicalData.slice(-5);
      const last20Days = historicalData.slice(-20);

      const avgVolume5d = last5Days.reduce((sum, d) => sum + (d.volume || 0), 0) / last5Days.length;
      const avgVolume20d = last20Days.reduce((sum, d) => sum + (d.volume || 0), 0) / last20Days.length;

      const volumeRatio = avgVolume20d > 0 ? avgVolume5d / avgVolume20d : 1;

      let score = 50;
      let direction: 'increasing' | 'stable' | 'decreasing' = 'stable';
      let description = '';

      if (volumeRatio >= 1.5) {
        score = 85;
        direction = 'increasing';
        description = `Hacim son 5 günde %${((volumeRatio - 1) * 100).toFixed(0)} arttı - Güçlü ilgi`;
      } else if (volumeRatio >= 1.2) {
        score = 70;
        direction = 'increasing';
        description = `Hacim artışı var (${volumeRatio.toFixed(2)}x ortalama)`;
      } else if (volumeRatio >= 0.8) {
        score = 50;
        direction = 'stable';
        description = 'Hacim normal seviyelerde';
      } else if (volumeRatio >= 0.5) {
        score = 35;
        direction = 'decreasing';
        description = 'Hacim azalıyor';
      } else {
        score = 20;
        direction = 'decreasing';
        description = 'Hacim ciddi şekilde düşük - İlgi azalmış';
      }

      return { score, description, direction, avgVolume5d, avgVolume20d };
    } catch (error) {
      return {
        score: 50,
        description: 'Hacim analizi yapılamadı',
        direction: 'stable',
        avgVolume5d: null,
        avgVolume20d: null,
      };
    }
  }

  /**
   * Fiyat-Hacim ilişkisi analizi
   * Fiyat stabil/yükselirken artan hacim = birikim
   * Fiyat düşerken artan hacim = dağıtım
   */
  private async analyzePriceVolumeRelation(stockData: StockData): Promise<AccumulationSignals['signals']['priceVolumeRelation']> {
    try {
      const historicalData = await yahooFinanceService.getHistoricalData(stockData.symbol, '1mo', '1d');

      if (!historicalData || historicalData.length < 10) {
        return {
          score: 50,
          description: 'Yeterli veri yok',
          pattern: 'neutral',
        };
      }

      // Son 10 gün
      const recentData = historicalData.slice(-10);

      // Fiyat değişimi ve hacim değişimi
      let upDaysWithHighVolume = 0;
      let downDaysWithHighVolume = 0;
      let avgVolume = recentData.reduce((sum, d) => sum + (d.volume || 0), 0) / recentData.length;

      for (let i = 1; i < recentData.length; i++) {
        const priceChange = recentData[i].close - recentData[i - 1].close;
        const isHighVolume = (recentData[i].volume || 0) > avgVolume * 1.1;

        if (priceChange > 0 && isHighVolume) {
          upDaysWithHighVolume++;
        } else if (priceChange < 0 && isHighVolume) {
          downDaysWithHighVolume++;
        }
      }

      let score = 50;
      let pattern: 'bullish_accumulation' | 'bearish_distribution' | 'neutral' = 'neutral';
      let description = '';

      if (upDaysWithHighVolume >= 4 && downDaysWithHighVolume <= 2) {
        score = 85;
        pattern = 'bullish_accumulation';
        description = 'Yükseliş günlerinde yüksek hacim - Birikim paterni';
      } else if (upDaysWithHighVolume >= 3 && upDaysWithHighVolume > downDaysWithHighVolume) {
        score = 70;
        pattern = 'bullish_accumulation';
        description = 'Pozitif fiyat-hacim ilişkisi';
      } else if (downDaysWithHighVolume >= 4 && upDaysWithHighVolume <= 2) {
        score = 20;
        pattern = 'bearish_distribution';
        description = 'Düşüş günlerinde yüksek hacim - Dağıtım paterni';
      } else if (downDaysWithHighVolume >= 3 && downDaysWithHighVolume > upDaysWithHighVolume) {
        score = 35;
        pattern = 'bearish_distribution';
        description = 'Negatif fiyat-hacim ilişkisi';
      } else {
        score = 50;
        pattern = 'neutral';
        description = 'Belirsiz fiyat-hacim ilişkisi';
      }

      return { score, description, pattern };
    } catch (error) {
      return {
        score: 50,
        description: 'Fiyat-hacim analizi yapılamadı',
        pattern: 'neutral',
      };
    }
  }

  /**
   * Yabancı yatırımcı payı analizi
   * TODO: Gerçek veri kaynağı eklenecek (BIST/MKK)
   */
  private analyzeForeignOwnership(stockData: StockData): AccumulationSignals['signals']['foreignOwnership'] {
    // Şimdilik placeholder - gerçek veri kaynağı eklenince güncellenecek
    // BIST MKK verilerinden yabancı payı çekilebilir
    return {
      score: 50,
      description: 'Yabancı payı verisi henüz entegre edilmedi',
      currentPercent: null,
      changeWeekly: null,
      changeMonthly: null,
      trend: 'stable',
    };
  }

  /**
   * Kurumsal aktivite analizi
   * Büyük blok işlemler, insider alımlar
   */
  private analyzeInstitutionalActivity(stockData: StockData): AccumulationSignals['signals']['institutionalActivity'] {
    // Büyük lot işlemler tespiti (hacim x fiyat bazlı yaklaşık)
    const volumeTL = stockData.tradingData.volumeTL;
    const avgDailyVolume = stockData.tradingData.volume;

    let score = 50;
    let description = 'Normal kurumsal aktivite';
    let largeBlockTrades = false;

    // Günlük işlem hacmi 100M TL üzerindeyse kurumsal ilgi var
    if (volumeTL && volumeTL > 500_000_000) {
      score = 80;
      largeBlockTrades = true;
      description = 'Çok yüksek işlem hacmi - Kurumsal aktivite olabilir';
    } else if (volumeTL && volumeTL > 100_000_000) {
      score = 65;
      largeBlockTrades = true;
      description = 'Yüksek işlem hacmi - Kurumsal ilgi var';
    }

    return {
      score,
      description,
      insiderBuying: false, // TODO: KAP bildirimleri entegre edilince
      largeBlockTrades,
    };
  }

  /**
   * Fundamental momentum analizi
   * Ard arda artan karlılık, gelir büyümesi
   */
  private analyzeFundamentalMomentum(stockData: StockData): AccumulationSignals['signals']['fundamentalMomentum'] {
    const roe = stockData.fundamentals.roe;
    const profitability = stockData.financials.profitability;
    const revenue = stockData.financials.revenue;

    let score = 50;
    let description = '';
    let consecutiveGrowthQuarters = 0;

    // ROE ve karlılık bazlı değerlendirme
    if (roe !== null && roe !== undefined) {
      if (roe > 20) {
        score += 20;
        description = 'Yüksek karlılık ';
      } else if (roe > 15) {
        score += 10;
      } else if (roe < 5) {
        score -= 15;
      } else if (roe < 0) {
        score -= 25;
      }
    }

    if (profitability !== null && profitability !== undefined) {
      if (profitability > 15) {
        score += 15;
        description += 'Güçlü kar marjı';
      } else if (profitability > 10) {
        score += 5;
      } else if (profitability < 3) {
        score -= 10;
      }
    }

    // Historical profitability varsa trend analizi yap
    if (stockData.historicalProfitability && stockData.historicalProfitability.length >= 4) {
      const sorted = [...stockData.historicalProfitability].sort((a, b) =>
        new Date(a.year).getTime() - new Date(b.year).getTime()
      );

      // Son 4 çeyrek karlılık artışı kontrol
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].netIncome > sorted[i - 1].netIncome) {
          consecutiveGrowthQuarters++;
        } else {
          consecutiveGrowthQuarters = 0;
        }
      }

      if (consecutiveGrowthQuarters >= 4) {
        score += 25;
        description = `${consecutiveGrowthQuarters} çeyrek art arda karlılık artışı - Güçlü momentum!`;
      } else if (consecutiveGrowthQuarters >= 2) {
        score += 10;
        description = `${consecutiveGrowthQuarters} çeyrek art arda karlılık artışı`;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      description: description || 'Normal fundamental durum',
      revenueGrowth: null, // TODO: Yıllık büyüme hesaplaması
      profitGrowth: null,
      consecutiveGrowthQuarters,
    };
  }

  /**
   * Teknik birikim patternleri
   * 52 hafta düşük yakını, dar konsolidasyon, destek seviyesi
   */
  private analyzeTechnicalAccumulation(stockData: StockData): AccumulationSignals['signals']['technicalAccumulation'] {
    const currentPrice = stockData.currentPrice;
    const week52High = stockData.priceData.week52High;
    const week52Low = stockData.priceData.week52Low;
    const dayHigh = stockData.priceData.dayHigh;
    const dayLow = stockData.priceData.dayLow;

    let score = 50;
    let description = '';
    let priceNear52WeekLow = false;
    let tightConsolidation = false;
    let supportHolding = false;

    if (!currentPrice || !week52High || !week52Low) {
      return {
        score: 50,
        description: 'Yeterli fiyat verisi yok',
        priceNear52WeekLow: false,
        tightConsolidation: false,
        supportHolding: false,
      };
    }

    // 52 hafta range hesapla
    const range52Week = week52High - week52Low;
    const positionIn52WeekRange = (currentPrice - week52Low) / range52Week;

    // 52 hafta düşük yakınında mı? (alt %20)
    if (positionIn52WeekRange <= 0.20) {
      priceNear52WeekLow = true;
      score += 15;
      description = '52 hafta düşük yakınında - Potansiyel dip oluşumu ';
    } else if (positionIn52WeekRange <= 0.35) {
      score += 10;
      description = '52 hafta range\'inin alt bölgesinde ';
    } else if (positionIn52WeekRange >= 0.85) {
      score -= 10;
      description = '52 hafta zirvesine yakın - Dikkatli olun ';
    }

    // Dar konsolidasyon kontrolü (günlük range / fiyat < %2)
    if (dayHigh && dayLow && currentPrice) {
      const dailyRange = (dayHigh - dayLow) / currentPrice;
      if (dailyRange < 0.015) {
        tightConsolidation = true;
        score += 10;
        description += 'Dar fiyat aralığı (konsolidasyon) ';
      }
    }

    // Destek seviyesinde mi? (52 hafta düşük yakınında ve tutunuyor)
    if (priceNear52WeekLow && stockData.tradingData.dailyChangePercent && stockData.tradingData.dailyChangePercent >= 0) {
      supportHolding = true;
      score += 10;
      description += 'Destek seviyesinde tutunuyor';
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      description: description.trim() || 'Normal teknik görünüm',
      priceNear52WeekLow,
      tightConsolidation,
      supportHolding,
    };
  }
}

export default new AccumulationDetectorService();
