import mongoose, { Schema, Document } from 'mongoose';

export interface ISentimentData extends Document {
  symbol: string;
  timestamp: Date;
  source: 'KAP' | 'TWITTER' | 'RSS' | 'NEWS';
  title: string;
  content: string;
  url?: string;
  sentiment: number;
  confidence: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

const SentimentDataSchema: Schema = new Schema(
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
    source: {
      type: String,
      required: true,
      enum: ['KAP', 'TWITTER', 'RSS', 'NEWS'],
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    url: String,
    sentiment: {
      type: Number,
      required: true,
      min: -100,
      max: 100,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    importance: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
  },
  {
    timestamps: true,
  }
);

SentimentDataSchema.index({ symbol: 1, timestamp: -1 });
SentimentDataSchema.index({ importance: 1, timestamp: -1 });

export default mongoose.model<ISentimentData>('SentimentData', SentimentDataSchema);
