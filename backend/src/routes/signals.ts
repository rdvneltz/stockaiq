import { Router } from 'express';
import { authenticateToken } from '../utils/auth';
import TradingSignal from '../models/TradingSignal';

const router = Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const signals = await TradingSignal.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data: signals });
  } catch (error) {
    next(error);
  }
});

router.get('/:symbol', authenticateToken, async (req, res, next) => {
  try {
    const signal = await TradingSignal.findOne({ symbol: req.params.symbol });
    res.json({ success: true, data: signal });
  } catch (error) {
    next(error);
  }
});

export default router;
