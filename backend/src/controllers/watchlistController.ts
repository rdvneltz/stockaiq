import { Response, NextFunction } from 'express';
import { AuthRequest } from '../utils/auth';
import Watchlist from '../models/Watchlist';

export const getWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user!.userId });
    res.json({ success: true, data: watchlist || { symbols: [] } });
  } catch (error) {
    next(error);
  }
};

export const addToWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.body;
    const watchlist = await Watchlist.findOneAndUpdate(
      { userId: req.user!.userId },
      { $addToSet: { symbols: symbol } },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
};

export const removeFromWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const watchlist = await Watchlist.findOneAndUpdate(
      { userId: req.user!.userId },
      { $pull: { symbols: symbol } },
      { new: true }
    );
    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
};
