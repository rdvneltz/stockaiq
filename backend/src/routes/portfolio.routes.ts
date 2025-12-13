import { Router, Request, Response } from 'express';
import Portfolio, { IPortfolio } from '../models/Portfolio.model';
import { authMiddleware } from '../middleware/auth.middleware';
import dataAggregatorService from '../services/dataAggregator.service';
import logger from '../utils/logger';

const router = Router();

// Tüm portfolio route'ları auth gerektirir
router.use(authMiddleware);

/**
 * GET /api/portfolios
 * Kullanıcının tüm portfolyolarını listele
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: portfolios });
  } catch (error: any) {
    logger.error('Error fetching portfolios:', error);
    res.status(500).json({ success: false, error: 'Portfolyolar yüklenirken hata oluştu' });
  }
});

/**
 * POST /api/portfolios
 * Yeni portfolio oluştur
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Portfolio adı gerekli' });
    }

    // Kullanıcının portfolio sayısını kontrol et (max 10)
    const portfolioCount = await Portfolio.countDocuments({ userId });
    if (portfolioCount >= 10) {
      return res.status(400).json({ success: false, error: 'Maksimum 10 portfolio oluşturabilirsiniz' });
    }

    // Aynı isimde portfolio var mı kontrol et
    const existingPortfolio = await Portfolio.findOne({ userId, name: name.trim() });
    if (existingPortfolio) {
      return res.status(400).json({ success: false, error: 'Bu isimde bir portfolio zaten mevcut' });
    }

    const portfolio = new Portfolio({
      userId,
      name: name.trim(),
      description: description?.trim() || null,
      stocks: [],
    });

    await portfolio.save();
    res.status(201).json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error creating portfolio:', error);
    res.status(500).json({ success: false, error: 'Portfolio oluşturulurken hata oluştu' });
  }
});

/**
 * GET /api/portfolios/:id
 * Tek bir portfolio'yu getir
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({ success: false, error: 'Portfolio yüklenirken hata oluştu' });
  }
});

/**
 * PUT /api/portfolios/:id
 * Portfolio bilgilerini güncelle
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, description } = req.body;

    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    if (name) portfolio.name = name.trim();
    if (description !== undefined) portfolio.description = description?.trim() || undefined;

    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error updating portfolio:', error);
    res.status(500).json({ success: false, error: 'Portfolio güncellenirken hata oluştu' });
  }
});

/**
 * DELETE /api/portfolios/:id
 * Portfolio'yu sil
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, userId });

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    res.json({ success: true, message: 'Portfolio silindi' });
  } catch (error: any) {
    logger.error('Error deleting portfolio:', error);
    res.status(500).json({ success: false, error: 'Portfolio silinirken hata oluştu' });
  }
});

/**
 * POST /api/portfolios/:id/stocks
 * Portfolio'ya hisse ekle
 */
router.post('/:id/stocks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { symbol, quantity, avgCost, notes } = req.body;

    if (!symbol || !quantity || !avgCost) {
      return res.status(400).json({ success: false, error: 'Sembol, adet ve maliyet gerekli' });
    }

    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    // Aynı hisse varsa güncelle (ortalama maliyet hesapla)
    const existingStock = portfolio.stocks.find(s => s.symbol === symbol.toUpperCase());
    if (existingStock) {
      const totalQuantity = existingStock.quantity + quantity;
      const totalCost = (existingStock.quantity * existingStock.avgCost) + (quantity * avgCost);
      existingStock.avgCost = totalCost / totalQuantity;
      existingStock.quantity = totalQuantity;
      if (notes) existingStock.notes = notes;
    } else {
      portfolio.stocks.push({
        symbol: symbol.toUpperCase(),
        quantity,
        avgCost,
        addedAt: new Date(),
        notes: notes || undefined,
      });
    }

    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error adding stock to portfolio:', error);
    res.status(500).json({ success: false, error: 'Hisse eklenirken hata oluştu' });
  }
});

/**
 * PUT /api/portfolios/:id/stocks/:symbol
 * Portfolio'daki hisseyi güncelle
 */
router.put('/:id/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { quantity, avgCost, notes } = req.body;

    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    const stock = portfolio.stocks.find(s => s.symbol === req.params.symbol.toUpperCase());
    if (!stock) {
      return res.status(404).json({ success: false, error: 'Hisse bulunamadı' });
    }

    if (quantity !== undefined) stock.quantity = quantity;
    if (avgCost !== undefined) stock.avgCost = avgCost;
    if (notes !== undefined) stock.notes = notes || undefined;

    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error updating stock in portfolio:', error);
    res.status(500).json({ success: false, error: 'Hisse güncellenirken hata oluştu' });
  }
});

/**
 * DELETE /api/portfolios/:id/stocks/:symbol
 * Portfolio'dan hisse sil
 */
router.delete('/:id/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    const stockIndex = portfolio.stocks.findIndex(s => s.symbol === req.params.symbol.toUpperCase());
    if (stockIndex === -1) {
      return res.status(404).json({ success: false, error: 'Hisse bulunamadı' });
    }

    portfolio.stocks.splice(stockIndex, 1);
    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Error removing stock from portfolio:', error);
    res.status(500).json({ success: false, error: 'Hisse silinirken hata oluştu' });
  }
});

/**
 * GET /api/portfolios/:id/analysis
 * Portfolio analizi (toplam değer, kar/zarar, risk, sektör dağılımı)
 */
router.get('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio bulunamadı' });
    }

    if (portfolio.stocks.length === 0) {
      return res.json({
        success: true,
        data: {
          portfolioId: portfolio._id,
          totalValue: 0,
          totalCost: 0,
          totalProfitLoss: 0,
          totalProfitLossPercent: 0,
          sectorDistribution: [],
          riskMetrics: {
            diversificationScore: 0,
            concentrationRisk: 'high',
            volatilityRisk: 'low',
            liquidityRisk: 'low',
            overallRisk: 'low',
          },
          topPerformers: [],
          worstPerformers: [],
          recommendations: ['Portfolio boş - hisse ekleyerek başlayın'],
          warnings: [],
          calculatedAt: new Date(),
        },
      });
    }

    // Tüm hisselerin güncel verilerini çek
    const symbols = portfolio.stocks.map(s => s.symbol);
    const stockDataPromises = symbols.map(symbol => dataAggregatorService.getCompleteStockData(symbol));
    const stockDataResults = await Promise.allSettled(stockDataPromises);

    const stockDataMap = new Map<string, any>();
    stockDataResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        stockDataMap.set(symbols[index], result.value);
      }
    });

    // Hesaplamalar
    let totalValue = 0;
    let totalCost = 0;
    const sectorCounts: Record<string, { value: number; count: number }> = {};
    const performances: { symbol: string; profitPercent: number }[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    portfolio.stocks.forEach(stock => {
      const stockData = stockDataMap.get(stock.symbol);
      const currentPrice = stockData?.currentPrice || stock.avgCost;
      const stockValue = currentPrice * stock.quantity;
      const stockCost = stock.avgCost * stock.quantity;

      totalValue += stockValue;
      totalCost += stockCost;

      // Sektör dağılımı
      const sector = stockData?.sector || 'Bilinmeyen';
      if (!sectorCounts[sector]) {
        sectorCounts[sector] = { value: 0, count: 0 };
      }
      sectorCounts[sector].value += stockValue;
      sectorCounts[sector].count++;

      // Performans
      const profitPercent = ((currentPrice - stock.avgCost) / stock.avgCost) * 100;
      performances.push({ symbol: stock.symbol, profitPercent });

      // Uyarılar
      if (stockData?.smartAnalysis?.rating === 'Strong Sell' || stockData?.smartAnalysis?.rating === 'Sell') {
        warnings.push(`${stock.symbol} satış sinyali veriyor`);
      }
      if (stockData?.accumulationSignals?.status === 'strong_distribution') {
        warnings.push(`${stock.symbol}'da dağıtım sinyali tespit edildi`);
      }
    });

    // Sektör dağılımını hesapla
    const sectorDistribution = Object.entries(sectorCounts).map(([sector, data]) => ({
      sector,
      percentage: (data.value / totalValue) * 100,
      value: data.value,
    })).sort((a, b) => b.percentage - a.percentage);

    // Risk metrikleri hesapla
    const uniqueSectors = Object.keys(sectorCounts).length;
    const maxSectorPercentage = Math.max(...sectorDistribution.map(s => s.percentage));

    const diversificationScore = Math.min(100, uniqueSectors * 15 + (100 - maxSectorPercentage));

    let concentrationRisk: 'low' | 'medium' | 'high' = 'low';
    if (maxSectorPercentage > 50) concentrationRisk = 'high';
    else if (maxSectorPercentage > 30) concentrationRisk = 'medium';

    // Top/Worst performers
    const sortedPerformances = [...performances].sort((a, b) => b.profitPercent - a.profitPercent);
    const topPerformers = sortedPerformances.slice(0, 3);
    const worstPerformers = sortedPerformances.slice(-3).reverse();

    // Öneriler
    if (uniqueSectors < 3) {
      recommendations.push('Sektör çeşitlendirmesi düşük - farklı sektörlerden hisse eklemeyi düşünün');
    }
    if (maxSectorPercentage > 40) {
      recommendations.push(`${sectorDistribution[0].sector} sektörüne konsantrasyon yüksek (%${maxSectorPercentage.toFixed(0)})`);
    }
    if (portfolio.stocks.length < 5) {
      recommendations.push('Hisse sayısı az - riski dağıtmak için daha fazla hisse eklemeyi düşünün');
    }

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    const overallRisk = concentrationRisk === 'high' || diversificationScore < 30
      ? 'high'
      : concentrationRisk === 'medium' || diversificationScore < 50
        ? 'medium'
        : 'low';

    res.json({
      success: true,
      data: {
        portfolioId: portfolio._id,
        totalValue,
        totalCost,
        totalProfitLoss,
        totalProfitLossPercent,
        sectorDistribution,
        riskMetrics: {
          diversificationScore,
          concentrationRisk,
          volatilityRisk: 'medium' as const,
          liquidityRisk: 'low' as const,
          overallRisk,
        },
        topPerformers,
        worstPerformers,
        recommendations,
        warnings,
        calculatedAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Error analyzing portfolio:', error);
    res.status(500).json({ success: false, error: 'Portfolio analizi yapılırken hata oluştu' });
  }
});

export default router;
