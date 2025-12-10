import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger';
import { StockData } from '../types';

class KAPService {
  private readonly BASE_URL = 'https://www.kap.org.tr';
  private readonly SEARCH_URL = `${this.BASE_URL}/tr/bist-sirketler`;

  /**
   * KAP'tan şirket bilanço verilerini çeker
   * Not: KAP web scraping yöntemiyle veri çeker
   */
  async getFinancialData(symbol: string): Promise<Partial<StockData>> {
    logger.info(`Fetching financial data from KAP: ${symbol}`);

    try {
      // 1. Şirket sayfasını bul
      const companyUrl = await this.findCompanyUrl(symbol);

      if (!companyUrl) {
        logger.warn(`Company not found on KAP: ${symbol}`);
        return this.getEmptyFinancialData();
      }

      // 2. Finansal tabloları çek
      const financialData = await this.scrapeFinancialData(companyUrl);

      logger.info(`KAP financial data fetched successfully: ${symbol}`);
      return financialData;

    } catch (error: any) {
      logger.error(`KAP scraping error for ${symbol}:`, error);
      // Scraping hatası sistemsel hata değil, boş veri döndür
      return this.getEmptyFinancialData();
    }
  }

  /**
   * KAP'ta şirket URL'ini bulur
   */
  private async findCompanyUrl(symbol: string): Promise<string | null> {
    try {
      const response = await axios.get(this.SEARCH_URL, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Şirket listesinde sembol ara
      let companyUrl: string | null = null;

      $('table tbody tr').each((_, element) => {
        const row = $(element);
        const stockCode = row.find('td').first().text().trim();

        if (stockCode.toUpperCase() === symbol.toUpperCase()) {
          const link = row.find('a').attr('href');
          if (link) {
            companyUrl = `${this.BASE_URL}${link}`;
            return false; // Break loop
          }
        }
      });

      return companyUrl;

    } catch (error) {
      logger.error(`KAP company search error: ${symbol}`, error);
      return null;
    }
  }

  /**
   * Şirket sayfasından finansal verileri scrape eder
   */
  private async scrapeFinancialData(url: string): Promise<Partial<StockData>> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // KAP'tan çekilen finansal veriler
      // Not: KAP'ın yapısı değişirse bu selektorler güncellenmelidir
      const financials: Partial<StockData> = {
        financials: {
          period: this.extractValue($, 'Dönem'),
          revenue: this.parseNumber(this.extractValue($, 'Hasılat')),
          grossProfit: this.parseNumber(this.extractValue($, 'Brüt Kar')),
          netIncome: this.parseNumber(this.extractValue($, 'Net Kar')),
          profitability: this.parseNumber(this.extractValue($, 'Karlılık')),
          equity: this.parseNumber(this.extractValue($, 'Öz Sermaye')),
          currentAssets: this.parseNumber(this.extractValue($, 'Dönen Varlıklar')),
          fixedAssets: this.parseNumber(this.extractValue($, 'Duran Varlıklar')),
          totalAssets: this.parseNumber(this.extractValue($, 'Toplam Varlıklar')),
          shortTermLiabilities: this.parseNumber(this.extractValue($, 'Kısa Vadeli Yükümlülükler')),
          longTermLiabilities: this.parseNumber(this.extractValue($, 'Uzun Vadeli Yükümlülükler')),
          shortTermBankLoans: this.parseNumber(this.extractValue($, 'Kısa Vadeli Banka Kredisi')),
          longTermBankLoans: this.parseNumber(this.extractValue($, 'Uzun Vadeli Banka Kredisi')),
          tradeReceivables: this.parseNumber(this.extractValue($, 'Ticari Alacaklar')),
          financialInvestments: this.parseNumber(this.extractValue($, 'Finansal Yatırımlar')),
          investmentProperty: this.parseNumber(this.extractValue($, 'Yatırım Amaçlı Gayrimenkuller')),
          prepaidExpenses: this.parseNumber(this.extractValue($, 'Peşin Ödenmiş Giderler')),
          deferredTax: this.parseNumber(this.extractValue($, 'Ertelenmiş Vergi')),
        },

        fundamentals: {
          marketCap: null,
          pdDD: null,
          fk: null,
          fdFAVO: null,
          pdEBITDA: null,
          shares: this.parseNumber(this.extractValue($, 'İhraç Edilen Hisse Sayısı')),
          paidCapital: this.parseNumber(this.extractValue($, 'Ödenmiş Sermaye')),
        },

        lastUpdated: new Date(),
      };

      return financials;

    } catch (error) {
      logger.error('KAP scraping error:', error);
      return this.getEmptyFinancialData();
    }
  }

  /**
   * HTML'den değer çıkarır (örnek implementasyon)
   */
  private extractValue($: cheerio.CheerioAPI, label: string): string | null {
    try {
      // KAP'ın HTML yapısına göre özelleştirilmeli
      const value = $(`td:contains("${label}")`).next().text().trim();
      return value || null;
    } catch {
      return null;
    }
  }

  /**
   * String'i sayıya çevirir
   */
  private parseNumber(value: string | null): number | null {
    if (!value) return null;

    try {
      // Türkçe sayı formatını temizle (1.234.567,89 -> 1234567.89)
      const cleaned = value
        .replace(/\./g, '') // Binlik ayracı
        .replace(',', '.') // Ondalık ayracı
        .replace(/[^\d.-]/g, ''); // Sayı olmayan karakterleri kaldır

      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number;
    } catch {
      return null;
    }
  }

  /**
   * Boş finansal veri objesi döndürür
   */
  private getEmptyFinancialData(): Partial<StockData> {
    return {
      financials: {
        period: null,
        revenue: null,
        grossProfit: null,
        netIncome: null,
        profitability: null,
        equity: null,
        currentAssets: null,
        fixedAssets: null,
        totalAssets: null,
        shortTermLiabilities: null,
        longTermLiabilities: null,
        shortTermBankLoans: null,
        longTermBankLoans: null,
        tradeReceivables: null,
        financialInvestments: null,
        investmentProperty: null,
        prepaidExpenses: null,
        deferredTax: null,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Health check - KAP'ın erişilebilir olup olmadığını kontrol eder
   */
  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      await axios.get(this.BASE_URL, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const responseTime = Date.now() - startTime;
      logger.debug(`KAP health check: OK (${responseTime}ms)`);
      return { status: true, responseTime };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('KAP health check failed:', error);
      return { status: false, responseTime, error: error.message };
    }
  }
}

export default new KAPService();
