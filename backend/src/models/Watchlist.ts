import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
  userId: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchlistSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    symbols: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

WatchlistSchema.index({ userId: 1 });

export default mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
