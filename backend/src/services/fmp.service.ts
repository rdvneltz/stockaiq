import axios from 'axios';
import logger from '../utils/logger';
import { StockData } from '../types';

class FMPService {
  private readonly API_KEY = process.env.FMP_API_KEY;
  private readonly BASE_URL = 'https://financialmodelingprep.com/api/v3';
  private readonly enabled = !!this.API_KEY;

  async getFinancialStatements(symbol: string): Promise<Partial<StockData>> {
    if (!this.enabled) {
      logger.debug('FMP API key not configured');
      return {};
    }

    try {
      // Income Statement
      const incomeRes = await axios.get(`${this.BASE_URL}/income-statement/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 5000,
      });

      // Balance Sheet
      const balanceRes = await axios.get(`${this.BASE_URL}/balance-sheet-statement/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 5000,
      });

      // Key Metrics
      const metricsRes = await axios.get(`${this.BASE_URL}/key-metrics/${symbol}`, {
        params: { apikey: this.API_KEY },
        timeout: 5000,
      }).catch(() => ({ data: [] }));

      const income = incomeRes.data[0] || {};
      const balance = balanceRes.data[0] || {};
      const metrics = metricsRes.data[0] || {};

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
      logger.error(`FMP error for ${symbol}:`, error.message);
      return {};
    }
  }

  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    if (!this.enabled) {
      return { status: false, responseTime: 0, error: 'API key not configured' };
    }

    const startTime = Date.now();
    try {
      await axios.get(`${this.BASE_URL}/quote/AAPL`, {
        params: { apikey: this.API_KEY },
        timeout: 5000,
      });

      return { status: true, responseTime: Date.now() - startTime };
    } catch (error: any) {
      return { status: false, responseTime: Date.now() - startTime, error: error.message };
    }
  }
}

export default new FMPService();
