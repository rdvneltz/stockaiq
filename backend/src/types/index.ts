export interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number | null;

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

  lastUpdated: Date;
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
