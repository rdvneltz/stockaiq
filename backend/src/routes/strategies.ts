import { Router } from 'express';
import { getStrategies, createStrategy, updateStrategy, deleteStrategy } from '../controllers/strategyController';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.get('/', authenticateToken, getStrategies);
router.post('/', authenticateToken, createStrategy);
router.put('/:id', authenticateToken, updateStrategy);
router.delete('/:id', authenticateToken, deleteStrategy);

export default router;
