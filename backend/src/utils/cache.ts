import NodeCache from 'node-cache';
import logger from './logger';

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '15') * 60; // Dakika -> Saniye

class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL,
      checkperiod: 120,
      useClones: false,
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache expired: ${key}`);
    });
  }

  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
      } else {
        logger.debug(`Cache miss: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error(`Cache get error: ${key}`, error);
      return undefined;
    }
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || CACHE_TTL);
      if (success) {
        logger.debug(`Cache set: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error(`Cache set error: ${key}`, error);
      return false;
    }
  }

  del(key: string): number {
    try {
      return this.cache.del(key);
    } catch (error) {
      logger.error(`Cache delete error: ${key}`, error);
      return 0;
    }
  }

  flush(): void {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  getStats() {
    return this.cache.getStats();
  }
}

export default new CacheManager();
