import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger';
import { StockData } from '../types';

class InvestingService {
  private readonly BASE_URL = 'https://tr.investing.com';
  private readonly STOCK_URL = `${this.BASE_URL}/equities`;

  /**
   * Investing.com'dan hisse verilerini çeker
   */
  async getStockData(symbol: string): Promise<Partial<StockData>> {
    logger.info(`Fetching data from Investing.com: ${symbol}`);

    try {
      // 1. Hisse URL'ini bul
      const stockUrl = this.buildStockUrl(symbol);

      // 2. Hisse sayfasını scrape et
      const data = await this.scrapeStockPage(stockUrl, symbol);

      logger.info(`Investing.com data fetched successfully: ${symbol}`);
      return data;

    } catch (error: any) {
      logger.error(`Investing.com scraping error for ${symbol}:`, error);
      return this.getEmptyData();
    }
  }

  /**
   * Hisse sembolünden Investing.com URL'i oluşturur
   * Örnek: THYAO -> https://tr.investing.com/equities/turk-hava-yollari
   */
  private buildStockUrl(symbol: string): string {
    // BIST hisse sembolleri için URL mapping
    // Not: Bu mapping elle veya API ile doldurulmalıdır
    const urlMap: Record<string, string> = {
      THYAO: 'turk-hava-yollari',
      GARAN: 'garanti-bankasi',
      AKBNK: 'akbank',
      EREGL: 'eregli-demir-celik',
      TUPRS: 'tupras',
      SAHOL: 'sabanci-holding',
      KCHOL: 'koc-holding',
      TCELL: 'turkcell',
      PETKM: 'petkim',
      PGSUS: 'pegasus',
      // Diğer hisseler eklenecek...
    };

    const urlSlug = urlMap[symbol.toUpperCase()];

    if (!urlSlug) {
      logger.warn(`Investing.com URL mapping not found for: ${symbol}`);
      // Varsayılan URL yapısını dene
      return `${this.STOCK_URL}/${symbol.toLowerCase()}`;
    }

    return `${this.STOCK_URL}/${urlSlug}`;
  }

  /**
   * Hisse sayfasını scrape eder
   */
  private async scrapeStockPage(url: string, symbol: string): Promise<Partial<StockData>> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'tr-TR,tr;q=0.9',
        },
      });

      const $ = cheerio.load(response.data);

      const data: Partial<StockData> = {
        symbol: symbol.toUpperCase(),
        companyName: this.extractCompanyName($) || symbol,

        priceData: {
          currentPrice: this.extractPrice($, 'last'),
          dayHigh: this.extractPrice($, 'high'),
          dayLow: this.extractPrice($, 'low'),
          dayAverage: null,
          week1High: this.extractPrice($, '1w-high'),
          week1Low: this.extractPrice($, '1w-low'),
          day30High: null,
          day30Low: null,
          week52High: this.extractPrice($, '52w-high'),
          week52Low: this.extractPrice($, '52w-low'),
          week52Change: null,
          week52ChangeTL: null,
        },

        tradingData: {
          bid: this.extractPrice($, 'bid'),
          ask: this.extractPrice($, 'ask'),
          volume: this.extractVolume($),
          volumeTL: null,
          lotSize: null,
          dailyChange: this.extractChange($),
          dailyChangePercent: this.extractChangePercent($),
          dailyOpen: this.extractPrice($, 'open'),
        },

        fundamentals: {
          marketCap: this.extractMarketCap($),
          pdDD: this.extractRatio($, 'PD/DD'),
          fk: this.extractRatio($, 'F/K'),
          fdFAVO: null,
          pdEBITDA: null,
          shares: null,
          paidCapital: null,
        },

        lastUpdated: new Date(),
      };

      return data;

    } catch (error: any) {
      logger.error(`Investing.com page scraping error:`, error);
      return this.getEmptyData();
    }
  }

  /**
   * Şirket adını çıkarır
   */
  private extractCompanyName($: cheerio.CheerioAPI): string | null {
    try {
      return $('h1').first().text().trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Fiyat verilerini çıkarır
   */
  private extractPrice($: cheerio.CheerioAPI, type: string): number | null {
    try {
      const selector = `[data-test="${type}"]`;
      const value = $(selector).text().trim();
      return this.parseNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Hacim verilerini çıkarır
   */
  private extractVolume($: cheerio.CheerioAPI): number | null {
    try {
      const value = $('[data-test="volume"]').text().trim();
      return this.parseNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Günlük değişimi çıkarır
   */
  private extractChange($: cheerio.CheerioAPI): number | null {
    try {
      const value = $('[data-test="change"]').text().trim();
      return this.parseNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Günlük yüzde değişimini çıkarır
   */
  private extractChangePercent($: cheerio.CheerioAPI): number | null {
    try {
      const value = $('[data-test="change-percent"]').text().trim();
      return this.parseNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Piyasa değerini çıkarır
   */
  private extractMarketCap($: cheerio.CheerioAPI): number | null {
    try {
      const value = $('dt:contains("Piyasa Değeri")').next('dd').text().trim();
      return this.parseNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Finansal oranları çıkarır
   */
  private extractRatio($: cheerio.CheerioAPI, label: string): number | null {
    try {
      const value = $(`dt:contains("${label}")`).next('dd').text().trim();
      return this.parseNumber(value);
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
      // M = Milyon, B = Milyar gibi kısaltmaları işle
      let multiplier = 1;
      let cleaned = value.toUpperCase();

      if (cleaned.includes('B') || cleaned.includes('MİLYAR')) {
        multiplier = 1_000_000_000;
        cleaned = cleaned.replace(/[BMİLYAR]/gi, '');
      } else if (cleaned.includes('M') || cleaned.includes('MİLYON')) {
        multiplier = 1_000_000;
        cleaned = cleaned.replace(/[MMİLYON]/gi, '');
      } else if (cleaned.includes('K') || cleaned.includes('BİN')) {
        multiplier = 1_000;
        cleaned = cleaned.replace(/[KBİN]/gi, '');
      }

      // Türkçe sayı formatını temizle
      cleaned = cleaned
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
        .trim();

      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number * multiplier;
    } catch {
      return null;
    }
  }

  /**
   * Boş veri objesi döndürür
   */
  private getEmptyData(): Partial<StockData> {
    return {
      priceData: {
        currentPrice: null,
        dayHigh: null,
        dayLow: null,
        dayAverage: null,
        week1High: null,
        week1Low: null,
        day30High: null,
        day30Low: null,
        week52High: null,
        week52Low: null,
        week52Change: null,
        week52ChangeTL: null,
      },
      tradingData: {
        bid: null,
        ask: null,
        volume: null,
        volumeTL: null,
        lotSize: null,
        dailyChange: null,
        dailyChangePercent: null,
        dailyOpen: null,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Health check - Investing.com'un erişilebilir olup olmadığını kontrol eder
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
      logger.debug(`Investing.com health check: OK (${responseTime}ms)`);
      return { status: true, responseTime };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Investing.com health check failed:', error);
      return { status: false, responseTime, error: error.message };
    }
  }
}

export default new InvestingService();
