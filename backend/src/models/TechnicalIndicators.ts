import mongoose, { Schema, Document } from 'mongoose';

export interface ITechnicalIndicators extends Document {
  symbol: string;
  timestamp: Date;
  sma50: number;
  sma100: number;
  sma200: number;
  ema12: number;
  ema26: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  support: number[];
  resistance: number[];
  volumeAvg20: number;
  volumeChange: number;
}

const TechnicalIndicatorsSchema: Schema = new Schema(
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
    sma50: { type: Number, default: 0 },
    sma100: { type: Number, default: 0 },
    sma200: { type: Number, default: 0 },
    ema12: { type: Number, default: 0 },
    ema26: { type: Number, default: 0 },
    bollingerUpper: { type: Number, default: 0 },
    bollingerMiddle: { type: Number, default: 0 },
    bollingerLower: { type: Number, default: 0 },
    rsi: { type: Number, default: 50, min: 0, max: 100 },
    macd: { type: Number, default: 0 },
    macdSignal: { type: Number, default: 0 },
    macdHistogram: { type: Number, default: 0 },
    support: [{ type: Number }],
    resistance: [{ type: Number }],
    volumeAvg20: { type: Number, default: 0 },
    volumeChange: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

TechnicalIndicatorsSchema.index({ symbol: 1, timestamp: -1 });

export default mongoose.model<ITechnicalIndicators>('TechnicalIndicators', TechnicalIndicatorsSchema);
