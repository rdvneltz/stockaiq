import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PriceHistorySchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    open: {
      type: Number,
      required: true,
      min: 0,
    },
    high: {
      type: Number,
      required: true,
      min: 0,
    },
    low: {
      type: Number,
      required: true,
      min: 0,
    },
    close: {
      type: Number,
      required: true,
      min: 0,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

PriceHistorySchema.index({ symbol: 1, timestamp: -1 });

export default mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
