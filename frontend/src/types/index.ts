export interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number | null;

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

  fundamentals: {
    marketCap: number | null;
    pdDD: number | null;
    fk: number | null;
    fdFAVO: number | null;
    pdEBITDA: number | null;
    shares: number | null;
    paidCapital: number | null;
  };

  financials: {
    period: string | null;
    revenue: number | null;
    grossProfit: number | null;
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
  };

  analysis: {
    domesticSalesRatio: number | null;
    foreignSalesRatio: number | null;
    exportRatio: number | null;
    averageDividend: number | null;
  };

  historicalProfitability?: {
    year: string;
    netIncome: number;
    profitability: number;
  }[];

  lastUpdated: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  dataSources: {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    lastCheck: Date;
    responseTime: number | null;
    errorMessage?: string;
  }[];
  timestamp: Date;
}
