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

export default api;
