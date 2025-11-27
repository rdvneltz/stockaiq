import { Request, Response, NextFunction } from 'express';
import Stock from '../models/Stock';
import FinancialData from '../models/FinancialData';
import Ratios from '../models/Ratios';
import TechnicalIndicators from '../models/TechnicalIndicators';
import SentimentData from '../models/SentimentData';
import TradingSignal from '../models/TradingSignal';
import PriceHistory from '../models/PriceHistory';

export const getAllStocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const total = await Stock.countDocuments();
    const stocks = await Stock.find().sort({ marketCap: -1 }).skip(skip).limit(limit);

    res.json({
      success: true,
      data: stocks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStockDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;

    const [stock, ratios, technical, financials, sentiments, signal, priceHistory] =
      await Promise.all([
        Stock.findOne({ symbol }),
        Ratios.findOne({ symbol }),
        TechnicalIndicators.findOne({ symbol }),
        FinancialData.find({ symbol }).sort({ year: -1, quarter: -1 }).limit(5),
        SentimentData.find({ symbol }).sort({ timestamp: -1 }).limit(20),
        TradingSignal.findOne({ symbol }),
        PriceHistory.find({ symbol }).sort({ timestamp: -1 }).limit(365),
      ]);

    res.json({
      success: true,
      data: {
        stock,
        ratios,
        technical,
        financials,
        sentiments,
        signal,
        priceHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const screenStocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filters } = req.body;

    // Build query based on filters
    const query: any = {};

    // Example filter implementation
    if (filters.pbMin !== undefined || filters.pbMax !== undefined) {
      const ratios = await Ratios.find({
        ...(filters.pbMin !== undefined && { pb: { $gte: filters.pbMin } }),
        ...(filters.pbMax !== undefined && { pb: { $lte: filters.pbMax } }),
      }).select('symbol');

      query.symbol = { $in: ratios.map(r => r.symbol) };
    }

    const stocks = await Stock.find(query).limit(100);

    res.json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    next(error);
  }
};
