import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { AuthRequest } from './auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı. Lütfen giriş yapın.',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };

      // Check if user is admin
      if (decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Bu işlem için admin yetkisi gereklidir',
        });
      }

      req.userId = decoded.userId;
      req.userEmail = decoded.email;

      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş token',
      });
    }
  } catch (error) {
    logger.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Kimlik doğrulama hatası',
    });
  }
};
