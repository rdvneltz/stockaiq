import { Router } from 'express';
import { getAllStocks, getStockDetail, screenStocks } from '../controllers/stockController';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.get('/', authenticateToken, getAllStocks);
router.get('/:symbol', authenticateToken, getStockDetail);
router.post('/screen', authenticateToken, screenStocks);

export default router;
