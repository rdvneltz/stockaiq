import mongoose, { Schema, Document } from 'mongoose';

interface ISignalReason {
  category: 'fundamental' | 'technical' | 'sentiment';
  criterion: string;
  value: any;
  threshold: any;
  impact: number;
  description: string;
}

export interface ITradingSignal extends Document {
  symbol: string;
  timestamp: Date;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  fundamentalScore: number;
  technicalScore: number;
  sentimentScore: number;
  reasons: ISignalReason[];
  targetPriceSector: number;
  targetPriceFibonacci: number;
  targetPriceSupport: number;
  stopLoss: number;
  riskRewardRatio: number;
}

const TradingSignalSchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL', 'HOLD'],
    },
    strength: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    fundamentalScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    technicalScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sentimentScore: {
      type: Number,
      default: 0,
      min: -100,
      max: 100,
    },
    reasons: [
      {
        category: {
          type: String,
          enum: ['fundamental', 'technical', 'sentiment'],
        },
        criterion: String,
        value: Schema.Types.Mixed,
        threshold: Schema.Types.Mixed,
        impact: Number,
        description: String,
      },
    ],
    targetPriceSector: { type: Number, default: 0 },
    targetPriceFibonacci: { type: Number, default: 0 },
    targetPriceSupport: { type: Number, default: 0 },
    stopLoss: { type: Number, default: 0 },
    riskRewardRatio: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

TradingSignalSchema.index({ symbol: 1, timestamp: -1 });
TradingSignalSchema.index({ type: 1, strength: -1 });

export default mongoose.model<ITradingSignal>('TradingSignal', TradingSignalSchema);
