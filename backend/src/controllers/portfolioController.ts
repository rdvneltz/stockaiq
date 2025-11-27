import { Response, NextFunction } from 'express';
import { AuthRequest } from '../utils/auth';
import Portfolio from '../models/Portfolio';

export const getPortfolio = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user!.userId });
    res.json({ success: true, data: portfolio || { positions: [], totalValue: 0 } });
  } catch (error) {
    next(error);
  }
};

export const addPosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { symbol, quantity, averagePrice } = req.body;
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: req.user!.userId },
      {
        $push: {
          positions: {
            symbol,
            quantity,
            averagePrice,
            currentPrice: averagePrice,
            profitLoss: 0,
            profitLossPercent: 0,
            purchaseDate: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: portfolio });
  } catch (error) {
    next(error);
  }
};

export const removePosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: req.user!.userId },
      { $pull: { positions: { symbol } } },
      { new: true }
    );
    res.json({ success: true, data: portfolio });
  } catch (error) {
    next(error);
  }
};
