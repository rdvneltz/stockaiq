import mongoose, { Schema, Document } from 'mongoose';

interface IPortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  purchaseDate: Date;
}

export interface IPortfolio extends Document {
  userId: string;
  positions: IPortfolioPosition[];
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioPositionSchema = new Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  averagePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  profitLoss: {
    type: Number,
    default: 0,
  },
  profitLossPercent: {
    type: Number,
    default: 0,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
});

const PortfolioSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    positions: [PortfolioPositionSchema],
    totalValue: {
      type: Number,
      default: 0,
    },
    totalProfitLoss: {
      type: Number,
      default: 0,
    },
    totalProfitLossPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

PortfolioSchema.index({ userId: 1 });

export default mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
