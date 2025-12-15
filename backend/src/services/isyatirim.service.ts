import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger';
import { StockData } from '../types';

// İş Yatırım cache - 24 saat geçerli
const isYatirimCache = new Map<string, { data: Partial<StockData>; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat

/**
 * İş Yatırım web sitesinden finansal veri çeken servis
 * Not: Bu servis İş Yatırım'ın dahili API endpoint'lerini kullanır
 * OPTİMİZASYON: 5 saniye timeout + 24 saat cache
 */
class IsYatirimService {
  private readonly BASE_URL = 'https://www.isyatirim.com.tr';

  // Financial statement endpoint
  private readonly FINANCIALS_URL = 'https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/MaliTablo';

  // Company fundamental data endpoint
  private readonly COMPANY_URL = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx';

  // Servis durumu
  private enabled = true;
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 5; // 5 hata sonrası geçici devre dışı

  /**
   * İş Yatırım'dan mali tablo verilerini çeker (CACHE + TIMEOUT ile)
   */
  async getFinancialStatements(symbol: string): Promise<Partial<StockData>> {
    const upperSymbol = symbol.toUpperCase();

    // Servis devre dışıysa boş döndür
    if (!this.enabled) {
      logger.debug(`İş Yatırım disabled, skipping ${upperSymbol}`);
      return this.getEmptyFinancialData();
    }

    // Önce cache'e bak
    const cached = isYatirimCache.get(upperSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.debug(`İş Yatırım cache HIT for ${upperSymbol}`);
      return cached.data;
    }

    logger.info(`Fetching financial statements from İş Yatırım: ${upperSymbol}`);

    try {
      // İş Yatırım'ın MaliTablo endpoint'inden veri çek
      const financialData = await this.fetchMaliTablo(upperSymbol);

      if (!financialData) {
        this.consecutiveFailures++;
        this.checkDisable();
        logger.warn(`No financial data from İş Yatırım for ${upperSymbol}`);
        return this.getEmptyFinancialData();
      }

      // Başarılı - cache'e kaydet
      isYatirimCache.set(upperSymbol, { data: financialData, timestamp: Date.now() });
      this.consecutiveFailures = 0;

      logger.info(`İş Yatırım financial data fetched and cached: ${upperSymbol}`);
      return financialData;

    } catch (error: any) {
      this.consecutiveFailures++;
      this.checkDisable();
      logger.error(`İş Yatırım fetch error for ${upperSymbol}:`, error.message);
      return this.getEmptyFinancialData();
    }
  }

  /**
   * Ardışık hata kontrolü - çok hata olursa geçici devre dışı bırak
   */
  private checkDisable(): void {
    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      this.enabled = false;
      logger.warn(`İş Yatırım temporarily disabled after ${this.consecutiveFailures} failures`);

      // 10 dakika sonra tekrar dene
      setTimeout(() => {
        this.enabled = true;
        this.consecutiveFailures = 0;
        logger.info('İş Yatırım re-enabled after cooldown');
      }, 10 * 60 * 1000);
    }
  }

  /**
   * MaliTablo endpoint'inden veri çeker (5 SANİYE TIMEOUT)
   */
  private async fetchMaliTablo(symbol: string): Promise<Partial<StockData> | null> {
    try {
      // Şirket kartı sayfasından mali tablo verilerini çek
      const url = `${this.COMPANY_URL}?hisse=${symbol}`;

      const response = await axios.get(url, {
        timeout: 5000, // 5 SANİYE TIMEOUT (eskiden 10 idi)
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
      });

      const $ = cheerio.load(response.data);

      return this.parseFinancialData($, symbol);

    } catch (error: any) {
      // Timeout veya network hatası
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        logger.debug(`İş Yatırım timeout for ${symbol} (5s limit)`);
      } else {
        logger.error(`İş Yatırım MaliTablo fetch error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * HTML'den finansal verileri parse eder
   */
  private parseFinancialData($: cheerio.CheerioAPI, symbol: string): Partial<StockData> {
    try {
      // Temel finansal veriler tablosunu bul
      const financials: Partial<StockData> = {
        financials: {
          period: null,
          revenue: null,
          grossProfit: null,
          grossProfitMargin: null,
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
          totalDebt: null,
          netDebt: null,
          workingCapital: null,
        },
        fundamentals: {
          marketCap: null,
          pdDD: null,
          fk: null,
          fdFAVO: null,
          pdEBITDA: null,
          shares: null,
          paidCapital: null,
          eps: null,
          roe: null,
          roa: null,
        },
        lastUpdated: new Date(),
      };

      // Tablo verilerini parse et
      // İş Yatırım'ın HTML yapısına göre mali tablo verilerini çıkart

      // Temel Veriler tablosundan değer çek
      this.extractTableValue($, financials, 'Piyasa Değeri', 'marketCap');
      this.extractTableValue($, financials, 'F/K', 'fk');
      this.extractTableValue($, financials, 'PD/DD', 'pdDD');
      this.extractTableValue($, financials, 'FD/FAVÖK', 'fdFAVO');
      this.extractTableValue($, financials, 'Özsermaye', 'equity');
      this.extractTableValue($, financials, 'Öz Sermaye', 'equity');
      this.extractTableValue($, financials, 'Net Kar', 'netIncome');
      this.extractTableValue($, financials, 'Satış Gelirleri', 'revenue');
      this.extractTableValue($, financials, 'Hasılat', 'revenue');
      this.extractTableValue($, financials, 'Brüt Kar', 'grossProfit');

      // Bilanço verileri
      this.extractTableValue($, financials, 'Toplam Varlıklar', 'totalAssets');
      this.extractTableValue($, financials, 'Dönen Varlıklar', 'currentAssets');
      this.extractTableValue($, financials, 'Duran Varlıklar', 'fixedAssets');
      this.extractTableValue($, financials, 'Kısa Vadeli Borçlar', 'shortTermLiabilities');
      this.extractTableValue($, financials, 'Kısa Vadeli Yükümlülükler', 'shortTermLiabilities');
      this.extractTableValue($, financials, 'Uzun Vadeli Borçlar', 'longTermLiabilities');
      this.extractTableValue($, financials, 'Uzun Vadeli Yükümlülükler', 'longTermLiabilities');
      this.extractTableValue($, financials, 'Finansal Borçlar', 'shortTermBankLoans');
      this.extractTableValue($, financials, 'Nakit ve Nakit Benzerleri', 'financialInvestments');
      this.extractTableValue($, financials, 'Ticari Alacaklar', 'tradeReceivables');

      // ROE/ROA
      this.extractTableValue($, financials, 'ROE', 'roe');
      this.extractTableValue($, financials, 'ROA', 'roa');

      // Sermaye bilgileri
      this.extractTableValue($, financials, 'Ödenmiş Sermaye', 'paidCapital');
      this.extractTableValue($, financials, 'Sermaye', 'paidCapital');

      // Script tag'lerinde JSON veri var mı kontrol et
      this.extractJsonData($, financials);

      return financials;

    } catch (error: any) {
      logger.error(`İş Yatırım parse error: ${error.message}`);
      return this.getEmptyFinancialData();
    }
  }

  /**
   * Tablo hücrelerinden değer çıkarır
   */
  private extractTableValue(
    $: cheerio.CheerioAPI,
    data: Partial<StockData>,
    label: string,
    field: string
  ): void {
    try {
      // Çeşitli tablo yapılarını dene
      // Pattern 1: td içinde label, sonraki td'de değer
      let value = $(`td:contains("${label}")`).next('td').text().trim();

      // Pattern 2: th içinde label, sonraki td'de değer
      if (!value) {
        value = $(`th:contains("${label}")`).next('td').text().trim();
      }

      // Pattern 3: span içinde label, parent'ın sibling'inde değer
      if (!value) {
        value = $(`span:contains("${label}")`).closest('td').next('td').text().trim();
      }

      // Pattern 4: div içinde label ve değer
      if (!value) {
        const container = $(`div:contains("${label}")`).filter((_, el) => {
          return $(el).text().includes(label);
        }).first();
        if (container.length) {
          const text = container.text();
          const match = text.match(new RegExp(`${label}[:\\s]+([\\d.,\\-]+)`));
          if (match) {
            value = match[1];
          }
        }
      }

      if (value) {
        const parsed = this.parseNumber(value);
        if (parsed !== null) {
          this.setNestedValue(data, field, parsed);
        }
      }
    } catch (error) {
      // Sessizce devam et
    }
  }

  /**
   * Script tag'lerinden JSON veri çıkarır
   */
  private extractJsonData($: cheerio.CheerioAPI, data: Partial<StockData>): void {
    try {
      $('script').each((_, script) => {
        const content = $(script).html();
        if (!content) return;

        // JSON veri bloklarını ara
        const jsonMatches = content.match(/\{[^{}]*"(?:piyasaDegeri|marketCap|netKar|revenue)"[^{}]*\}/gi);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              const json = JSON.parse(match);
              if (json.piyasaDegeri) data.fundamentals!.marketCap = this.parseNumber(json.piyasaDegeri);
              if (json.marketCap) data.fundamentals!.marketCap = this.parseNumber(json.marketCap);
              if (json.fk) data.fundamentals!.fk = this.parseNumber(json.fk);
              if (json.pddd) data.fundamentals!.pdDD = this.parseNumber(json.pddd);
              if (json.roe) data.fundamentals!.roe = this.parseNumber(json.roe);
            } catch {
              // JSON parse hatası, devam et
            }
          }
        }
      });
    } catch (error) {
      // Sessizce devam et
    }
  }

  /**
   * Nested objeye değer atar
   */
  private setNestedValue(data: Partial<StockData>, field: string, value: number): void {
    const fundamentalsFields = ['marketCap', 'fk', 'pdDD', 'fdFAVO', 'pdEBITDA', 'shares', 'paidCapital', 'eps', 'roe', 'roa'];
    const financialsFields = ['revenue', 'grossProfit', 'netIncome', 'profitability', 'equity', 'currentAssets',
      'fixedAssets', 'totalAssets', 'shortTermLiabilities', 'longTermLiabilities', 'shortTermBankLoans',
      'longTermBankLoans', 'tradeReceivables', 'financialInvestments'];

    if (fundamentalsFields.includes(field)) {
      if (!data.fundamentals) data.fundamentals = {} as any;
      (data.fundamentals as any)[field] = value;
    } else if (financialsFields.includes(field)) {
      if (!data.financials) data.financials = {} as any;
      (data.financials as any)[field] = value;
    }
  }

  /**
   * Türkçe sayı formatını parse eder
   * Örnekler: "1.234.567", "1.234.567,89", "1,234,567.89", "-123.456"
   */
  private parseNumber(value: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;

    try {
      let cleaned = value.toString().trim();

      // Boş veya geçersiz değer
      if (!cleaned || cleaned === '-' || cleaned === 'N/A') return null;

      // Milyon/Milyar kısaltmalarını dönüştür
      if (cleaned.toLowerCase().includes('mlr') || cleaned.toLowerCase().includes('b')) {
        cleaned = cleaned.replace(/[^\d.,\-]/gi, '');
        const num = this.parseDecimal(cleaned);
        return num ? num * 1000000000 : null;
      }
      if (cleaned.toLowerCase().includes('mln') || cleaned.toLowerCase().includes('mn') || cleaned.toLowerCase().includes('m')) {
        cleaned = cleaned.replace(/[^\d.,\-]/gi, '');
        const num = this.parseDecimal(cleaned);
        return num ? num * 1000000 : null;
      }

      // Sadece sayı ve noktalama karakterlerini al
      cleaned = cleaned.replace(/[^\d.,\-]/g, '');

      return this.parseDecimal(cleaned);

    } catch {
      return null;
    }
  }

  /**
   * Ondalık sayıyı parse eder (Türkçe ve İngilizce format)
   */
  private parseDecimal(value: string): number | null {
    if (!value) return null;

    // Virgül ve nokta sayısını kontrol et
    const commas = (value.match(/,/g) || []).length;
    const dots = (value.match(/\./g) || []).length;

    let normalized: string;

    if (commas === 1 && dots === 0) {
      // Türkçe format: 1234,56
      normalized = value.replace(',', '.');
    } else if (commas === 0 && dots === 1) {
      // İngilizce format: 1234.56
      normalized = value;
    } else if (commas > 0 && dots > 0) {
      // Karışık format: hangi son işaret olduğuna bak
      const lastComma = value.lastIndexOf(',');
      const lastDot = value.lastIndexOf('.');

      if (lastComma > lastDot) {
        // Türkçe: 1.234.567,89
        normalized = value.replace(/\./g, '').replace(',', '.');
      } else {
        // İngilizce: 1,234,567.89
        normalized = value.replace(/,/g, '');
      }
    } else if (commas > 1) {
      // Türkçe binlik ayırıcı: 1.234.567
      normalized = value.replace(/,/g, '');
    } else if (dots > 1) {
      // Türkçe binlik ayırıcı: 1.234.567
      normalized = value.replace(/\./g, '');
    } else {
      normalized = value;
    }

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
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
        grossProfitMargin: null,
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
        totalDebt: null,
        netDebt: null,
        workingCapital: null,
      },
      fundamentals: {
        marketCap: null,
        pdDD: null,
        fk: null,
        fdFAVO: null,
        pdEBITDA: null,
        shares: null,
        paidCapital: null,
        eps: null,
        roe: null,
        roa: null,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Health check - İş Yatırım erişilebilir mi?
   */
  async healthCheck(): Promise<{ status: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.BASE_URL}/tr-tr/analiz/hisse/Sayfalar/default.aspx`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        logger.debug(`İş Yatırım health check: OK (${responseTime}ms)`);
        return { status: true, responseTime };
      }

      return { status: false, responseTime, error: `HTTP ${response.status}` };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error?.message || 'Unknown error';
      logger.error(`İş Yatırım health check failed: ${errorMessage}`);
      return { status: false, responseTime, error: errorMessage };
    }
  }
}

export default new IsYatirimService();
