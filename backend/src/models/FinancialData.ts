import mongoose, { Schema, Document } from 'mongoose';

export interface IFinancialData extends Document {
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

const FinancialDataSchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    quarter: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    currentAssets: { type: Number, default: 0 },
    nonCurrentAssets: { type: Number, default: 0 },
    totalAssets: { type: Number, default: 0 },
    cashAndEquivalents: { type: Number, default: 0 },
    tradeReceivables: { type: Number, default: 0 },
    inventories: { type: Number, default: 0 },
    financialInvestments: { type: Number, default: 0 },
    tradeReceivablesLongTerm: { type: Number, default: 0 },
    investmentProperty: { type: Number, default: 0 },
    prepaidExpenses: { type: Number, default: 0 },
    deferredTaxAssets: { type: Number, default: 0 },
    tangibleAssets: { type: Number, default: 0 },
    intangibleAssets: { type: Number, default: 0 },
    shortTermLiabilities: { type: Number, default: 0 },
    longTermLiabilities: { type: Number, default: 0 },
    totalLiabilities: { type: Number, default: 0 },
    shortTermBankLoans: { type: Number, default: 0 },
    longTermBankLoans: { type: Number, default: 0 },
    equity: { type: Number, default: 0 },
    paidInCapital: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    operatingProfit: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    ebitda: { type: Number, default: 0 },
    exports: { type: Number, default: 0 },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

FinancialDataSchema.index({ symbol: 1, year: -1, quarter: -1 });
FinancialDataSchema.index({ symbol: 1, lastUpdate: -1 });

export default mongoose.model<IFinancialData>('FinancialData', FinancialDataSchema);
