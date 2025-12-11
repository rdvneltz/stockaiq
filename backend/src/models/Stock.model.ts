import mongoose, { Schema, Document } from 'mongoose';

// Veri güncelleme kategorileri
export enum DataCategory {
  REALTIME = 'realtime',     // 10 saniye (fiyat, hacim)
  DAILY = 'daily',           // 24 saat (52H, market cap)
  QUARTERLY = 'quarterly',   // 30 gün (bilanço, finansallar)
  STATIC = 'static',         // Değişmez (şirket ismi)
}

export interface IStock extends Document {
  symbol: string;

  // Veri kategorilerine göre son güncelleme zamanları
  lastUpdated: {
    realtime: Date;    // Fiyat verileri
    daily: Date;       // Market cap, F/K, PD/DD
    quarterly: Date;   // Bilanço, finansallar
    static: Date;      // Şirket bilgileri
  };

  // Gerçek zamanlı veriler (her 10 saniye)
  realtimeData: {
    currentPrice: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    dayAverage: number | null;
    dailyOpen: number | null;
    dailyChange: number | null;
    dailyChangePercent: number | null;
    volume: number | null;
    volumeTL: number | null;
    bid: number | null;
    ask: number | null;
  };

  // Günlük veriler (her 24 saat)
  dailyData: {
    week52High: number | null;
    week52Low: number | null;
    week52Change: number | null;
    week52ChangeTL: number | null;
    week1High: number | null;
    week1Low: number | null;
    day30High: number | null;
    day30Low: number | null;
    marketCap: number | null;
    fk: number | null;           // F/K
    pdDD: number | null;         // PD/DD
    fdFAVO: number | null;
    pdEBITDA: number | null;
  };

  // Quarterly veriler (her 30 gün - bilanço & finansallar)
  quarterlyData: {
    period: string | null;
    revenue: number | null;
    grossProfit: number | null;
    grossProfitMargin: number | null;
    netIncome: number | null;
    profitability: number | null;
    equity: number | null;
    currentAssets: number | null;
    fixedAssets: number | null;
    totalAssets: number | null;
    shortTermLiabilities: number | null;
    longTermLiabilities: number | null;
    shortTermBankLoans: number | null;
    longTermBankLoans: number | null;
    tradeReceivables: number | null;
    financialInvestments: number | null;
    investmentProperty: number | null;
    prepaidExpenses: number | null;
    deferredTax: number | null;
    totalDebt: number | null;
    netDebt: number | null;
    workingCapital: number | null;
    eps: number | null;
    roe: number | null;
    roa: number | null;
    shares: number | null;
    paidCapital: number | null;

    // Liquidity & Leverage (bilanço bazlı)
    currentRatio: number | null;
    acidTestRatio: number | null;
    cashRatio: number | null;
    debtToEquity: number | null;
    debtToAssets: number | null;
    shortTermDebtRatio: number | null;
    longTermDebtRatio: number | null;
  };

  // Statik veriler (değişmez)
  staticData: {
    companyName: string;
    sector: string | null;
    industry: string | null;
    lotSize: number | null;
  };

  // Analiz verileri (her quarterly güncellemede yeniden hesaplanır)
  analysis: {
    domesticSalesRatio: number | null;
    foreignSalesRatio: number | null;
    exportRatio: number | null;
    averageDividend: number | null;
  };

  // Akıllı analiz (quarterly güncelleme)
  smartAnalysis: {
    overallScore: number;
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
    valuationScore: number;
    profitabilityScore: number;
    liquidityScore: number;
    leverageScore: number;
    strengths: string[];
    weaknesses: string[];
    warnings: string[];
    recommendations: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const StockSchema: Schema = new Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },

  lastUpdated: {
    realtime: { type: Date, default: () => new Date(0) },
    daily: { type: Date, default: () => new Date(0) },
    quarterly: { type: Date, default: () => new Date(0) },
    static: { type: Date, default: () => new Date(0) },
  },

  realtimeData: {
    currentPrice: { type: Number, default: null },
    dayHigh: { type: Number, default: null },
    dayLow: { type: Number, default: null },
    dayAverage: { type: Number, default: null },
    dailyOpen: { type: Number, default: null },
    dailyChange: { type: Number, default: null },
    dailyChangePercent: { type: Number, default: null },
    volume: { type: Number, default: null },
    volumeTL: { type: Number, default: null },
    bid: { type: Number, default: null },
    ask: { type: Number, default: null },
  },

  dailyData: {
    week52High: { type: Number, default: null },
    week52Low: { type: Number, default: null },
    week52Change: { type: Number, default: null },
    week52ChangeTL: { type: Number, default: null },
    week1High: { type: Number, default: null },
    week1Low: { type: Number, default: null },
    day30High: { type: Number, default: null },
    day30Low: { type: Number, default: null },
    marketCap: { type: Number, default: null },
    fk: { type: Number, default: null },
    pdDD: { type: Number, default: null },
    fdFAVO: { type: Number, default: null },
    pdEBITDA: { type: Number, default: null },
  },

  quarterlyData: {
    period: { type: String, default: null },
    revenue: { type: Number, default: null },
    grossProfit: { type: Number, default: null },
    grossProfitMargin: { type: Number, default: null },
    netIncome: { type: Number, default: null },
    profitability: { type: Number, default: null },
    equity: { type: Number, default: null },
    currentAssets: { type: Number, default: null },
    fixedAssets: { type: Number, default: null },
    totalAssets: { type: Number, default: null },
    shortTermLiabilities: { type: Number, default: null },
    longTermLiabilities: { type: Number, default: null },
    shortTermBankLoans: { type: Number, default: null },
    longTermBankLoans: { type: Number, default: null },
    tradeReceivables: { type: Number, default: null },
    financialInvestments: { type: Number, default: null },
    investmentProperty: { type: Number, default: null },
    prepaidExpenses: { type: Number, default: null },
    deferredTax: { type: Number, default: null },
    totalDebt: { type: Number, default: null },
    netDebt: { type: Number, default: null },
    workingCapital: { type: Number, default: null },
    eps: { type: Number, default: null },
    roe: { type: Number, default: null },
    roa: { type: Number, default: null },
    shares: { type: Number, default: null },
    paidCapital: { type: Number, default: null },
    currentRatio: { type: Number, default: null },
    acidTestRatio: { type: Number, default: null },
    cashRatio: { type: Number, default: null },
    debtToEquity: { type: Number, default: null },
    debtToAssets: { type: Number, default: null },
    shortTermDebtRatio: { type: Number, default: null },
    longTermDebtRatio: { type: Number, default: null },
  },

  staticData: {
    companyName: { type: String, required: true },
    sector: { type: String, default: null },
    industry: { type: String, default: null },
    lotSize: { type: Number, default: null },
  },

  analysis: {
    domesticSalesRatio: { type: Number, default: null },
    foreignSalesRatio: { type: Number, default: null },
    exportRatio: { type: Number, default: null },
    averageDividend: { type: Number, default: null },
  },

  smartAnalysis: {
    overallScore: { type: Number, default: 50 },
    rating: { type: String, default: 'Hold' },
    valuationScore: { type: Number, default: 50 },
    profitabilityScore: { type: Number, default: 50 },
    liquidityScore: { type: Number, default: 50 },
    leverageScore: { type: Number, default: 50 },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    warnings: [{ type: String }],
    recommendations: [{ type: String }],
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

// Index for faster queries (symbol already indexed via unique: true)
StockSchema.index({ 'lastUpdated.realtime': 1 });
StockSchema.index({ 'lastUpdated.daily': 1 });
StockSchema.index({ 'lastUpdated.quarterly': 1 });

export default mongoose.model<IStock>('Stock', StockSchema);
