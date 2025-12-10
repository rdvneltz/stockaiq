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
    // Her 60 saniyede bir güncelle
    const interval = setInterval(loadStocks, 60000);
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
          <span className="stat-label">Hacim</span>
          <span className="stat-value">
            {stock.tradingData.volume ? `${(stock.tradingData.volume / 1000000).toFixed(1)}M` : '-'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">F/K</span>
          <span className="stat-value">{stock.fundamentals.fk?.toFixed(2) || '-'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">52H Yüksek</span>
          <span className="stat-value">{formatCurrency(stock.priceData.week52High, 2)}</span>
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
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
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

        <div className="modal-body">
          <div className="detail-section">
            <h3>📊 Fiyat Bilgileri</h3>
            <div className="detail-grid">
              <DetailRow label="Gün Açılış" value={formatCurrency(stock.tradingData.dailyOpen, 2)} />
              <DetailRow label="Gün Yüksek" value={formatCurrency(stock.priceData.dayHigh, 2)} />
              <DetailRow label="Gün Düşük" value={formatCurrency(stock.priceData.dayLow, 2)} />
              <DetailRow label="52H Yüksek" value={formatCurrency(stock.priceData.week52High, 2)} />
              <DetailRow label="52H Düşük" value={formatCurrency(stock.priceData.week52Low, 2)} />
              <DetailRow label="Hacim" value={stock.tradingData.volume?.toLocaleString('tr-TR') || '-'} />
            </div>
          </div>

          <div className="detail-section">
            <h3>💰 Temel Göstergeler</h3>
            <div className="detail-grid">
              <DetailRow label="Piyasa Değeri" value={stock.fundamentals.marketCap ? `${(stock.fundamentals.marketCap / 1000000000).toFixed(2)}B` : '-'} />
              <DetailRow label="F/K Oranı" value={stock.fundamentals.fk?.toFixed(2) || '-'} />
              <DetailRow label="PD/DD" value={stock.fundamentals.pdDD?.toFixed(2) || '-'} />
              <DetailRow label="FD/FAVO" value={stock.fundamentals.fdFAVO?.toFixed(2) || '-'} />
            </div>
          </div>

          <div className="detail-section">
            <h3>📈 Finansal Tablo</h3>
            <div className="detail-grid">
              <DetailRow label="Hasılat" value={stock.financials.revenue ? `${(stock.financials.revenue / 1000000).toFixed(1)}M` : '-'} />
              <DetailRow label="Net Kar" value={stock.financials.netIncome ? `${(stock.financials.netIncome / 1000000).toFixed(1)}M` : '-'} />
              <DetailRow label="Karlılık %" value={stock.financials.profitability ? `${stock.financials.profitability.toFixed(2)}%` : '-'} />
              <DetailRow label="Öz Sermaye" value={stock.financials.equity ? `${(stock.financials.equity / 1000000).toFixed(1)}M` : '-'} />
            </div>
          </div>
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

          .modal-body {
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 32px;
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

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="detail-row">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value}</span>
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
