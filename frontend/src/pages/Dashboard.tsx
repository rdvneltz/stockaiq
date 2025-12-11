import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Star, Filter, Clock } from 'lucide-react';
import { stockApi } from '../services/api';
import { StockData } from '../types';
import { formatCurrency, formatPercent, getChangeColor, formatTimeAgo } from '../utils/formatters';
import StockChart from '../components/StockChart';

// Complete BIST100 list
const BIST100_STOCKS = [
  'THYAO', 'GARAN', 'AKBNK', 'EREGL', 'SAHOL', 'KCHOL', 'TUPRS', 'TCELL',
  'SISE', 'PETKM', 'VAKBN', 'YKBNK', 'HALKB', 'ASELS', 'BIMAS', 'ARCLK',
  'KOZAL', 'TAVHL', 'PGSUS', 'ENKAI', 'TOASO', 'KRDMD', 'VESTL', 'FROTO',
  'ISCTR', 'EKGYO', 'KOZAA', 'TTKOM', 'DOHOL', 'SOKM', 'SASA', 'PRKAB',
  'GUBRF', 'TTRAK', 'GLYHO', 'KORDS', 'ENJSA', 'AEFES', 'OTKAR', 'BRYAT',
  'AYGAZ', 'MGROS', 'ULKER', 'ISGYO', 'TSKB', 'ALGYO', 'CIMSA', 'DOAS',
  'AKENR', 'HEKTS', 'LOGO', 'SKBNK', 'ALARK', 'CCOLA', 'TRKCM', 'KLMSN',
  'SODA', 'EGEEN', 'GESAN', 'MAVI', 'MPARK', 'BUCIM', 'ISCTR', 'KARTN',
  'IZMDC', 'KONTR', 'AKSA', 'MNDRS', 'GOODY', 'NETAS', 'ODAS', 'OYAKC',
  'TRGYO', 'VERUS', 'AYDEM', 'CRFSA', 'KARSN', 'PENTA', 'AGHOL', 'TKFEN',
  'ANACM', 'ANELE', 'BAGFS', 'BANVT', 'BFREN', 'BIOEN', 'BRSAN', 'BTCIM',
  'CLEBI', 'CWENE', 'DEVA', 'DOAS', 'DURDO', 'ECILC', 'EMKEL', 'ENERY'
];

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [viewMode, setViewMode] = useState<'favorites' | 'all'>('favorites');
  const [filterRating, setFilterRating] = useState<string>('all');

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('stockaiq_favorites');
    const initialFavorites = savedFavorites ? JSON.parse(savedFavorites) : ['THYAO', 'GARAN', 'AKBNK', 'EREGL', 'ASELS'];
    setFavorites(initialFavorites);
    setWatchlist(viewMode === 'favorites' ? initialFavorites : BIST100_STOCKS);
  }, []);

  // Update watchlist when view mode or favorites change
  useEffect(() => {
    setWatchlist(viewMode === 'favorites' ? favorites : BIST100_STOCKS);
  }, [viewMode, favorites]);

  useEffect(() => {
    if (watchlist.length > 0) {
      loadStocks();
      // Her 10 saniyede bir güncelle (anlık fiyatlar için)
      const interval = setInterval(loadStocks, 10000);
      return () => clearInterval(interval);
    }
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
    if (!newSymbol.trim()) return;

    const symbolUpper = newSymbol.toUpperCase();
    if (favorites.includes(symbolUpper)) {
      alert('Bu hisse zaten favorilerde!');
      return;
    }

    setAddingStock(true);
    try {
      await stockApi.getStock(symbolUpper);
      const newFavorites = [...favorites, symbolUpper];
      setFavorites(newFavorites);
      localStorage.setItem('stockaiq_favorites', JSON.stringify(newFavorites));
      setNewSymbol('');
    } catch (error) {
      alert('Hisse bulunamadı veya eklenemedi');
    } finally {
      setAddingStock(false);
    }
  };

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    localStorage.setItem('stockaiq_favorites', JSON.stringify(newFavorites));
  };

  const handleRefresh = () => {
    loadStocks();
  };

  // Filter stocks based on rating
  const filteredStocks = stocks.filter(stock => {
    if (filterRating === 'all') return true;
    return stock.smartAnalysis.rating === filterRating;
  });

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>📊 Piyasa Görünümü</h1>
          <p>{filteredStocks.length} hisse görüntüleniyor</p>
        </div>
        <div className="controls">
          <div className="view-toggle">
            <button
              className={viewMode === 'favorites' ? 'active' : ''}
              onClick={() => setViewMode('favorites')}
            >
              <Star size={16} />
              Favoriler ({favorites.length})
            </button>
            <button
              className={viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              BIST100 ({BIST100_STOCKS.length})
            </button>
          </div>
          <div className="filter-section">
            <Filter size={16} />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Derecelendirmeler</option>
              <option value="Strong Buy">Strong Buy</option>
              <option value="Buy">Buy</option>
              <option value="Hold">Hold</option>
              <option value="Sell">Sell</option>
              <option value="Strong Sell">Strong Sell</option>
            </select>
          </div>
          <div className="add-stock">
            <input
              type="text"
              placeholder="Favorilere ekle (örn: THYAO)"
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
          {filteredStocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              isFavorite={favorites.includes(stock.symbol)}
              onToggleFavorite={toggleFavorite}
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

        .controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 8px;
        }

        .view-toggle button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-toggle button:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.05);
        }

        .view-toggle button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
        }

        .filter-select {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }

        .filter-select:focus {
          border-color: #667eea;
        }

        .filter-select option {
          background: #1a1f3a;
          color: #fff;
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
  isFavorite: boolean;
  onToggleFavorite: (symbol: string) => void;
  onClick: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, isFavorite, onToggleFavorite, onClick }) => {
  const changeColor = getChangeColor(stock.tradingData.dailyChangePercent);
  const isPositive = (stock.tradingData.dailyChangePercent || 0) >= 0;

  const getRatingBadgeStyle = (rating: string) => {
    switch (rating) {
      case 'Strong Buy':
        return { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' };
      case 'Buy':
        return { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', color: '#fff' };
      case 'Hold':
        return { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#000' };
      case 'Sell':
        return { background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', color: '#fff' };
      case 'Strong Sell':
        return { background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: '#fff' };
      default:
        return { background: 'rgba(255, 255, 255, 0.1)', color: '#fff' };
    }
  };

  return (
    <div className="stock-card" onClick={onClick}>
      <div className="card-top-bar">
        <div className="last-updated" title={stock.lastUpdated ? new Date(stock.lastUpdated).toLocaleString('tr-TR') : '-'}>
          <Clock size={12} />
          <span>{formatTimeAgo(stock.lastUpdated)}</span>
        </div>
        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(stock.symbol);
          }}
          title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <Star size={18} fill={isFavorite ? '#fbbf24' : 'none'} stroke={isFavorite ? '#fbbf24' : '#fff'} />
        </button>
      </div>

      <div className="rating-badge" style={getRatingBadgeStyle(stock.smartAnalysis.rating)}>
        {stock.smartAnalysis.rating}
      </div>

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

        .card-top-bar {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
        }

        .last-updated {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(0, 0, 0, 0.3);
          padding: 4px 8px;
          border-radius: 12px;
          backdrop-filter: blur(4px);
        }

        .last-updated span {
          font-weight: 500;
        }

        .favorite-btn {
          background: rgba(0, 0, 0, 0.3);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          opacity: 0.6;
        }

        .stock-card:hover .favorite-btn {
          opacity: 1;
        }

        .favorite-btn:hover {
          background: rgba(0, 0, 0, 0.5);
          transform: scale(1.1);
        }

        .favorite-btn.active {
          opacity: 1;
        }

        .rating-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
  const [activeTab, setActiveTab] = React.useState<'overview' | 'balance' | 'profitability' | 'valuation' | 'technical' | 'smartAnalysis'>('overview');

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
            <div className="modal-last-updated">
              <Clock size={12} />
              <span>{formatTimeAgo(stock.lastUpdated)}</span>
            </div>
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
            className={`tab ${activeTab === 'smartAnalysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('smartAnalysis')}
          >
            🤖 Akıllı Analiz
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

          {activeTab === 'smartAnalysis' && (
            <>
              <div className="detail-section">
                <h3>🎯 Genel Değerlendirme</h3>
                <div className="smart-overview">
                  <div className="score-circle">
                    <svg viewBox="0 0 120 120" className="score-svg">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={stock.smartAnalysis.overallScore >= 70 ? '#10b981' : stock.smartAnalysis.overallScore >= 50 ? '#fbbf24' : '#ef4444'}
                        strokeWidth="10"
                        strokeDasharray={`${(stock.smartAnalysis.overallScore / 100) * 314} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="score-text">
                      <div className="score-number">{stock.smartAnalysis.overallScore}</div>
                      <div className="score-label">Puan</div>
                    </div>
                  </div>
                  <div className="rating-box">
                    <div className="rating-label">Derecelendirme</div>
                    <div
                      className="rating-value"
                      style={{
                        color: stock.smartAnalysis.rating.includes('Buy') ? '#10b981' :
                               stock.smartAnalysis.rating === 'Hold' ? '#fbbf24' : '#ef4444'
                      }}
                    >
                      {stock.smartAnalysis.rating}
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>📊 Detaylı Skorlar</h3>
                <div className="scores-grid">
                  <ScoreBar label="Değerleme" score={stock.smartAnalysis.valuationScore} />
                  <ScoreBar label="Karlılık" score={stock.smartAnalysis.profitabilityScore} />
                  <ScoreBar label="Likidite" score={stock.smartAnalysis.liquidityScore} />
                  <ScoreBar label="Borçluluk" score={stock.smartAnalysis.leverageScore} />
                </div>
              </div>

              {stock.smartAnalysis.strengths.length > 0 && (
                <div className="detail-section">
                  <h3>✅ Güçlü Yönler</h3>
                  <div className="insights-list">
                    {stock.smartAnalysis.strengths.map((item, idx) => (
                      <div key={idx} className="insight-item strength">{item}</div>
                    ))}
                  </div>
                </div>
              )}

              {stock.smartAnalysis.weaknesses.length > 0 && (
                <div className="detail-section">
                  <h3>⚠️ Zayıf Yönler</h3>
                  <div className="insights-list">
                    {stock.smartAnalysis.weaknesses.map((item, idx) => (
                      <div key={idx} className="insight-item weakness">{item}</div>
                    ))}
                  </div>
                </div>
              )}

              {stock.smartAnalysis.warnings.length > 0 && (
                <div className="detail-section">
                  <h3>🚨 Uyarılar</h3>
                  <div className="insights-list">
                    {stock.smartAnalysis.warnings.map((item, idx) => (
                      <div key={idx} className="insight-item warning">{item}</div>
                    ))}
                  </div>
                </div>
              )}

              {stock.smartAnalysis.recommendations.length > 0 && (
                <div className="detail-section">
                  <h3>💡 Öneriler</h3>
                  <div className="insights-list">
                    {stock.smartAnalysis.recommendations.map((item, idx) => (
                      <div key={idx} className="insight-item recommendation">{item}</div>
                    ))}
                  </div>
                </div>
              )}
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
                <h3>📊 Fiyat Grafiği & Teknik İndikatörler</h3>
                <StockChart
                  symbol={stock.symbol}
                  currentPrice={stock.currentPrice || 0}
                  dayHigh={stock.priceData.dayHigh}
                  dayLow={stock.priceData.dayLow}
                  week52High={stock.priceData.week52High}
                  week52Low={stock.priceData.week52Low}
                />
              </div>

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

          .modal-last-updated {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 8px;
          }

          .modal-last-updated span {
            font-weight: 500;
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

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div className="score-bar-container">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value">{score}/100</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${score}%`,
            background: getScoreColor(score)
          }}
        />
      </div>
      <style>{`
        .score-bar-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .score-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .score-bar-label {
          font-size: 13px;
          opacity: 0.8;
        }

        .score-bar-value {
          font-size: 14px;
          font-weight: 700;
        }

        .score-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .smart-overview {
          display: flex;
          gap: 32px;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .score-circle {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .score-svg {
          width: 100%;
          height: 100%;
        }

        .score-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .score-number {
          font-size: 32px;
          font-weight: 700;
        }

        .score-label {
          font-size: 12px;
          opacity: 0.7;
        }

        .rating-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rating-label {
          font-size: 14px;
          opacity: 0.7;
        }

        .rating-value {
          font-size: 28px;
          font-weight: 700;
        }

        .scores-grid {
          display: grid;
          gap: 20px;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insight-item {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .insight-item.strength {
          background: rgba(16, 185, 129, 0.15);
          border-left: 3px solid #10b981;
        }

        .insight-item.weakness {
          background: rgba(251, 191, 36, 0.15);
          border-left: 3px solid #fbbf24;
        }

        .insight-item.warning {
          background: rgba(239, 68, 68, 0.15);
          border-left: 3px solid #ef4444;
        }

        .insight-item.recommendation {
          background: rgba(102, 126, 234, 0.15);
          border-left: 3px solid #667eea;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
