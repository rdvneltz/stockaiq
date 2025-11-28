import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import connectDB from './config/database';
import redisClient from './config/redis';
import logger from './utils/logger';
import errorHandler from './utils/errorHandler';

// Routes
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import strategyRoutes from './routes/strategies';
import watchlistRoutes from './routes/watchlist';
import portfolioRoutes from './routes/portfolio';
import signalRoutes from './routes/signals';
import sentimentRoutes from './routes/sentiment';

// Services
import PriceUpdateService from './services/data-collector/priceUpdate';
import DataCollectorService from './services/data-collector';
import TechnicalAnalysisService from './services/technical-analysis';
import SentimentAnalysisService from './services/sentiment';
import StrategyEngineService from './services/strategy-engine';
import NotificationService from './services/notifications';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/sentiment', sentimentRoutes);

// Root endpoint - redirect to frontend
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(frontendUrl);
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize services
let priceUpdateService: PriceUpdateService;
let dataCollectorService: DataCollectorService;
let technicalAnalysisService: TechnicalAnalysisService;
let sentimentAnalysisService: SentimentAnalysisService;
let strategyEngineService: StrategyEngineService;
let notificationService: NotificationService;

// Socket.IO connection
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe', (symbols: string[]) => {
    logger.info(`Client ${socket.id} subscribed to: ${symbols.join(', ')}`);
    socket.join(symbols);
  });

  socket.on('unsubscribe', (symbols: string[]) => {
    logger.info(`Client ${socket.id} unsubscribed from: ${symbols.join(', ')}`);
    symbols.forEach(symbol => socket.leave(symbol));
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    logger.info('Connected to MongoDB and Redis');

    // Initialize services
    notificationService = new NotificationService(io);
    priceUpdateService = new PriceUpdateService(io, redisClient);
    dataCollectorService = new DataCollectorService(redisClient);
    technicalAnalysisService = new TechnicalAnalysisService();
    sentimentAnalysisService = new SentimentAnalysisService(notificationService);
    strategyEngineService = new StrategyEngineService(notificationService);

    // Start services
    await priceUpdateService.start();
    await dataCollectorService.start();
    await sentimentAnalysisService.start();
    await strategyEngineService.start();

    logger.info('All services started successfully');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🔌 WebSocket server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    await redisClient.quit();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(async () => {
    await redisClient.quit();
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export { io };
