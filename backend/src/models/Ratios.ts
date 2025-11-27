import mongoose, { Schema, Document } from 'mongoose';

export interface IRatios extends Document {
  symbol: string;
  pb: number;
  pe: number;
  ps: number;
  roe: number;
  roa: number;
  profitMargin: number;
  grossMargin: number;
  debtToEquity: number;
  debtToAssets: number;
  currentRatio: number;
  quickRatio: number;
  assetTurnover: number;
  inventoryTurnover: number;
  revenueGrowth: number;
  profitGrowth: number;
  lastUpdate: Date;
}

const RatiosSchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    pb: { type: Number, default: 0 },
    pe: { type: Number, default: 0 },
    ps: { type: Number, default: 0 },
    roe: { type: Number, default: 0 },
    roa: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    grossMargin: { type: Number, default: 0 },
    debtToEquity: { type: Number, default: 0 },
    debtToAssets: { type: Number, default: 0 },
    currentRatio: { type: Number, default: 0 },
    quickRatio: { type: Number, default: 0 },
    assetTurnover: { type: Number, default: 0 },
    inventoryTurnover: { type: Number, default: 0 },
    revenueGrowth: { type: Number, default: 0 },
    profitGrowth: { type: Number, default: 0 },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

RatiosSchema.index({ symbol: 1 });
RatiosSchema.index({ pb: 1 });
RatiosSchema.index({ pe: 1 });

export default mongoose.model<IRatios>('Ratios', RatiosSchema);
