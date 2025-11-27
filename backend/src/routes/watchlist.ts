import { Router } from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../controllers/watchlistController';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.get('/', authenticateToken, getWatchlist);
router.post('/', authenticateToken, addToWatchlist);
router.delete('/:symbol', authenticateToken, removeFromWatchlist);

export default router;
