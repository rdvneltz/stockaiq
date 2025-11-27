import { Router } from 'express';
import { authenticateToken } from '../utils/auth';
import SentimentData from '../models/SentimentData';

const router = Router();

router.get('/:symbol', authenticateToken, async (req, res, next) => {
  try {
    const sentiments = await SentimentData.find({ symbol: req.params.symbol })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json({ success: true, data: sentiments });
  } catch (error) {
    next(error);
  }
});

export default router;
