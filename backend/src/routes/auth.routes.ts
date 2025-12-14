import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.model';
import logger from '../utils/logger';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token 7 gün geçerli

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, şifre ve kullanıcı adı gereklidir',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kayıtlı',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if this is the superadmin email
    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL?.toLowerCase();
    const isSuperAdmin = email.toLowerCase() === SUPERADMIN_EMAIL;

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username.trim(),
      favorites: [],
      role: isSuperAdmin ? 'admin' : 'user',
      approved: isSuperAdmin, // Superadmin otomatik onaylı
    });

    await user.save();

    // Generate JWT token (only if approved)
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`New user registered: ${email} (approved: ${user.approved}, role: ${user.role})`);

    res.status(201).json({
      success: true,
      message: isSuperAdmin ? 'Kayıt başarılı' : 'Kayıt başarılı. Hesabınız admin onayı bekliyor.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          favorites: user.favorites,
          role: user.role,
          approved: user.approved,
        },
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında bir hata oluştu',
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre gereklidir',
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı',
      });
    }

    // Check if approved
    if (!user.approved) {
      return res.status(403).json({
        success: false,
        message: 'Hesabınız henüz admin tarafından onaylanmadı. Lütfen bekleyin.',
        pending: true,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          favorites: user.favorites,
          role: user.role,
          approved: user.approved,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş sırasında bir hata oluştu',
    });
  }
});

// Get current user info (requires auth)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          favorites: user.favorites,
        },
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Geçersiz token',
    });
  }
});

// Update favorites (requires auth)
router.post('/favorites', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    const { favorites } = req.body;
    if (!Array.isArray(favorites)) {
      return res.status(400).json({
        success: false,
        message: 'Favorites dizisi gereklidir',
      });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { favorites },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Favoriler güncellendi',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          favorites: user.favorites,
        },
      },
    });
  } catch (error) {
    logger.error('Update favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Favoriler güncellenirken hata oluştu',
    });
  }
});

// ========== ADMIN ROUTES ==========

// Get pending users (admin only)
router.get('/admin/pending', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const pendingUsers = await User.find({ approved: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users: pendingUsers.map(user => ({
          id: user._id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen kullanıcılar alınırken hata oluştu',
    });
  }
});

// Get all users (admin only)
router.get('/admin/users', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const allUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users: allUsers.map(user => ({
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          approved: user.approved,
          createdAt: user.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar alınırken hata oluştu',
    });
  }
});

// Approve user (admin only)
router.post('/admin/approve/:userId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { approved: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    logger.info(`User approved by admin: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı onaylandı',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          approved: user.approved,
        },
      },
    });
  } catch (error) {
    logger.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı onaylanırken hata oluştu',
    });
  }
});

// Reject user (admin only)
router.delete('/admin/reject/:userId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    logger.info(`User rejected and deleted by admin: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı reddedildi ve silindi',
    });
  } catch (error) {
    logger.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı reddedilirken hata oluştu',
    });
  }
});

// EMERGENCY: Approve user by email (protected endpoint)
// Secret must be set via EMERGENCY_SECRET environment variable
router.post('/emergency-approve', async (req: Request, res: Response) => {
  try {
    const { email, secretKey } = req.body;
    const envSecret = process.env.EMERGENCY_SECRET;

    // Environment variable zorunlu
    if (!envSecret) {
      logger.warn('Emergency approve attempt but EMERGENCY_SECRET not set');
      return res.status(503).json({
        success: false,
        message: 'Bu endpoint şu an kullanılamıyor',
      });
    }

    // Secret kontrolü (env variable'dan)
    if (!secretKey || secretKey !== envSecret) {
      logger.warn(`Invalid emergency approve attempt for: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid secret key',
      });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { approved: true, role: 'admin' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    logger.warn(`⚠️ EMERGENCY APPROVAL: ${user.email} approved as admin`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı admin olarak onaylandı',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          approved: user.approved,
        },
      },
    });
  } catch (error) {
    logger.error('Emergency approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Onaylama sırasında hata oluştu',
    });
  }
});

export default router;
