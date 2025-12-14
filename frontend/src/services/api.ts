import axios from 'axios';
import { StockData, SystemHealth } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 saniyeye düşürüldü - daha hızlı fallback
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sadece gerçek hatalar için log (timeout ve network hataları için uyarı)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      console.warn('API Timeout/Network:', error.message);
    } else {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

export const stockApi = {
  /**
   * Tek bir hisse için veri çeker
   */
  getStock: async (symbol: string): Promise<StockData> => {
    const response = await api.get(`/stocks/${symbol}`);
    return response.data.data;
  },

  /**
   * Birden fazla hisse için veri çeker
   */
  getMultipleStocks: async (symbols: string[]): Promise<StockData[]> => {
    const response = await api.post('/stocks/multiple', { symbols });
    return response.data.data;
  },

  /**
   * Hisse cache'ini temizler
   */
  clearStockCache: async (symbol: string): Promise<void> => {
    await api.delete(`/stocks/${symbol}/cache`);
  },

  /**
   * Tüm cache'i temizler
   */
  clearAllCache: async (): Promise<void> => {
    await api.delete('/stocks/cache/all');
  },
};

export const healthApi = {
  /**
   * Sistem sağlık durumunu getirir
   */
  getHealth: async (): Promise<SystemHealth> => {
    const response = await api.get('/health');
    return response.data.health;
  },

  /**
   * Yeni sağlık kontrolü yapar
   */
  checkHealth: async (): Promise<SystemHealth> => {
    const response = await api.get('/health/check');
    return response.data.health;
  },

  /**
   * Sağlık raporunu metin olarak getirir
   */
  getHealthReport: async (): Promise<string> => {
    const response = await api.get('/health/report');
    return response.data;
  },
};

export interface DatabaseStats {
  totalStocks: number;
  stocksWithoutPrice: number;
  stocksWithoutFinancials: number;
  oldestUpdate: string | null;
  newestUpdate: string | null;
  oldestSymbol: string | null;
  newestSymbol: string | null;
}

export const adminApi = {
  /**
   * Veritabanı istatistiklerini getirir
   */
  getStats: async (token: string): Promise<DatabaseStats> => {
    const response = await api.get('/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  /**
   * Tüm hisse verilerini siler (veritabanını sıfırlar)
   * DİKKAT: Bu işlem geri alınamaz!
   */
  resetDatabase: async (token: string): Promise<{ deletedCount: number; previousCount: number }> => {
    const response = await api.delete('/admin/database/stocks', {
      headers: { Authorization: `Bearer ${token}` },
      data: { confirm: 'DELETE_ALL_STOCKS' },
    });
    return response.data.data;
  },

  /**
   * Belirli bir hisseyi siler
   */
  deleteStock: async (token: string, symbol: string): Promise<void> => {
    await api.delete(`/admin/database/stocks/${symbol}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Güncelleme zamanlarını sıfırlar (veriyi silmeden yeniden çekilmesini sağlar)
   */
  resetTimestamps: async (
    token: string,
    category: 'all' | 'realtime' | 'daily' | 'quarterly' = 'all'
  ): Promise<{ modifiedCount: number }> => {
    const response = await api.post(
      '/admin/database/reset-timestamps',
      { category },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  },
};

export default api;
