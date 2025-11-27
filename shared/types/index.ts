// Shared TypeScript types for both frontend and backend

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  lastUpdate: Date;
}

export interface FinancialData {
  symbol: string;
  quarter: string;
  year: number;

  // Balance Sheet
  currentAssets: number;
  nonCurrentAssets: number;
  totalAssets: number;

  // Current Assets breakdown
  cashAndEquivalents: number;
  tradeReceivables: number;
  inventories: number;

  // Non-Current Assets breakdown
  financialInvestments: number;
  tradeReceivablesLongTerm: number;
  investmentProperty: number;
  prepaidExpenses: number;
  deferredTaxAssets: number;
  tangibleAssets: number;
  intangibleAssets: number;

  // Liabilities
  shortTermLiabilities: number;
  longTermLiabilities: number;
  totalLiabilities: number;

  // Debt breakdown
  shortTermBankLoans: number;
  longTermBankLoans: number;

  // Equity
  equity: number;
  paidInCapital: number;

  // Income Statement
  revenue: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  ebitda: number;

  // Exports
  exports: number;

  lastUpdate: Date;
}

export interface TechnicalIndicators {
  symbol: string;
  timestamp: Date;

  // Moving Averages
  sma50: number;
  sma100: number;
  sma200: number;
  ema12: number;
  ema26: number;

  // Bollinger Bands
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;

  // RSI
  rsi: number;

  // MACD
  macd: number;
  macdSignal: number;
  macdHistogram: number;

  // Support/Resistance
  support: number[];
  resistance: number[];

  // Volume
  volumeAvg20: number;
  volumeChange: number;
}

export interface Ratios {
  symbol: string;

  // Valuation Ratios
  pb: number; // Price to Book
  pe: number; // Price to Earnings
  ps: number; // Price to Sales

  // Profitability Ratios
  roe: number; // Return on Equity
  roa: number; // Return on Assets
  profitMargin: number;
  grossMargin: number;

  // Leverage Ratios
  debtToEquity: number;
  debtToAssets: number;
  currentRatio: number;
  quickRatio: number;

  // Efficiency Ratios
  assetTurnover: number;
  inventoryTurnover: number;

  // Growth Rates
  revenueGrowth: number;
  profitGrowth: number;

  lastUpdate: Date;
}

export interface PriceHistory {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SentimentData {
  symbol: string;
  timestamp: Date;
  source: 'KAP' | 'TWITTER' | 'RSS' | 'NEWS';
  title: string;
  content: string;
  url?: string;
  sentiment: number; // -100 to 100
  confidence: number; // 0 to 1
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface TradingSignal {
  symbol: string;
  timestamp: Date;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0 to 100

  // Signal sources and their contributions
  fundamentalScore: number;
  technicalScore: number;
  sentimentScore: number;

  // Reasons
  reasons: SignalReason[];

  // Target prices
  targetPriceSector: number;
  targetPriceFibonacci: number;
  targetPriceSupport: number;

  // Risk
  stopLoss: number;
  riskRewardRatio: number;
}

export interface SignalReason {
  category: 'fundamental' | 'technical' | 'sentiment';
  criterion: string;
  value: any;
  threshold: any;
  impact: number; // contribution to signal strength
  description: string;
}

export interface StrategyConfig {
  id: string;
  name: string;
  description?: string;
  userId: string;

  // Fundamental criteria
  fundamental: {
    enabled: boolean;
    criteria: CriterionConfig[];
    logic: 'AND' | 'OR';
  };

  // Technical criteria
  technical: {
    enabled: boolean;
    criteria: CriterionConfig[];
    logic: 'AND' | 'OR';
  };

  // Sentiment criteria
  sentiment: {
    enabled: boolean;
    minScore: number;
    maxScore: number;
  };

  // Overall logic
  overallLogic: 'AND' | 'OR';

  // Signal thresholds
  buyThreshold: number;
  sellThreshold: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CriterionConfig {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
  enabled: boolean;
  weight: number; // contribution to overall score
}

export interface UserWatchlist {
  userId: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPortfolio {
  userId: string;
  positions: PortfolioPosition[];
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  purchaseDate: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  settings: UserSettings;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserSettings {
  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    telegram: boolean;
    sound: boolean;
  };

  // Display preferences
  theme: 'light' | 'dark' | 'auto';
  language: 'tr' | 'en';

  // Trading preferences
  defaultStrategy?: string;
  riskTolerance: 'low' | 'medium' | 'high';

  // Alert settings
  priceAlerts: boolean;
  sentimentAlerts: boolean;
  signalAlerts: boolean;
}

export interface NotificationPayload {
  userId: string;
  type: 'PRICE_ALERT' | 'SIGNAL' | 'SENTIMENT' | 'NEWS';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
}

export interface SectorData {
  sector: string;
  avgPB: number;
  avgPE: number;
  avgROE: number;
  avgDebtToEquity: number;
  marketCapTotal: number;
  stockCount: number;
  performance1D: number;
  performance1W: number;
  performance1M: number;
}

export interface ComparisonResult {
  stock: Stock;
  financials: FinancialData;
  ratios: Ratios;
  technical: TechnicalIndicators;
  sectorAvg: SectorData;
  vsMarket: {
    pb: number;
    pe: number;
    roe: number;
    debtToEquity: number;
  };
  vsSector: {
    pb: number;
    pe: number;
    roe: number;
    debtToEquity: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
