export interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number | null;
  sector?: string | null;
  industry?: string | null;

  // Fiyat Verileri
  priceData: {
    currentPrice: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    dayAverage: number | null;
    week1High: number | null;
    week1Low: number | null;
    day30High: number | null;
    day30Low: number | null;
    week52High: number | null;
    week52Low: number | null;
    week52Change: number | null;
    week52ChangeTL: number | null;
  };

  // İşlem Verileri
  tradingData: {
    bid: number | null;
    ask: number | null;
    volume: number | null;
    volumeTL: number | null;
    lotSize: number | null;
    dailyChange: number | null;
    dailyChangePercent: number | null;
    dailyOpen: number | null;
  };

  // Temel Göstergeler
  fundamentals: {
    marketCap: number | null;
    pdDD: number | null; // Piyasa Değeri / Defter Değeri
    fk: number | null; // F/K
    fdFAVO: number | null; // FD/FAVO
    pdEBITDA: number | null; // PD/EBITDA
    shares: number | null; // İhraç Edilen Hisse Sayısı
    paidCapital: number | null; // Ödenmiş Sermaye
    eps: number | null; // Hisse Başına Kazanç (Earnings Per Share)
    roe: number | null; // Öz Sermaye Karlılığı (Return on Equity) %
    roa: number | null; // Varlık Karlılığı (Return on Assets) %
  };

  // Finansal Tablo Verileri
  financials: {
    period: string | null;
    revenue: number | null; // Hasılat
    grossProfit: number | null; // Brüt Kar
    netIncome: number | null; // Net Kar
    profitability: number | null; // Net Karlılık (Net Kar Marjı) %
    grossProfitMargin: number | null; // Brüt Kar Marjı %
    equity: number | null; // Öz Sermaye
    currentAssets: number | null; // Dönen Varlıklar
    fixedAssets: number | null; // Duran Varlıklar
    totalAssets: number | null; // Toplam Varlıklar
    shortTermLiabilities: number | null; // Kısa Vadeli Borçlar
    longTermLiabilities: number | null; // Uzun Vadeli Borçlar
    shortTermBankLoans: number | null; // Kısa Vadeli Banka Kredisi
    longTermBankLoans: number | null; // Uzun Vadeli Banka Kredisi
    tradeReceivables: number | null; // Ticari Alacaklar
    financialInvestments: number | null; // Finansal Yatırımlar
    investmentProperty: number | null; // Yatırım Amaçlı Gayrimenkuller
    prepaidExpenses: number | null; // Peşin Ödenmiş Giderler
    deferredTax: number | null; // Ertelenmiş Vergi
    totalDebt: number | null; // Toplam Borç
    netDebt: number | null; // Net Borç (Borç - Nakit)
    workingCapital: number | null; // İşletme Sermayesi
  };

  // Ek Analizler
  analysis: {
    domesticSalesRatio: number | null; // Yurtiçi Satış %
    foreignSalesRatio: number | null; // Yurtdışı Satış %
    exportRatio: number | null; // İhracat %
    averageDividend: number | null; // Ortalama Temettü
  };

  // Likidite Oranları
  liquidity: {
    currentRatio: number | null; // Cari Oran (Dönen Varlıklar / Kısa Vadeli Borçlar)
    acidTestRatio: number | null; // Asit-Test Oranı
    cashRatio: number | null; // Nakit Oranı
  };

  // Borçluluk Oranları
  leverage: {
    debtToEquity: number | null; // Borç / Öz Sermaye
    debtToAssets: number | null; // Borç / Varlıklar
    shortTermDebtRatio: number | null; // Kısa Vadeli Borç Oranı %
    longTermDebtRatio: number | null; // Uzun Vadeli Borç Oranı %
  };

  // Tarihsel Karlılık
  historicalProfitability?: {
    year: string;
    netIncome: number;
    profitability: number;
  }[];

  // Akıllı Analiz ve Öneriler
  smartAnalysis: {
    overallScore: number; // 0-100 arası genel skor
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'; // Genel öneri
    valuationScore: number; // Değerleme skoru (0-100)
    profitabilityScore: number; // Karlılık skoru (0-100)
    liquidityScore: number; // Likidite skoru (0-100)
    leverageScore: number; // Borçluluk skoru (0-100)
    strengths: string[]; // Güçlü yönler
    weaknesses: string[]; // Zayıf yönler
    warnings: string[]; // Uyarılar
    recommendations: string[]; // Öneriler
  };

  // AI Fiyat Hedefleri
  priceTargets?: {
    shortTerm: {
      target: number; // Kısa vadeli hedef (1-3 ay)
      confidence: number; // Güvenilirlik (0-100)
      potential: number; // Potansiyel % değişim
      timeframe: string; // "1-3 ay"
    };
    midTerm: {
      target: number; // Orta vadeli hedef (3-6 ay)
      confidence: number;
      potential: number;
      timeframe: string; // "3-6 ay"
    };
    longTerm: {
      target: number; // Uzun vadeli hedef (6-12 ay)
      confidence: number;
      potential: number;
      timeframe: string; // "6-12 ay"
    };
    calculatedAt: Date; // Hesaplama zamanı
    models: {
      technical: { shortTerm: number; midTerm: number; longTerm: number };
      fundamental: { shortTerm: number; midTerm: number; longTerm: number };
      momentum: { shortTerm: number; midTerm: number; longTerm: number };
    };
    // Yeni: Al/Sat seviyeleri
    buyLevels: {
      strong: number; // Güçlü alım seviyesi
      moderate: number; // Orta alım seviyesi
      weak: number; // Zayıf alım seviyesi
    };
    sellLevels: {
      strong: number; // Güçlü satış seviyesi
      moderate: number; // Orta satış seviyesi
      weak: number; // Zayıf satış seviyesi
    };
  };

  // Birikim/Dağıtım Tespiti (Stealth Accumulation Detection)
  accumulationSignals?: {
    overallScore: number; // 0-100: Birikim skoru
    status: 'strong_accumulation' | 'accumulation' | 'neutral' | 'distribution' | 'strong_distribution';
    signals: {
      volumeTrend: {
        score: number; // 0-100
        description: string;
        direction: 'increasing' | 'stable' | 'decreasing';
        avgVolume5d: number | null;
        avgVolume20d: number | null;
      };
      priceVolumeRelation: {
        score: number; // 0-100
        description: string;
        pattern: 'bullish_accumulation' | 'bearish_distribution' | 'neutral';
      };
      foreignOwnership: {
        score: number; // 0-100
        description: string;
        currentPercent: number | null;
        changeWeekly: number | null;
        changeMonthly: number | null;
        trend: 'increasing' | 'stable' | 'decreasing';
      };
      institutionalActivity: {
        score: number; // 0-100
        description: string;
        insiderBuying: boolean;
        largeBlockTrades: boolean;
      };
      fundamentalMomentum: {
        score: number; // 0-100
        description: string;
        revenueGrowth: number | null;
        profitGrowth: number | null;
        consecutiveGrowthQuarters: number;
      };
      technicalAccumulation: {
        score: number; // 0-100
        description: string;
        priceNear52WeekLow: boolean;
        tightConsolidation: boolean;
        supportHolding: boolean;
      };
    };
    alerts: string[]; // Önemli birikim uyarıları
    lastUpdated: Date;
  };

  // Tarihsel Karşılaştırma
  historicalComparison?: {
    avgROE5Y: number | null;
    avgProfitMargin5Y: number | null;
    avgRevenueGrowth5Y: number | null;
    currentVsHistorical: {
      roeComparison: 'above_avg' | 'at_avg' | 'below_avg';
      profitComparison: 'above_avg' | 'at_avg' | 'below_avg';
      revenueComparison: 'above_avg' | 'at_avg' | 'below_avg';
    };
    trend: 'improving' | 'stable' | 'declining';
  };

  // Sektör Karşılaştırması
  sectorComparison?: {
    sectorAvgPE: number | null;
    sectorAvgPB: number | null;
    sectorAvgROE: number | null;
    vsSecorPE: 'undervalued' | 'fairly_valued' | 'overvalued';
    vsSectorPB: 'undervalued' | 'fairly_valued' | 'overvalued';
    vsSectorROE: 'outperforming' | 'inline' | 'underperforming';
    percentileInSector: number; // 0-100: Sektördeki yüzdelik dilim
  };

  lastUpdated: Date;
}

// Portfolio Interface
export interface Portfolio {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  stocks: PortfolioStock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioStock {
  symbol: string;
  quantity: number;
  avgCost: number;
  addedAt: Date;
  notes?: string;
}

export interface PortfolioAnalysis {
  portfolioId: string;
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;

  // Sektör dağılımı
  sectorDistribution: {
    sector: string;
    percentage: number;
    value: number;
  }[];

  // Risk metrikleri
  riskMetrics: {
    diversificationScore: number; // 0-100
    concentrationRisk: 'low' | 'medium' | 'high';
    volatilityRisk: 'low' | 'medium' | 'high';
    liquidityRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high' | 'very_high';
  };

  // Performans özeti
  topPerformers: { symbol: string; profitPercent: number }[];
  worstPerformers: { symbol: string; profitPercent: number }[];

  // Öneriler
  recommendations: string[];
  warnings: string[];

  calculatedAt: Date;
}

// Sektör Eşikleri Ayarları
export interface SectorThresholds {
  sectorName: string;
  peRatioLow: number; // Bu altı ucuz
  peRatioHigh: number; // Bu üstü pahalı
  pbRatioLow: number;
  pbRatioHigh: number;
  roeGood: number; // Bu üstü iyi
  roeBad: number; // Bu altı kötü
  profitMarginGood: number;
  profitMarginBad: number;
}

// Varsayılan BIST Sektör Eşikleri
export const DEFAULT_SECTOR_THRESHOLDS: Record<string, SectorThresholds> = {
  'Bankacılık': {
    sectorName: 'Bankacılık',
    peRatioLow: 4,
    peRatioHigh: 8,
    pbRatioLow: 0.4,
    pbRatioHigh: 1.2,
    roeGood: 15,
    roeBad: 8,
    profitMarginGood: 25,
    profitMarginBad: 10,
  },
  'Holding': {
    sectorName: 'Holding',
    peRatioLow: 5,
    peRatioHigh: 12,
    pbRatioLow: 0.6,
    pbRatioHigh: 1.5,
    roeGood: 12,
    roeBad: 5,
    profitMarginGood: 15,
    profitMarginBad: 5,
  },
  'Demir Çelik': {
    sectorName: 'Demir Çelik',
    peRatioLow: 4,
    peRatioHigh: 10,
    pbRatioLow: 0.5,
    pbRatioHigh: 1.5,
    roeGood: 15,
    roeBad: 5,
    profitMarginGood: 10,
    profitMarginBad: 3,
  },
  'Havacılık': {
    sectorName: 'Havacılık',
    peRatioLow: 6,
    peRatioHigh: 15,
    pbRatioLow: 1.0,
    pbRatioHigh: 3.0,
    roeGood: 20,
    roeBad: 10,
    profitMarginGood: 8,
    profitMarginBad: 2,
  },
  'Telekomünikasyon': {
    sectorName: 'Telekomünikasyon',
    peRatioLow: 8,
    peRatioHigh: 18,
    pbRatioLow: 0.8,
    pbRatioHigh: 2.0,
    roeGood: 12,
    roeBad: 5,
    profitMarginGood: 12,
    profitMarginBad: 5,
  },
  'Perakende': {
    sectorName: 'Perakende',
    peRatioLow: 10,
    peRatioHigh: 25,
    pbRatioLow: 2.0,
    pbRatioHigh: 6.0,
    roeGood: 20,
    roeBad: 10,
    profitMarginGood: 5,
    profitMarginBad: 1,
  },
  'Enerji': {
    sectorName: 'Enerji',
    peRatioLow: 6,
    peRatioHigh: 14,
    pbRatioLow: 0.8,
    pbRatioHigh: 2.0,
    roeGood: 12,
    roeBad: 5,
    profitMarginGood: 10,
    profitMarginBad: 3,
  },
  'Otomotiv': {
    sectorName: 'Otomotiv',
    peRatioLow: 5,
    peRatioHigh: 12,
    pbRatioLow: 1.0,
    pbRatioHigh: 3.0,
    roeGood: 18,
    roeBad: 8,
    profitMarginGood: 8,
    profitMarginBad: 3,
  },
  'Teknoloji': {
    sectorName: 'Teknoloji',
    peRatioLow: 15,
    peRatioHigh: 35,
    pbRatioLow: 3.0,
    pbRatioHigh: 8.0,
    roeGood: 20,
    roeBad: 10,
    profitMarginGood: 15,
    profitMarginBad: 5,
  },
  'default': {
    sectorName: 'Genel',
    peRatioLow: 8,
    peRatioHigh: 20,
    pbRatioLow: 1.0,
    pbRatioHigh: 3.0,
    roeGood: 15,
    roeBad: 5,
    profitMarginGood: 10,
    profitMarginBad: 3,
  },
}

export interface DataSourceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number | null;
  errorMessage?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  dataSources: DataSourceHealth[];
  timestamp: Date;
}

export interface ApiConfig {
  finnetApiKey?: string;
  matriksApiKey?: string;
  bistApiKey?: string;
}
