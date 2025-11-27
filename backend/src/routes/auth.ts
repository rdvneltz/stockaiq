import { Router } from 'express';
import { register, login, getProfile, updateSettings } from '../controllers/authController';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.put('/settings', authenticateToken, updateSettings);

export default router;
