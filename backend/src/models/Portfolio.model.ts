import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolioStock {
  symbol: string;
  quantity: number;
  avgCost: number;
  addedAt: Date;
  notes?: string;
}

export interface IPortfolio extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  stocks: IPortfolioStock[];
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioStockSchema = new Schema({
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Number, required: true, min: 0 },
  avgCost: { type: Number, required: true, min: 0 },
  addedAt: { type: Date, default: Date.now },
  notes: { type: String, default: null },
});

const PortfolioSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 50 },
  description: { type: String, maxlength: 200 },
  stocks: [PortfolioStockSchema],
}, {
  timestamps: true,
});

// Kullanıcı başına maksimum 10 portfolio
PortfolioSchema.index({ userId: 1 });

// Kullanıcı + isim kombinasyonu unique olmalı
PortfolioSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
