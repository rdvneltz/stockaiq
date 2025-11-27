import { Server as SocketIOServer } from 'socket.io';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import logger from '../../utils/logger';
import User from '../../models/User';

class NotificationService {
  private io: SocketIOServer;
  private telegramBot?: Telegraf;
  private oneSignalAppId?: string;
  private oneSignalApiKey?: string;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.initializeTelegram();
    this.initializeOneSignal();
  }

  private initializeTelegram(): void {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (token) {
      this.telegramBot = new Telegraf(token);
      this.telegramBot.launch();
      logger.info('Telegram bot initialized');
    } else {
      logger.warn('Telegram bot token not configured');
    }
  }

  private initializeOneSignal(): void {
    this.oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    this.oneSignalApiKey = process.env.ONESIGNAL_API_KEY;

    if (this.oneSignalAppId && this.oneSignalApiKey) {
      logger.info('OneSignal initialized');
    } else {
      logger.warn('OneSignal not configured');
    }
  }

  async sendTradingSignal(signal: any): Promise<void> {
    try {
      const message = this.formatTradingSignalMessage(signal);

      // Send via WebSocket
      this.io.to(signal.symbol).emit('trading_signal', {
        symbol: signal.symbol,
        type: signal.type,
        strength: signal.strength,
        message,
        timestamp: new Date(),
      });

      // Send to users who have this symbol in watchlist
      await this.sendToWatchlistUsers(signal.symbol, message, 'signal');

      logger.info(`Trading signal sent for ${signal.symbol}: ${signal.type}`);
    } catch (error) {
      logger.error('Error sending trading signal:', error);
    }
  }

  async sendSentimentAlert(sentiment: any): Promise<void> {
    try {
      const message = this.formatSentimentMessage(sentiment);

      // Send via WebSocket
      this.io.to(sentiment.symbol).emit('sentiment_alert', {
        symbol: sentiment.symbol,
        sentiment: sentiment.sentiment,
        importance: sentiment.importance,
        title: sentiment.title,
        message,
        timestamp: new Date(),
      });

      // Send to users who have sentiment alerts enabled
      await this.sendToWatchlistUsers(sentiment.symbol, message, 'sentiment');

      logger.info(
        `Sentiment alert sent for ${sentiment.symbol}: ${sentiment.importance}`
      );
    } catch (error) {
      logger.error('Error sending sentiment alert:', error);
    }
  }

  async sendPriceAlert(data: {
    userId: string;
    symbol: string;
    price: number;
    targetPrice: number;
    condition: 'above' | 'below';
  }): Promise<void> {
    try {
      const user = await User.findById(data.userId);

      if (!user) {
        return;
      }

      const message = `🔔 Fiyat Uyarısı\n\n${data.symbol}: ₺${data.price.toFixed(2)}\nHedef: ₺${data.targetPrice.toFixed(2)}\n\nFiyat hedef seviyenin ${data.condition === 'above' ? 'üzerine çıktı' : 'altına düştü'}!`;

      await this.sendNotificationToUser(user, message, 'price');

      logger.info(`Price alert sent to ${user.email} for ${data.symbol}`);
    } catch (error) {
      logger.error('Error sending price alert:', error);
    }
  }

  private formatTradingSignalMessage(signal: any): string {
    let emoji = '📊';
    if (signal.type === 'BUY') emoji = '🟢 AL';
    if (signal.type === 'SELL') emoji = '🔴 SAT';

    const avgTarget =
      (signal.targetPriceSector +
        signal.targetPriceFibonacci +
        signal.targetPriceSupport) /
      3;

    return `${emoji} SİNYAL: ${signal.symbol}\n\n` +
      `Güç: ${signal.strength}/100\n` +
      `Temel Analiz: ${signal.fundamentalScore}/100\n` +
      `Teknik Analiz: ${signal.technicalScore}/100\n` +
      `Sentiment: ${signal.sentimentScore}/100\n\n` +
      `Hedef Fiyatlar:\n` +
      `• Sektör: ₺${signal.targetPriceSector.toFixed(2)}\n` +
      `• Fibonacci: ₺${signal.targetPriceFibonacci.toFixed(2)}\n` +
      `• Destek/Direnç: ₺${signal.targetPriceSupport.toFixed(2)}\n\n` +
      `Stop Loss: ₺${signal.stopLoss.toFixed(2)}\n` +
      `Risk/Ödül: ${signal.riskRewardRatio.toFixed(2)}`;
  }

  private formatSentimentMessage(sentiment: any): string {
    const emoji =
      sentiment.sentiment > 0 ? '😊' : sentiment.sentiment < 0 ? '😟' : '😐';
    const importanceEmoji =
      sentiment.importance === 'critical'
        ? '🚨'
        : sentiment.importance === 'high'
        ? '⚠️'
        : 'ℹ️';

    return (
      `${importanceEmoji} ${emoji} HABER: ${sentiment.symbol}\n\n` +
      `${sentiment.title}\n\n` +
      `Kaynak: ${sentiment.source}\n` +
      `Duyarlılık: ${sentiment.sentiment > 0 ? '+' : ''}${sentiment.sentiment}/100\n` +
      `Önem: ${sentiment.importance.toUpperCase()}`
    );
  }

  private async sendToWatchlistUsers(
    symbol: string,
    message: string,
    type: 'signal' | 'sentiment' | 'price'
  ): Promise<void> {
    try {
      // Find users who have this symbol in watchlist
      const users = await User.find({}).lean();

      const watchlistUsers = users.filter(user => {
        // Check settings based on type
        if (type === 'signal' && !user.settings?.signalAlerts) return false;
        if (type === 'sentiment' && !user.settings?.sentimentAlerts) return false;
        if (type === 'price' && !user.settings?.priceAlerts) return false;

        return true;
      });

      // Send notifications to each user
      for (const user of watchlistUsers) {
        await this.sendNotificationToUser(user, message, type);
      }
    } catch (error) {
      logger.error('Error sending to watchlist users:', error);
    }
  }

  private async sendNotificationToUser(
    user: any,
    message: string,
    type: string
  ): Promise<void> {
    const notifications = user.settings?.notifications || {};

    // Send push notification
    if (notifications.push) {
      await this.sendPushNotification(user.id, message);
    }

    // Send Telegram message
    if (notifications.telegram && user.telegramChatId) {
      await this.sendTelegramMessage(user.telegramChatId, message);
    }

    // WebSocket notification (if user is connected)
    this.io.to(`user:${user.id}`).emit('notification', {
      type,
      message,
      timestamp: new Date(),
      sound: notifications.sound || false,
    });
  }

  private async sendPushNotification(userId: string, message: string): Promise<void> {
    try {
      if (!this.oneSignalAppId || !this.oneSignalApiKey) {
        return;
      }

      await axios.post(
        'https://onesignal.com/api/v1/notifications',
        {
          app_id: this.oneSignalAppId,
          contents: { en: message },
          headings: { en: 'StockAIQ' },
          filters: [{ field: 'tag', key: 'userId', relation: '=', value: userId }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.oneSignalApiKey}`,
          },
        }
      );

      logger.debug(`Push notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  private async sendTelegramMessage(chatId: string, message: string): Promise<void> {
    try {
      if (!this.telegramBot) {
        return;
      }

      await this.telegramBot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });

      logger.debug(`Telegram message sent to ${chatId}`);
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
    }
  }

  async start(): Promise<void> {
    logger.info('NotificationService started');
  }

  async stop(): Promise<void> {
    if (this.telegramBot) {
      this.telegramBot.stop();
    }
    logger.info('NotificationService stopped');
  }
}

export default NotificationService;
