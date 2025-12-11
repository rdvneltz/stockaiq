import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { stockApi } from '../services/api';
import { StockData } from '../types';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/formatters';

// Default BIST hisseleri
const DEFAULT_STOCKS = [
  'THYAO', 'GARAN', 'AKBNK', 'EREGL', 'SAHOL', 'KCHOL', 'TUPRS', 'TCELL',
  'SISE', 'PETKM', 'VAKBN', 'YKBNK', 'HALKB', 'ASELS', 'BIMAS', 'ARCLK',
  'KOZAL', 'TAVHL', 'PGSUS', 'ENKAI', 'TOASO', 'KRDMD', 'VESTL', 'FROTO',
  'ISCTR', 'EKGYO', 'KOZAA', 'TTKOM', 'DOHOL', 'SOKM'
];

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_STOCKS);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    loadStocks();
    // Her 10 saniyede bir güncelle (anlık fiyatlar için)
    const interval = setInterval(loadStocks, 10000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const stocksData = await stockApi.getMultipleStocks(watchlist);
      setStocks(stocksData);
    } catch (error) {
      console.error('Failed to load stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!newSymbol.trim() || watchlist.includes(newSymbol.toUpperCase())) return;

    setAddingStock(true);
    try {
      await stockApi.getStock(newSymbol.toUpperCase());
      setWatchlist([...watchlist, newSymbol.toUpperCase()]);
      setNewSymbol('');
    } catch (error) {
      alert('Hisse bulunamadı veya eklenemedi');
    } finally {
      setAddingStock(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
    setStocks(stocks.filter(s => s.symbol !== symbol));
  };

  const handleRefresh = () => {
    loadStocks();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>📊 Piyasa Görünümü</h1>
          <p>{stocks.length} hisse izleniyor</p>
        </div>
        <div className="actions">
          <div className="add-stock">
            <input
              type="text"
              placeholder="Hisse ekle (örn: THYAO)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
              disabled={addingStock}
            />
            <button onClick={handleAddStock} disabled={addingStock}>
              <Plus size={18} />
            </button>
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Stock Grid */}
      {loading && stocks.length === 0 ? (
        <div className="loading">Hisseler yükleniyor...</div>
      ) : (
        <div className="stock-grid">
          {stocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onRemove={handleRemoveStock}
              onClick={() => setSelectedStock(stock)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}

      <style>{`
        .dashboard {
          min-height: 100vh;
          padding: 20px;
          max-width: 1800px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .title-section h1 {
          font-size: 32px;
          margin-bottom: 4px;
        }

        .title-section p {
          font-size: 14px;
          opacity: 0.7;
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .add-stock {
          display: flex;
          gap: 8px;
        }

        .add-stock input {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          width: 200px;
        }

        .add-stock input:focus {
          outline: none;
          border-color: #667eea;
        }

        .add-stock button,
        .refresh-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .add-stock button:hover:not(:disabled),
        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .add-stock button:disabled,
        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 60px 20px;
          font-size: 18px;
          opacity: 0.7;
        }

        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: stretch;
          }

          .actions {
            flex-direction: column;
          }

          .add-stock input {
            width: 100%;
          }

          .stock-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Stock Card Component
interface StockCardProps {
  stock: StockData;
  onRemove: (symbol: string) => void;
  onClick: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, onRemove, onClick }) => {
  const changeColor = getChangeColor(stock.tradingData.dailyChangePercent);
  const isPositive = (stock.tradingData.dailyChangePercent || 0) >= 0;

  return (
    <div className="stock-card" onClick={onClick}>
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(stock.symbol);
        }}
      >
        ×
      </button>

      <div className="card-header">
        <h3>{stock.symbol}</h3>
        <span className="company-name">{stock.companyName}</span>
      </div>

      <div className="price-section">
        <div className="price">{formatCurrency(stock.currentPrice, 2)}</div>
        <div className="change" style={{ color: changeColor }}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {formatPercent(stock.tradingData.dailyChangePercent)}
        </div>
      </div>

      <div className="card-stats">
        <div className="stat">
          <span className="stat-label">PD/DD</span>
          <span
            className="stat-value"
            style={{
              color: stock.fundamentals.pdDD
                ? stock.fundamentals.pdDD < 1 ? '#10b981'
                : stock.fundamentals.pdDD > 3 ? '#ef4444'
                : '#fff'
                : '#fff'
            }}
          >
            {stock.fundamentals.pdDD?.toFixed(2) || '-'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">F/K</span>
          <span
            className="stat-value"
            style={{
              color: stock.fundamentals.fk
                ? stock.fundamentals.fk < 10 ? '#10b981'
                : stock.fundamentals.fk > 20 ? '#ef4444'
                : '#fff'
                : '#fff'
            }}
          >
            {stock.fundamentals.fk?.toFixed(2) || '-'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">P.Değeri</span>
          <span className="stat-value">
            {stock.fundamentals.marketCap
              ? stock.fundamentals.marketCap >= 1_000_000_000
                ? `${(stock.fundamentals.marketCap / 1_000_000_000).toFixed(1)}B`
                : `${(stock.fundamentals.marketCap / 1_000_000).toFixed(0)}M`
              : '-'
            }
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Hacim (TL)</span>
          <span className="stat-value">
            {stock.tradingData.volumeTL
              ? stock.tradingData.volumeTL >= 1_000_000
                ? `${(stock.tradingData.volumeTL / 1_000_000).toFixed(1)}M`
                : `${(stock.tradingData.volumeTL / 1_000).toFixed(0)}K`
              : '-'
            }
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">52H Değişim</span>
          <span
            className="stat-value"
            style={{ color: getChangeColor(stock.priceData.week52Change) }}
          >
            {stock.priceData.week52Change ? formatPercent(stock.priceData.week52Change) : '-'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">ROE</span>
          <span
            className="stat-value"
            style={{
              color: stock.fundamentals.roe
                ? stock.fundamentals.roe > 15 ? '#10b981'
                : stock.fundamentals.roe < 5 ? '#ef4444'
                : '#fff'
                : '#fff'
            }}
          >
            {stock.fundamentals.roe ? `${stock.fundamentals.roe.toFixed(1)}%` : '-'}
          </span>
        </div>
      </div>

      <style>{`
        .stock-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .stock-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: none;
          color: #ef4444;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .stock-card:hover .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.4);
        }

        .card-header {
          margin-bottom: 16px;
        }

        .card-header h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .company-name {
          font-size: 12px;
          opacity: 0.6;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .price-section {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .price {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .change {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
          font-weight: 600;
        }

        .card-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          opacity: 0.6;
        }

        .stat-value {
          font-size: 13px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

// Stock Detail Modal Component
interface StockDetailModalProps {
  stock: StockData;
  onClose: () => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'balance' | 'profitability' | 'valuation' | 'technical'>('overview');

  // Modal açıldığında body scroll'ü kapat
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-header">
          <div>
            <h2>{stock.symbol}</h2>
            <p>{stock.companyName}</p>
          </div>
          <div className="modal-price">
            <div className="price">{formatCurrency(stock.currentPrice, 2)}</div>
            <div
              className="change"
              style={{ color: getChangeColor(stock.tradingData.dailyChangePercent) }}
            >
              {formatPercent(stock.tradingData.dailyChangePercent)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Özet
          </button>
          <button
            className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            📋 Bilanço
          </button>
          <button
            className={`tab ${activeTab === 'profitability' ? 'active' : ''}`}
            onClick={() => setActiveTab('profitability')}
          >
            💰 Karlılık
          </button>
          <button
            className={`tab ${activeTab === 'valuation' ? 'active' : ''}`}
            onClick={() => setActiveTab('valuation')}
          >
            📈 Değerleme
          </button>
          <button
            className={`tab ${activeTab === 'technical' ? 'active' : ''}`}
            onClick={() => setActiveTab('technical')}
          >
            📉 Teknik
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'overview' && (
            <>
              <div className="detail-section">
                <h3>📊 Fiyat Bilgileri</h3>
                <div className="detail-grid">
                  <DetailRow label="Güncel Fiyat" value={formatCurrency(stock.currentPrice, 2)} />
                  <DetailRow label="Gün Açılış" value={formatCurrency(stock.tradingData.dailyOpen, 2)} />
                  <DetailRow label="Gün Yüksek" value={formatCurrency(stock.priceData.dayHigh, 2)} />
                  <DetailRow label="Gün Düşük" value={formatCurrency(stock.priceData.dayLow, 2)} />
                  <DetailRow label="Gün Ortalaması" value={formatCurrency(stock.priceData.dayAverage, 2)} />
                  <DetailRow label="Günlük Değişim" value={formatPercent(stock.tradingData.dailyChangePercent)} />
                </div>
              </div>

              <div className="detail-section">
                <h3>💹 İşlem Bilgileri</h3>
                <div className="detail-grid">
                  <DetailRow label="Alış (Bid)" value={formatCurrency(stock.tradingData.bid, 2)} />
                  <DetailRow label="Satış (Ask)" value={formatCurrency(stock.tradingData.ask, 2)} />
                  <DetailRow label="Hacim" value={stock.tradingData.volume?.toLocaleString('tr-TR') || '-'} />
                  <DetailRow label="Hacim (TL)" value={stock.tradingData.volumeTL ? `${(stock.tradingData.volumeTL / 1_000_000).toFixed(2)}M ₺` : '-'} />
                  <DetailRow label="Lot Büyüklüğü" value={stock.tradingData.lotSize?.toString() || '-'} />
                </div>
              </div>

              <div className="detail-section">
                <h3>🎯 Temel Göstergeler</h3>
                <div className="detail-grid">
                  <DetailRow label="Piyasa Değeri" value={stock.fundamentals.marketCap ? `${(stock.fundamentals.marketCap / 1_000_000_000).toFixed(2)}B ₺` : '-'} />
                  <DetailRow label="F/K Oranı" value={stock.fundamentals.fk?.toFixed(2) || '-'} />
                  <DetailRow label="PD/DD" value={stock.fundamentals.pdDD?.toFixed(2) || '-'} />
                  <DetailRow label="FD/FAVO" value={stock.fundamentals.fdFAVO?.toFixed(2) || '-'} />
                  <DetailRow label="PD/EBITDA" value={stock.fundamentals.pdEBITDA?.toFixed(2) || '-'} />
                  <DetailRow label="Hisse Sayısı" value={stock.fundamentals.shares?.toLocaleString('tr-TR') || '-'} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'balance' && (
            <>
              <div className="detail-section">
                <h3>💼 Varlıklar</h3>
                <div className="detail-grid">
                  <DetailRow label="Dönen Varlıklar" value={stock.financials.currentAssets ? `${(stock.financials.currentAssets / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="├─ Ticari Alacaklar" value={stock.financials.tradeReceivables ? `${(stock.financials.tradeReceivables / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="├─ Finansal Yatırımlar" value={stock.financials.financialInvestments ? `${(stock.financials.financialInvestments / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Duran Varlıklar" value={stock.financials.fixedAssets ? `${(stock.financials.fixedAssets / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="├─ Yatırım Amaçlı GYO" value={stock.financials.investmentProperty ? `${(stock.financials.investmentProperty / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="TOPLAM VARLIKLAR" value={stock.financials.totalAssets ? `${(stock.financials.totalAssets / 1_000_000).toFixed(1)}M ₺` : '-'} bold />
                </div>
              </div>

              <div className="detail-section">
                <h3>📊 Yükümlülükler ve Öz Sermaye</h3>
                <div className="detail-grid">
                  <DetailRow label="Kısa Vadeli Borçlar" value={stock.financials.shortTermLiabilities ? `${(stock.financials.shortTermLiabilities / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="├─ KV Banka Kredisi" value={stock.financials.shortTermBankLoans ? `${(stock.financials.shortTermBankLoans / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Uzun Vadeli Borçlar" value={stock.financials.longTermLiabilities ? `${(stock.financials.longTermLiabilities / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="├─ UV Banka Kredisi" value={stock.financials.longTermBankLoans ? `${(stock.financials.longTermBankLoans / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="TOPLAM BORÇ" value={stock.financials.totalDebt ? `${(stock.financials.totalDebt / 1_000_000).toFixed(1)}M ₺` : '-'} bold />
                  <DetailRow label="Öz Sermaye" value={stock.financials.equity ? `${(stock.financials.equity / 1_000_000).toFixed(1)}M ₺` : '-'} bold />
                </div>
              </div>

              <div className="detail-section">
                <h3>🔄 Likidite Oranları</h3>
                <div className="detail-grid">
                  <DetailRow label="Cari Oran" value={stock.liquidity.currentRatio?.toFixed(2) || '-'} />
                  <DetailRow label="Asit-Test Oranı" value={stock.liquidity.acidTestRatio?.toFixed(2) || '-'} />
                  <DetailRow label="Nakit Oranı" value={stock.liquidity.cashRatio?.toFixed(2) || '-'} />
                  <DetailRow label="İşletme Sermayesi" value={stock.financials.workingCapital ? `${(stock.financials.workingCapital / 1_000_000).toFixed(1)}M ₺` : '-'} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'profitability' && (
            <>
              <div className="detail-section">
                <h3>💵 Gelir Tablosu</h3>
                <div className="detail-grid">
                  <DetailRow label="Hasılat (Revenue)" value={stock.financials.revenue ? `${(stock.financials.revenue / 1_000_000).toFixed(1)}M ₺` : '-'} bold />
                  <DetailRow label="Brüt Kar" value={stock.financials.grossProfit ? `${(stock.financials.grossProfit / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Brüt Kar Marjı" value={stock.financials.grossProfitMargin ? `${stock.financials.grossProfitMargin.toFixed(2)}%` : '-'} />
                  <DetailRow label="Net Kar" value={stock.financials.netIncome ? `${(stock.financials.netIncome / 1_000_000).toFixed(1)}M ₺` : '-'} bold />
                  <DetailRow label="Net Kar Marjı" value={stock.financials.profitability ? `${stock.financials.profitability.toFixed(2)}%` : '-'} />
                  <DetailRow label="Dönem" value={stock.financials.period || '-'} />
                </div>
              </div>

              <div className="detail-section">
                <h3>📈 Karlılık Oranları</h3>
                <div className="detail-grid">
                  <DetailRow label="ROE (Öz Sermaye Karlılığı)" value={stock.fundamentals.roe ? `${stock.fundamentals.roe.toFixed(2)}%` : '-'} />
                  <DetailRow label="ROA (Varlık Karlılığı)" value={stock.fundamentals.roa ? `${stock.fundamentals.roa.toFixed(2)}%` : '-'} />
                  <DetailRow label="EPS (Hisse Başı Kazanç)" value={stock.fundamentals.eps ? `${stock.fundamentals.eps.toFixed(4)} ₺` : '-'} />
                  <DetailRow label="Ortalama Temettü" value={stock.analysis.averageDividend ? `${stock.analysis.averageDividend.toFixed(2)}%` : '-'} />
                </div>
              </div>

              <div className="detail-section">
                <h3>🌍 Satış Dağılımı</h3>
                <div className="detail-grid">
                  <DetailRow label="Yurtiçi Satışlar" value={stock.analysis.domesticSalesRatio ? `${stock.analysis.domesticSalesRatio.toFixed(1)}%` : '-'} />
                  <DetailRow label="Yurtdışı Satışlar" value={stock.analysis.foreignSalesRatio ? `${stock.analysis.foreignSalesRatio.toFixed(1)}%` : '-'} />
                  <DetailRow label="İhracat Oranı" value={stock.analysis.exportRatio ? `${stock.analysis.exportRatio.toFixed(1)}%` : '-'} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'valuation' && (
            <>
              <div className="detail-section">
                <h3>🏷️ Değerleme Metrikleri</h3>
                <div className="detail-grid">
                  <DetailRow label="F/K (Price/Earnings)" value={stock.fundamentals.fk?.toFixed(2) || '-'} />
                  <DetailRow label="PD/DD (Price/Book)" value={stock.fundamentals.pdDD?.toFixed(2) || '-'} />
                  <DetailRow label="FD/FAVO" value={stock.fundamentals.fdFAVO?.toFixed(2) || '-'} />
                  <DetailRow label="PD/EBITDA" value={stock.fundamentals.pdEBITDA?.toFixed(2) || '-'} />
                  <DetailRow label="Piyasa Değeri" value={stock.fundamentals.marketCap ? `${(stock.fundamentals.marketCap / 1_000_000_000).toFixed(2)}B ₺` : '-'} />
                </div>
              </div>

              <div className="detail-section">
                <h3>💳 Borçluluk Analizi</h3>
                <div className="detail-grid">
                  <DetailRow label="Toplam Borç" value={stock.financials.totalDebt ? `${(stock.financials.totalDebt / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Net Borç" value={stock.financials.netDebt ? `${(stock.financials.netDebt / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Borç/Öz Sermaye" value={stock.leverage.debtToEquity?.toFixed(2) || '-'} />
                  <DetailRow label="Borç/Varlıklar" value={stock.leverage.debtToAssets?.toFixed(2) || '-'} />
                  <DetailRow label="KV Borç Oranı" value={stock.leverage.shortTermDebtRatio ? `${stock.leverage.shortTermDebtRatio.toFixed(1)}%` : '-'} />
                  <DetailRow label="UV Borç Oranı" value={stock.leverage.longTermDebtRatio ? `${stock.leverage.longTermDebtRatio.toFixed(1)}%` : '-'} />
                </div>
              </div>

              <div className="detail-section">
                <h3>💎 Sermaye Yapısı</h3>
                <div className="detail-grid">
                  <DetailRow label="Ödenmiş Sermaye" value={stock.fundamentals.paidCapital ? `${(stock.fundamentals.paidCapital / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="İhraç Edilen Hisse" value={stock.fundamentals.shares ? `${(stock.fundamentals.shares / 1_000_000_000).toFixed(2)}B adet` : '-'} />
                  <DetailRow label="Öz Sermaye" value={stock.financials.equity ? `${(stock.financials.equity / 1_000_000).toFixed(1)}M ₺` : '-'} />
                  <DetailRow label="Hisse Başı Değer" value={stock.fundamentals.shares && stock.financials.equity ? `${(stock.financials.equity / stock.fundamentals.shares).toFixed(2)} ₺` : '-'} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'technical' && (
            <>
              <div className="detail-section">
                <h3>📉 Fiyat Performansı</h3>
                <div className="detail-grid">
                  <DetailRow label="52 Hafta Yüksek" value={formatCurrency(stock.priceData.week52High, 2)} />
                  <DetailRow label="52 Hafta Düşük" value={formatCurrency(stock.priceData.week52Low, 2)} />
                  <DetailRow label="52H Değişim" value={stock.priceData.week52Change ? formatPercent(stock.priceData.week52Change) : '-'} />
                  <DetailRow label="52H Değişim (TL)" value={stock.priceData.week52ChangeTL ? `${stock.priceData.week52ChangeTL.toFixed(2)} ₺` : '-'} />
                  <DetailRow label="1 Hafta Yüksek" value={formatCurrency(stock.priceData.week1High, 2)} />
                  <DetailRow label="1 Hafta Düşük" value={formatCurrency(stock.priceData.week1Low, 2)} />
                </div>
              </div>

              <div className="detail-section">
                <h3>📊 İşlem Verileri</h3>
                <div className="detail-grid">
                  <DetailRow label="Gün Açılış" value={formatCurrency(stock.tradingData.dailyOpen, 2)} />
                  <DetailRow label="Gün Yüksek" value={formatCurrency(stock.priceData.dayHigh, 2)} />
                  <DetailRow label="Gün Düşük" value={formatCurrency(stock.priceData.dayLow, 2)} />
                  <DetailRow label="Gün Ortalama" value={formatCurrency(stock.priceData.dayAverage, 2)} />
                  <DetailRow label="Günlük Değişim" value={formatCurrency(stock.tradingData.dailyChange, 2)} />
                  <DetailRow label="Günlük Değişim %" value={formatPercent(stock.tradingData.dailyChangePercent)} />
                </div>
              </div>

              <div className="detail-section">
                <h3>📍 52 Hafta Pozisyonu</h3>
                {stock.priceData.week52Low && stock.priceData.week52High && stock.currentPrice && (
                  <div className="range-indicator">
                    <div className="range-bar">
                      <div
                        className="range-fill"
                        style={{
                          width: `${((stock.currentPrice - stock.priceData.week52Low) / (stock.priceData.week52High - stock.priceData.week52Low) * 100).toFixed(1)}%`
                        }}
                      ></div>
                    </div>
                    <div className="range-labels">
                      <span>52H Düşük: {formatCurrency(stock.priceData.week52Low, 2)}</span>
                      <span>Pozisyon: {((stock.currentPrice - stock.priceData.week52Low) / (stock.priceData.week52High - stock.priceData.week52Low) * 100).toFixed(1)}%</span>
                      <span>52H Yüksek: {formatCurrency(stock.priceData.week52High, 2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-content {
            background: #1a1f3a;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
          }

          .modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            transition: background 0.2s;
          }

          .modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .modal-header {
            padding: 32px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          }

          .modal-header h2 {
            font-size: 28px;
            margin-bottom: 4px;
          }

          .modal-header p {
            font-size: 14px;
            opacity: 0.7;
          }

          .modal-price .price {
            font-size: 32px;
            font-weight: 700;
            text-align: right;
          }

          .modal-price .change {
            font-size: 18px;
            font-weight: 600;
            text-align: right;
          }

          .modal-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            overflow-x: auto;
          }

          .modal-tabs .tab {
            flex: 1;
            padding: 16px 20px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            border-bottom: 2px solid transparent;
            white-space: nowrap;
          }

          .modal-tabs .tab:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.05);
          }

          .modal-tabs .tab.active {
            color: #fff;
            border-bottom-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
          }

          .modal-body {
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .range-indicator {
            margin-top: 16px;
          }

          .range-bar {
            width: 100%;
            height: 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 12px;
          }

          .range-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #667eea 50%, #ef4444 100%);
            transition: width 0.3s;
          }

          .range-labels {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            opacity: 0.7;
          }

          .detail-section h3 {
            font-size: 18px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          @media (max-width: 768px) {
            .modal-header {
              flex-direction: column;
              align-items: flex-start;
            }

            .modal-price .price,
            .modal-price .change {
              text-align: left;
            }

            .detail-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div className="detail-row" style={bold ? { background: 'rgba(102, 126, 234, 0.15)', borderLeft: '3px solid #667eea' } : {}}>
    <span className="detail-label" style={bold ? { fontWeight: '700', opacity: 1 } : {}}>{label}</span>
    <span className="detail-value" style={bold ? { fontWeight: '700', fontSize: '15px' } : {}}>{value}</span>
    <style>{`
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .detail-label {
        font-size: 13px;
        opacity: 0.7;
      }

      .detail-value {
        font-size: 14px;
        font-weight: 600;
      }
    `}</style>
  </div>
);

export default Dashboard;
