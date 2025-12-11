import mongoose from 'mongoose';
import logger from './logger';

class Database {
  private connected = false;

  async connect(): Promise<void> {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      logger.warn('MongoDB URI not configured. System will work with in-memory cache only.');
      return;
    }

    if (this.connected) {
      logger.debug('MongoDB already connected');
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI);
      this.connected = true;
      logger.info('✅ MongoDB connected successfully');
    } catch (error: any) {
      logger.error('❌ MongoDB connection failed:', error.message);
      logger.warn('System will continue with in-memory cache only');
    }
  }

  isConnected(): boolean {
    return this.connected && mongoose.connection.readyState === 1;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await mongoose.disconnect();
      this.connected = false;
      logger.info('MongoDB disconnected');
    }
  }
}

export default new Database();
