import winston from 'winston';

const transports: winston.transport[] = [];

// File logging sadece local'de (production Vercel read-only filesystem)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'stockaiq-backend' },
  transports,
});

// Console logging her zaman (Vercel logs için gerekli)
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      process.env.NODE_ENV !== 'production' ? winston.format.colorize() : winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    ),
  })
);

export default logger;
