import yahooFinanceService from './yahooFinance.service';
import kapService from './kap.service';
import investingService from './investing.service';
import twelveDataService from './twelveData.service';
import finnhubService from './finnhub.service';
import fmpService from './fmp.service';
import isYatirimService from './isyatirim.service';
import logger from '../utils/logger';
import { SystemHealth, DataSourceHealth } from '../types';

class HealthCheckService {
  private lastCheckTime: Date | null = null;
  private lastCheckResult: SystemHealth | null = null;
  private checkInterval = 5 * 60 * 1000; // 5 dakika
  private periodicCheckTimer: NodeJS.Timeout | null = null; // Memory leak önleme

  /**
   * Tüm veri kaynaklarının sağlık durumunu kontrol eder
   */
  async checkAllSources(): Promise<SystemHealth> {
    logger.info('Starting health check for all data sources');

    try {
      // Tüm kaynaklarda paralel health check yap
      const [yahooHealth, kapHealth, investingHealth, twelveDataHealth, finnhubHealth, fmpHealth, isYatirimHealth] = await Promise.allSettled([
        this.checkYahooFinance(),
        this.checkKAP(),
        this.checkInvesting(),
        this.checkTwelveData(),
        this.checkFinnhub(),
        this.checkFMP(),
        this.checkIsYatirim(),
      ]);

      const dataSources: DataSourceHealth[] = [
        this.getHealthResult('Yahoo Finance', yahooHealth),
        this.getHealthResult('Twelve Data', twelveDataHealth),
        this.getHealthResult('Finnhub', finnhubHealth),
        this.getHealthResult('FMP (Financial Modeling Prep)', fmpHealth),
        this.getHealthResult('KAP (Kamu Aydınlatma Platformu)', kapHealth),
        this.getHealthResult('İş Yatırım', isYatirimHealth),
        this.getHealthResult('Investing.com', investingHealth),
      ];

      // Genel sistem sağlığını belirle
      const overall = this.calculateOverallHealth(dataSources);

      const systemHealth: SystemHealth = {
        overall,
        dataSources,
        timestamp: new Date(),
      };

      // Son kontrol sonucunu sakla
      this.lastCheckTime = new Date();
      this.lastCheckResult = systemHealth;

      // Sorunlu kaynakları logla
      this.logProblematicSources(dataSources);

      logger.info(`Health check completed: ${overall}`);
      return systemHealth;

    } catch (error: any) {
      logger.error('Health check failed:', error);

      return {
        overall: 'critical',
        dataSources: [],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Yahoo Finance sağlık kontrolü
   */
  private async checkYahooFinance(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await yahooFinanceService.healthCheck();

      return {
        name: 'Yahoo Finance',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'Yahoo Finance',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * KAP sağlık kontrolü
   */
  private async checkKAP(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await kapService.healthCheck();

      return {
        name: 'KAP',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'KAP',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Investing.com sağlık kontrolü
   */
  private async checkInvesting(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await investingService.healthCheck();

      return {
        name: 'Investing.com',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'Investing.com',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Twelve Data sağlık kontrolü
   */
  private async checkTwelveData(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await twelveDataService.healthCheck();

      return {
        name: 'Twelve Data',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'Twelve Data',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Finnhub sağlık kontrolü
   */
  private async checkFinnhub(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await finnhubService.healthCheck();

      return {
        name: 'Finnhub',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'Finnhub',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * FMP sağlık kontrolü
   */
  private async checkFMP(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await fmpService.healthCheck();

      return {
        name: 'FMP',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'FMP',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * İş Yatırım sağlık kontrolü
   */
  private async checkIsYatirim(): Promise<DataSourceHealth> {
    const startTime = Date.now();
    try {
      const result = await isYatirimService.healthCheck();

      return {
        name: 'İş Yatırım',
        status: result.status ? 'operational' : 'down',
        lastCheck: new Date(),
        responseTime: result.responseTime,
        errorMessage: result.error,
      };
    } catch (error: any) {
      return {
        name: 'İş Yatırım',
        status: 'down',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Promise.allSettled sonucundan sağlık bilgisi çıkarır
   */
  private getHealthResult(
    name: string,
    result: PromiseSettledResult<DataSourceHealth>
  ): DataSourceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error(`Health check failed for ${name}:`, result.reason);
      return {
        name,
        status: 'down',
        lastCheck: new Date(),
        responseTime: null,
        errorMessage: result.reason?.message || 'Unknown error',
      };
    }
  }

  /**
   * Genel sistem sağlığını hesaplar
   */
  private calculateOverallHealth(dataSources: DataSourceHealth[]): 'healthy' | 'degraded' | 'critical' {
    const operationalCount = dataSources.filter(ds => ds.status === 'operational').length;
    const totalCount = dataSources.length;

    if (operationalCount === 0) {
      return 'critical'; // Hiçbir kaynak çalışmıyor
    } else if (operationalCount === totalCount) {
      return 'healthy'; // Tüm kaynaklar çalışıyor
    } else {
      return 'degraded'; // Bazı kaynaklar çalışmıyor
    }
  }

  /**
   * Sorunlu kaynakları loglar
   */
  private logProblematicSources(dataSources: DataSourceHealth[]): void {
    const problematic = dataSources.filter(ds => ds.status !== 'operational');

    if (problematic.length > 0) {
      logger.warn('Problematic data sources detected:');
      problematic.forEach(ds => {
        logger.warn(`  - ${ds.name}: ${ds.status} (${ds.errorMessage || 'No error message'})`);
      });
    }
  }

  /**
   * Son kontrol sonucunu döndürür (cache)
   */
  getLastCheckResult(): SystemHealth | null {
    // Eğer 5 dakikadan eski ise yeni kontrol yap
    if (
      !this.lastCheckTime ||
      Date.now() - this.lastCheckTime.getTime() > this.checkInterval
    ) {
      // Asenkron olarak yeni kontrol başlat (background)
      this.checkAllSources().catch(err => logger.error('Background health check failed:', err));
    }

    return this.lastCheckResult;
  }

  /**
   * Otomatik periyodik kontrol başlatır
   * NOT: İlk kontrol index.ts'de yapılıyor, burada tekrar yapmıyoruz (duplikasyon önleme)
   */
  startPeriodicCheck(): void {
    // Önceki timer varsa temizle (memory leak önleme)
    this.stopPeriodicCheck();

    logger.info('Starting periodic health check (interval: 5 min)');

    // İlk kontrolü YAPMA - index.ts'de zaten yapılıyor!
    // Bu duplikasyon Yahoo Finance rate limit'e çarpmaya sebep oluyordu.

    // Sadece periyodik kontrol başlat (5 dakika sonra ilk çalışacak)
    this.periodicCheckTimer = setInterval(() => {
      this.checkAllSources().catch(err => logger.error('Periodic health check failed:', err));
    }, this.checkInterval);
  }

  /**
   * Periyodik kontrolü durdurur (graceful shutdown için)
   */
  stopPeriodicCheck(): void {
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer);
      this.periodicCheckTimer = null;
      logger.info('Periodic health check stopped');
    }
  }

  /**
   * Belirli bir kaynağın durumunu kontrol eder
   */
  async checkSingleSource(sourceName: string): Promise<DataSourceHealth | null> {
    try {
      switch (sourceName.toLowerCase()) {
        case 'yahoo':
        case 'yahoofinance':
          return await this.checkYahooFinance();

        case 'twelvedata':
        case 'twelve':
          return await this.checkTwelveData();

        case 'finnhub':
          return await this.checkFinnhub();

        case 'fmp':
          return await this.checkFMP();

        case 'kap':
          return await this.checkKAP();

        case 'investing':
        case 'investing.com':
          return await this.checkInvesting();

        case 'isyatirim':
        case 'isyatirim.com':
        case 'is':
          return await this.checkIsYatirim();

        default:
          logger.warn(`Unknown data source: ${sourceName}`);
          return null;
      }
    } catch (error: any) {
      logger.error(`Single source health check failed for ${sourceName}:`, error);
      return null;
    }
  }

  /**
   * Sistem sağlık raporunu metinsel olarak döndürür
   */
  getHealthReport(): string {
    if (!this.lastCheckResult) {
      return 'Sistem sağlık kontrolü henüz yapılmadı.';
    }

    const { overall, dataSources, timestamp } = this.lastCheckResult;

    let report = `📊 Sistem Sağlık Raporu\n`;
    report += `⏰ Son Kontrol: ${timestamp.toLocaleString('tr-TR')}\n`;
    report += `🎯 Genel Durum: ${this.getOverallStatusEmoji(overall)} ${overall.toUpperCase()}\n\n`;
    report += `📡 Veri Kaynakları:\n`;

    dataSources.forEach(ds => {
      const emoji = ds.status === 'operational' ? '✅' : '❌';
      const responseTime = ds.responseTime ? `${ds.responseTime}ms` : 'N/A';
      report += `  ${emoji} ${ds.name}: ${ds.status.toUpperCase()} (${responseTime})\n`;

      if (ds.errorMessage) {
        report += `     ⚠️ Hata: ${ds.errorMessage}\n`;
      }
    });

    return report;
  }

  private getOverallStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'degraded':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  }
}

export default new HealthCheckService();
