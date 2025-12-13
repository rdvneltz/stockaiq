import axios from 'axios';
import logger from '../utils/logger';
import { StockData } from '../types';

class FMPService {
  private readonly API_KEY = process.env.FMP_API_KEY;
  private readonly BASE_URL = 'https://financialmodelingprep.com/api/v3';
  private enabled = !!this.API_KEY;
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 3;

  async getFinancialStatements(symbol: string): Promise<Partial<StockData>> {
    if (!this.enabled) {
      logger.debug('FMP API key not configured or service disabled');
      return {};
    }

    try {
      // Income Statement
      const incomeRes = await axios.get(`${this.BASE_URL}/income-statement/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 8000,
      });

      // Balance Sheet
      const balanceRes = await axios.get(`${this.BASE_URL}/balance-sheet-statement/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 8000,
      });

      // Key Metrics
      const metricsRes = await axios.get(`${this.BASE_URL}/key-metrics/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 8000,
      }).catch(() => ({ data: [] }));

      const income = incomeRes.data[0] || {};
      const balance = balanceRes.data[0] || {};
      const metrics = metricsRes.data[0] || {};

      // Başarılı - hata sayacını sıfırla
      this.consecutiveFailures = 0;

      return {
        financials: {
          period: income.date || null,
          revenue: income.revenue || null,
          grossProfit: income.grossProfit || null,
          netIncome: income.netIncome || null,
          profitability: null,
          grossProfitMargin: null,
          equity: balance.totalStockholdersEquity || null,
          currentAssets: balance.totalCurrentAssets || null,
          fixedAssets: balance.totalNonCurrentAssets || null,
          totalAssets: balance.totalAssets || null,
          shortTermLiabilities: balance.totalCurrentLiabilities || null,
          longTermLiabilities: balance.totalNonCurrentLiabilities || null,
          shortTermBankLoans: balance.shortTermDebt || null,
          longTermBankLoans: balance.longTermDebt || null,
          tradeReceivables: balance.netReceivables || null,
          financialInvestments: balance.cashAndCashEquivalents || null,
          investmentProperty: balance.propertyPlantEquipmentNet || null,
          prepaidExpenses: null,
          deferredTax: balance.deferredTaxLiabilitiesNonCurrent || null,
          totalDebt: null,
          netDebt: null,
          workingCapital: null,
        },

        fundamentals: {
          marketCap: metrics.marketCap || null,
          pdDD: metrics.pbRatio || null,
          fk: metrics.peRatio || null,
          fdFAVO: null,
          pdEBITDA: null,
          shares: balance.commonStock ? balance.commonStock / 0.01 : null, // Yaklaşık
          paidCapital: balance.commonStock || null,
          eps: income.eps || null,
          roe: metrics.roe || null,
          roa: metrics.returnOnTangibleAssets || null,
        },

        lastUpdated: new Date(),
      };

    } catch (error: any) {
      this.handleError(error, symbol);
      return {};
    }
  }

  private handleError(error: any, symbol: string): void {
    this.consecutiveFailures++;
    const errorMsg = error.response?.status
      ? `Status ${error.response.status}`
      : error.message;
    logger.warn(`FMP error for ${symbol} (${this.consecutiveFailures}/${this.MAX_FAILURES}): ${errorMsg}`);

    // 403 hatası = API key geçersiz veya limit aşıldı
    if (error.response?.status === 403) {
      logger.warn('FMP API key invalid or rate limit exceeded, disabling service');
      this.enabled = false;
    } else if (this.consecutiveFailures >= this.MAX_FAILURES) {
      logger.warn('FMP temporarily disabled due to consecutive failures');
      this.enabled = false;

      // 10 dakika sonra tekrar etkinleştir
      setTimeout(() => {
        this.enabled = !!this.API_KEY;
        this.consecutiveFailures = 0;
        logger.info('FMP service re-enabled after cooldown');
      }, 10 * 60 * 1000);
    }
  }

  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    if (!this.API_KEY) {
      return { status: true, responseTime: 0, error: 'API key not configured (optional service)' };
    }

    if (!this.enabled) {
      return { status: true, responseTime: 0, error: 'Temporarily disabled (cooling down)' };
    }

    const startTime = Date.now();
    try {
      await axios.get(`${this.BASE_URL}/quote/AAPL`, {
        params: { apikey: this.API_KEY },
        timeout: 8000,
      });

      return { status: true, responseTime: Date.now() - startTime };
    } catch (error: any) {
      const errorMsg = error.response?.status
        ? `Request failed with status code ${error.response.status}`
        : error.message;
      return { status: false, responseTime: Date.now() - startTime, error: errorMsg };
    }
  }

  resetService(): void {
    this.enabled = !!this.API_KEY;
    this.consecutiveFailures = 0;
    logger.info('FMP service manually reset');
  }
}

export default new FMPService();
