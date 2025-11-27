import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
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

const StockSchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    previousClose: {
      type: Number,
      required: true,
      min: 0,
    },
    change: {
      type: Number,
      required: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
    marketCap: {
      type: Number,
      required: true,
      min: 0,
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

StockSchema.index({ symbol: 1 });
StockSchema.index({ sector: 1 });
StockSchema.index({ marketCap: -1 });

export default mongoose.model<IStock>('Stock', StockSchema);
