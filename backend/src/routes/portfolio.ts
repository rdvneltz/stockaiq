import { Router } from 'express';
import { getPortfolio, addPosition, removePosition } from '../controllers/portfolioController';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.get('/', authenticateToken, getPortfolio);
router.post('/', authenticateToken, addPosition);
router.delete('/:symbol', authenticateToken, removePosition);

export default router;
