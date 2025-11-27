import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import natural from 'natural';
import cron from 'node-cron';
import logger from '../../utils/logger';
import SentimentData from '../../models/SentimentData';
import NotificationService from '../notifications';

interface NewsItem {
  symbol: string;
  source: 'KAP' | 'TWITTER' | 'RSS' | 'NEWS';
  title: string;
  content: string;
  url?: string;
  timestamp: Date;
}

class SentimentAnalysisService {
  private notificationService: NotificationService;
  private rssParser: Parser;
  private tokenizer: any;
  private intervalId?: NodeJS.Timeout;
  private lastKAPCheck: Date = new Date(0);
  private processedNewsIds: Set<string> = new Set();

  // Turkish positive/negative word lists
  private positiveWords = [
    'artış', 'yükseldi', 'kazanç', 'kar', 'başarı', 'büyüme', 'iyi', 'olumlu',
    'güçlü', 'rekor', 'yatırım', 'fırsat', 'pozitif', 'kazandı', 'arttı',
    'yüksek', 'gelir', 'kâr', 'iyileşme', 'başarılı', 'verimli'
  ];

  private negativeWords = [
    'düşüş', 'azaldı', 'zarar', 'kayıp', 'risk', 'tehlike', 'olumsuz', 'kötü',
    'zayıf', 'düşük', 'kriz', 'sorun', 'problem', 'kaybetti', 'azalış',
    'negatif', 'batık', 'iflas', 'borç', 'gecikme', 'dava'
  ];

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.rssParser = new Parser();
    this.tokenizer = new natural.WordTokenizer();
  }

  async start(): Promise<void> {
    logger.info('SentimentAnalysisService starting...');

    // Start sentiment monitoring - every 1 minute
    this.intervalId = setInterval(async () => {
      await this.collectSentimentData();
    }, 60000);

    // Initial run
    await this.collectSentimentData();

    logger.info('SentimentAnalysisService started with 1-minute interval');
  }

  private async collectSentimentData(): Promise<void> {
    try {
      logger.debug('Collecting sentiment data...');

      // Collect from multiple sources in parallel
      await Promise.all([
        this.collectFromKAP(),
        this.collectFromTwitter(),
        this.collectFromRSS(),
      ]);

      logger.debug('Sentiment data collection completed');
    } catch (error) {
      logger.error('Error collecting sentiment data:', error);
    }
  }

  private async collectFromKAP(): Promise<void> {
    try {
      // KAP bildirim API'si
      const response = await axios.get('https://www.kap.org.tr/tr/api/notifications', {
        params: {
          fromDate: this.lastKAPCheck.toISOString(),
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const notifications = response.data;

      if (!notifications || !Array.isArray(notifications)) {
        return;
      }

      for (const notification of notifications) {
        const newsId = `KAP-${notification.id}`;

        if (this.processedNewsIds.has(newsId)) {
          continue;
        }

        // Extract symbol from notification
        const symbol = this.extractSymbolFromKAP(notification);

        if (!symbol) {
          continue;
        }

        const newsItem: NewsItem = {
          symbol,
          source: 'KAP',
          title: notification.title || '',
          content: notification.summary || '',
          url: `https://www.kap.org.tr/tr/Bildirim/${notification.id}`,
          timestamp: new Date(notification.publishDate),
        };

        await this.processNewsItem(newsItem, newsId);
      }

      this.lastKAPCheck = new Date();
    } catch (error) {
      logger.error('Error collecting from KAP:', error);
    }
  }

  private extractSymbolFromKAP(notification: any): string | null {
    try {
      // Symbol genellikle başlıkta veya company code'da bulunur
      if (notification.stockCodes && notification.stockCodes.length > 0) {
        return notification.stockCodes[0];
      }

      // Alternatif olarak başlıktan çıkar
      const match = notification.title?.match(/\b[A-Z]{4,6}\b/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  private async collectFromTwitter(): Promise<void> {
    try {
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;

      if (!bearerToken) {
        logger.warn('Twitter Bearer Token not configured');
        return;
      }

      // Twitter API v2 - search for BIST related tweets
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        params: {
          query: 'BIST OR Borsa Istanbul -is:retweet',
          max_results: 100,
          'tweet.fields': 'created_at,text',
        },
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 10000,
      });

      const tweets = response.data?.data || [];

      for (const tweet of tweets) {
        const newsId = `TWITTER-${tweet.id}`;

        if (this.processedNewsIds.has(newsId)) {
          continue;
        }

        // Extract symbols from tweet text
        const symbols = this.extractSymbolsFromText(tweet.text);

        for (const symbol of symbols) {
          const newsItem: NewsItem = {
            symbol,
            source: 'TWITTER',
            title: tweet.text.substring(0, 100),
            content: tweet.text,
            url: `https://twitter.com/i/status/${tweet.id}`,
            timestamp: new Date(tweet.created_at),
          };

          await this.processNewsItem(newsItem, newsId);
        }
      }
    } catch (error) {
      logger.error('Error collecting from Twitter:', error);
    }
  }

  private async collectFromRSS(): Promise<void> {
    try {
      const rssFeeds = [
        'https://www.bloomberght.com/rss',
        'https://www.dunya.com/rss',
        'https://www.investing.com/rss/news_285.rss', // Turkey news
      ];

      for (const feedUrl of rssFeeds) {
        try {
          const feed = await this.rssParser.parseURL(feedUrl);

          for (const item of feed.items) {
            const newsId = `RSS-${item.guid || item.link}`;

            if (this.processedNewsIds.has(newsId)) {
              continue;
            }

            // Extract symbols from title and content
            const symbols = this.extractSymbolsFromText(
              `${item.title} ${item.contentSnippet || ''}`
            );

            for (const symbol of symbols) {
              const newsItem: NewsItem = {
                symbol,
                source: 'RSS',
                title: item.title || '',
                content: item.contentSnippet || '',
                url: item.link,
                timestamp: new Date(item.pubDate || Date.now()),
              };

              await this.processNewsItem(newsItem, newsId);
            }
          }
        } catch (feedError) {
          logger.error(`Error parsing RSS feed ${feedUrl}:`, feedError);
        }
      }
    } catch (error) {
      logger.error('Error collecting from RSS:', error);
    }
  }

  private extractSymbolsFromText(text: string): string[] {
    const symbols: string[] = [];

    // Match potential stock symbols (4-6 uppercase letters)
    const matches = text.match(/\b[A-Z]{4,6}\b/g);

    if (matches) {
      symbols.push(...matches);
    }

    return [...new Set(symbols)]; // Remove duplicates
  }

  private async processNewsItem(newsItem: NewsItem, newsId: string): Promise<void> {
    try {
      // Analyze sentiment
      const { sentiment, confidence } = this.analyzeSentiment(
        `${newsItem.title} ${newsItem.content}`
      );

      // Determine importance based on source and keywords
      const importance = this.determineImportance(newsItem, sentiment);

      // Save to database
      const sentimentData = await SentimentData.create({
        symbol: newsItem.symbol,
        timestamp: newsItem.timestamp,
        source: newsItem.source,
        title: newsItem.title,
        content: newsItem.content,
        url: newsItem.url,
        sentiment,
        confidence,
        importance,
      });

      // Mark as processed
      this.processedNewsIds.add(newsId);

      // Clean up old processed IDs (keep last 10000)
      if (this.processedNewsIds.size > 10000) {
        const idsArray = Array.from(this.processedNewsIds);
        this.processedNewsIds = new Set(idsArray.slice(-5000));
      }

      // Send alert for important news
      if (importance === 'high' || importance === 'critical') {
        await this.notificationService.sendSentimentAlert(sentimentData);
      }

      logger.debug(
        `Processed ${newsItem.source} news for ${newsItem.symbol}: ${sentiment > 0 ? '+' : ''}${sentiment} (${importance})`
      );
    } catch (error) {
      logger.error('Error processing news item:', error);
    }
  }

  private analyzeSentiment(text: string): { sentiment: number; confidence: number } {
    try {
      const lowerText = text.toLowerCase();
      const tokens = this.tokenizer.tokenize(lowerText);

      if (!tokens || tokens.length === 0) {
        return { sentiment: 0, confidence: 0 };
      }

      let positiveCount = 0;
      let negativeCount = 0;

      for (const token of tokens) {
        if (this.positiveWords.includes(token)) {
          positiveCount++;
        }
        if (this.negativeWords.includes(token)) {
          negativeCount++;
        }
      }

      const totalSentimentWords = positiveCount + negativeCount;

      if (totalSentimentWords === 0) {
        return { sentiment: 0, confidence: 0 };
      }

      // Calculate sentiment score (-100 to +100)
      const sentiment = ((positiveCount - negativeCount) / tokens.length) * 100 * 10;
      const clampedSentiment = Math.max(-100, Math.min(100, sentiment));

      // Calculate confidence (0 to 1)
      const confidence = Math.min(1, totalSentimentWords / 10);

      return {
        sentiment: Math.round(clampedSentiment),
        confidence: parseFloat(confidence.toFixed(2)),
      };
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return { sentiment: 0, confidence: 0 };
    }
  }

  private determineImportance(
    newsItem: NewsItem,
    sentiment: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // KAP bildirimler her zaman yüksek önemli
    if (newsItem.source === 'KAP') {
      return 'high';
    }

    // Yüksek sentiment değişiklikleri önemli
    if (Math.abs(sentiment) > 70) {
      return 'critical';
    }

    if (Math.abs(sentiment) > 40) {
      return 'high';
    }

    // Kritik kelimeler
    const criticalKeywords = [
      'iflas',
      'dava',
      'soruşturma',
      'halka arz',
      'birleşme',
      'satın alma',
      'rekor',
      'konkordato',
    ];

    const lowerContent = newsItem.content.toLowerCase();
    const hasCriticalKeyword = criticalKeywords.some(keyword =>
      lowerContent.includes(keyword)
    );

    if (hasCriticalKeyword) {
      return 'critical';
    }

    if (Math.abs(sentiment) > 20) {
      return 'medium';
    }

    return 'low';
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.info('SentimentAnalysisService stopped');
  }
}

export default SentimentAnalysisService;
