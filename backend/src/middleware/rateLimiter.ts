import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60000, // 1 dakika
  max: 10,
  message: {
    success: false,
    error: 'Bu endpoint için çok fazla istek gönderdiniz. Lütfen 1 dakika bekleyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
