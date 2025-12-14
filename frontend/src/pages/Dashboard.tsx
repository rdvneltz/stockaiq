import React, { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Star, Filter, Clock, List } from 'lucide-react';
import { stockApi } from '../services/api';
import { StockData } from '../types';
import { formatCurrency, formatPercent, getChangeColor, formatTimeAgo } from '../utils/formatters';
import StockChart from '../components/StockChart';
import { useAuth } from '../context/AuthContext';
import { BIST_INDEXES, BIST30_STOCKS, BIST50_STOCKS, BIST100_STOCKS, ALL_BIST_UNIQUE } from '../constants/bistStocks';

// Global cache that persists between page navigations
const globalStockCache = new Map<string, StockData>();
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 60 saniye - daha uzun cache süresi
const BACKGROUND_REFRESH_INTERVAL = 45000; // 45 saniye - arka planda yenileme

// Index types
type BistIndex = 'BIST30' | 'BIST50' | 'BIST100' | 'ALL';

const Dashboard: React.FC = () => {
  const { user, updateFavorites } = useAuth();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [viewMode, setViewMode] = useState<'favorites' | 'index'>('favorites');
  const [selectedIndex, setSelectedIndex] = useState<BistIndex>('BIST100');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

  // Get favorites from user
  const favorites = user?.favorites || [];

  // Get stocks based on selected index
  const getIndexStocks = (index: BistIndex): string[] => {
    switch (index) {
      case 'BIST30': return BIST30_STOCKS;
      case 'BIST50': return [...new Set(BIST50_STOCKS)];
      case 'BIST100': return [...new Set(BIST100_STOCKS)];
      case 'ALL': return ALL_BIST_UNIQUE;
      default: return BIST100_STOCKS;
    }
  };

  // Load favorites from user on mount
  useEffect(() => {
    const initialFavorites = favorites.length > 0 ? favorites : ['THYAO', 'GARAN', 'AKBNK', 'EREGL', 'ASELS'];
    setWatchlist(viewMode === 'favorites' ? initialFavorites : getIndexStocks(selectedIndex));
  }, [user]);

  // Update watchlist when view mode, selected index, or favorites change
  useEffect(() => {
    const newWatchlist = viewMode === 'favorites' ? favorites : getIndexStocks(selectedIndex);

    // Watchlist değişmediyse güncelleme yapma
    const watchlistChanged = newWatchlist.length !== watchlist.length ||
      newWatchlist.some((symbol, i) => watchlist[i] !== symbol);

    if (!watchlistChanged && watchlist.length > 0) {
      return;
    }

    setWatchlist(newWatchlist);

    // Önce global cache'den göster (sayfa geçişlerinde hızlı yükleme)
    const cachedStocks = newWatchlist
      .map(symbol => globalStockCache.get(symbol))
      .filter((stock): stock is StockData => stock !== undefined);

    if (cachedStocks.length > 0) {
      setStocks(cachedStocks);
      setLoadingProgress({ loaded: cachedStocks.length, total: newWatchlist.length });
      setLoading(false);
    } else {
      setLoadingProgress({ loaded: 0, total: newWatchlist.length });
    }
  }, [viewMode, selectedIndex, favorites]);

  useEffect(() => {
    isMounted.current = true;
    if (watchlist.length > 0) {
      // İlk yükleme - sadece cache boşsa veya çok eskiyse
      const now = Date.now();
      const cachedStocks = watchlist
        .map(symbol => globalStockCache.get(symbol))
        .filter((stock): stock is StockData => stock !== undefined);

      // Cache yeteri kadar doluysa (%80+) ve tazeyse, hemen göster
      if (cachedStocks.length >= watchlist.length * 0.8 && now - lastFetchTime < CACHE_DURATION) {
        setStocks(cachedStocks);
        setLoadingProgress({ loaded: cachedStocks.length, total: watchlist.length });
        setLoading(false);
      } else {
        loadStocks();
      }

      // Arka planda periyodik güncelleme
      const interval = setInterval(loadStocks, BACKGROUND_REFRESH_INTERVAL);
      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    }
    return () => { isMounted.current = false; };
  }, [watchlist]);

  const loadStocks = async () => {
    const now = Date.now();
    const cacheAge = now - lastFetchTime;

    // Cache yeterince taze ve veriler varsa, sadece cache'den göster
    const cachedStocks = watchlist
      .map(symbol => globalStockCache.get(symbol))
      .filter((stock): stock is StockData => stock !== undefined);

    // Cache %90+ doluysa ve 30 saniyeden tazeyse, yeniden çekme
    if (cacheAge < CACHE_DURATION && cachedStocks.length >= watchlist.length * 0.9) {
      if (isMounted.current) {
        setStocks(cachedStocks);
        setLoadingProgress({ loaded: cachedStocks.length, total: watchlist.length });
        setLoading(false);
      }
      return;
    }

    // Sadece cache'de olmayan sembolleri çek
    const uncachedSymbols = watchlist.filter(symbol => !globalStockCache.has(symbol));

    // Eğer tüm veriler cache'deyse ve biraz eskiyse, arka planda güncelle
    const symbolsToFetch = uncachedSymbols.length > 0 ? uncachedSymbols :
      (cacheAge > CACHE_DURATION ? watchlist.slice(0, 30) : []); // Sadece ilk 30'u güncelle

    // Hiç veri çekmemiz gerekmiyorsa cache'den göster
    if (symbolsToFetch.length === 0) {
      if (isMounted.current && cachedStocks.length > 0) {
        setStocks(cachedStocks);
        setLoading(false);
      }
      return;
    }

    // Eğer hiç veri yoksa loading göster, yoksa arka planda güncelle
    if (cachedStocks.length === 0) {
      setLoading(true);
    }

    try {
      // Daha küçük batch'ler: 8'lik gruplar, 2 paralel batch (timeout riski azaltır)
      const batchSize = 8;
      const parallelBatches = 2;
      const batches: string[][] = [];

      for (let i = 0; i < symbolsToFetch.length; i += batchSize) {
        batches.push(symbolsToFetch.slice(i, i + batchSize));
      }

      let loadedCount = cachedStocks.length;

      // Batch'leri paralel gruplar halinde çek
      for (let i = 0; i < batches.length; i += parallelBatches) {
        const currentBatches = batches.slice(i, i + parallelBatches);
        const batchPromises = currentBatches.map(batch =>
          stockApi.getMultipleStocks(batch).catch(() => [] as StockData[])
        );

        const batchResults = await Promise.all(batchPromises);
        const newStocks = batchResults.flat();

        // Global cache'i güncelle
        newStocks.forEach(stock => {
          if (stock && stock.symbol) {
            globalStockCache.set(stock.symbol, stock);
          }
        });

        loadedCount += newStocks.length;

        // Progress güncelle ve ara sonuçları göster
        if (isMounted.current) {
          setLoadingProgress({ loaded: loadedCount, total: watchlist.length });

          // Her batch'ten sonra ara sonuçları göster
          const allStocks = watchlist
            .map(symbol => globalStockCache.get(symbol))
            .filter((stock): stock is StockData => stock !== undefined);

          const uniqueStocks = Array.from(
            new Map(allStocks.map(stock => [stock.symbol, stock])).values()
          );
          setStocks(uniqueStocks);
        }

        // Rate limiting için bekleme (her batch grubundan sonra)
        if (i + parallelBatches < batches.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      lastFetchTime = Date.now();

    } catch (error) {
      console.warn('Failed to load some stocks:', error);
      // Hata olsa bile cache'deki verileri göster
      if (isMounted.current && cachedStocks.length > 0) {
        setStocks(cachedStocks);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
      await updateFavorites(newFavorites);
      setNewSymbol('');
    } catch (error) {
      alert('Hisse bulunamadı veya eklenemedi');
    } finally {
      setAddingStock(false);
    }
  };

  const toggleFavorite = async (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    await updateFavorites(newFavorites);
  };

  const handleRefresh = () => {
    loadStocks();
  };

  // Akıllı analize göre sıralama fonksiyonu
  const getSortOrder = (rating: string): number => {
    switch (rating) {
      case 'Strong Buy': return 1;
      case 'Buy': return 2;
      case 'Hold': return 3;
      case 'Sell': return 4;
      case 'Strong Sell': return 5;
      default: return 6;
    }
  };

  // Filter and sort stocks
  const filteredAndSortedStocks = stocks
    .filter(stock => {
      // Rating filter - önce rating'e bak
      if (filterRating !== 'all' && stock.smartAnalysis.rating !== filterRating) {
        return false;
      }

      // Search filter - rating geçtiyse search'e bak
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();
        const matchesSearch = stock.symbol.toUpperCase().startsWith(query) ||
               stock.companyName?.toUpperCase().includes(query);
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Önce akıllı analize göre sırala
      const orderA = getSortOrder(a.smartAnalysis.rating);
      const orderB = getSortOrder(b.smartAnalysis.rating);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Aynı rating ise overall score'a göre sırala (yüksekten düşüğe)
      return (b.smartAnalysis.overallScore || 0) - (a.smartAnalysis.overallScore || 0);
    });

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>📊 Piyasa Görünümü</h1>
          <p>
            {filteredAndSortedStocks.length} hisse görüntüleniyor
            {loading && loadingProgress.total > 0 && (
              <span className="loading-progress"> • Yükleniyor: {loadingProgress.loaded}/{loadingProgress.total}</span>
            )}
          </p>
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
              className={viewMode === 'index' ? 'active' : ''}
              onClick={() => setViewMode('index')}
            >
              <List size={16} />
              Endeks
            </button>
          </div>
          {viewMode === 'index' && (
            <div className="index-selector">
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value as BistIndex)}
                className="index-select"
              >
                <option value="BIST30">BIST 30 ({BIST_INDEXES.BIST30.count} hisse)</option>
                <option value="BIST50">BIST 50 ({BIST_INDEXES.BIST50.count} hisse)</option>
                <option value="BIST100">BIST 100 ({BIST_INDEXES.BIST100.count} hisse)</option>
                <option value="ALL">Tüm BIST ({BIST_INDEXES.ALL.count} hisse)</option>
              </select>
            </div>
          )}
          <div className="search-box">
            <input
              type="text"
              placeholder="Ara (örn: TH, THYAO)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
          {filteredAndSortedStocks.map((stock) => (
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

        .index-selector {
          display: flex;
          align-items: center;
        }

        .index-select {
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          min-width: 180px;
        }

        .index-select option {
          background: #1a1f3a;
          color: #fff;
          padding: 8px;
        }

        .loading-progress {
          color: #667eea;
          font-weight: 500;
        }

        .search-box {
          display: flex;
          align-items: center;
        }

        .search-box input {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          outline: none;
          width: 200px;
        }

        .search-box input:focus {
          border-color: #667eea;
        }

        .search-box input::placeholder {
          color: rgba(255, 255, 255, 0.4);
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

        .last-updated {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(0, 0, 0, 0.4);
          padding: 4px 8px;
          border-radius: 12px;
          backdrop-filter: blur(4px);
          z-index: 10;
        }

        .last-updated span {
          font-weight: 500;
        }

        .favorite-btn {
          position: absolute;
          top: 8px;
          right: 8px;
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
          z-index: 5;
        }

        .card-header {
          margin-bottom: 16px;
          padding-top: 32px;
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

              {stock.priceTargets && (
                <div className="detail-section">
                  <h3>🎯 AI Fiyat Hedefleri</h3>
                  <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '16px' }}>
                    3 model hibrit yaklaşımı: Teknik Analiz + Fundamental Analiz + Momentum/Sentiment
                  </p>
                  <div className="price-targets-grid">
                    <div className="price-target-card">
                      <div className="target-header">
                        <span className="target-label">Kısa Vade</span>
                        <span className="target-timeframe">{stock.priceTargets.shortTerm.timeframe}</span>
                      </div>
                      <div className="target-price">{stock.priceTargets.shortTerm.target.toFixed(2)} ₺</div>
                      <div className="target-potential" style={{ color: stock.priceTargets.shortTerm.potential >= 0 ? '#10b981' : '#ef4444' }}>
                        {stock.priceTargets.shortTerm.potential >= 0 ? '+' : ''}{stock.priceTargets.shortTerm.potential.toFixed(2)}%
                      </div>
                      <div className="target-confidence">
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${stock.priceTargets.shortTerm.confidence}%`,
                              backgroundColor: stock.priceTargets.shortTerm.confidence >= 70 ? '#10b981' : stock.priceTargets.shortTerm.confidence >= 50 ? '#fbbf24' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="confidence-text">Güven: {stock.priceTargets.shortTerm.confidence}%</span>
                      </div>
                    </div>

                    <div className="price-target-card">
                      <div className="target-header">
                        <span className="target-label">Orta Vade</span>
                        <span className="target-timeframe">{stock.priceTargets.midTerm.timeframe}</span>
                      </div>
                      <div className="target-price">{stock.priceTargets.midTerm.target.toFixed(2)} ₺</div>
                      <div className="target-potential" style={{ color: stock.priceTargets.midTerm.potential >= 0 ? '#10b981' : '#ef4444' }}>
                        {stock.priceTargets.midTerm.potential >= 0 ? '+' : ''}{stock.priceTargets.midTerm.potential.toFixed(2)}%
                      </div>
                      <div className="target-confidence">
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${stock.priceTargets.midTerm.confidence}%`,
                              backgroundColor: stock.priceTargets.midTerm.confidence >= 70 ? '#10b981' : stock.priceTargets.midTerm.confidence >= 50 ? '#fbbf24' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="confidence-text">Güven: {stock.priceTargets.midTerm.confidence}%</span>
                      </div>
                    </div>

                    <div className="price-target-card">
                      <div className="target-header">
                        <span className="target-label">Uzun Vade</span>
                        <span className="target-timeframe">{stock.priceTargets.longTerm.timeframe}</span>
                      </div>
                      <div className="target-price">{stock.priceTargets.longTerm.target.toFixed(2)} ₺</div>
                      <div className="target-potential" style={{ color: stock.priceTargets.longTerm.potential >= 0 ? '#10b981' : '#ef4444' }}>
                        {stock.priceTargets.longTerm.potential >= 0 ? '+' : ''}{stock.priceTargets.longTerm.potential.toFixed(2)}%
                      </div>
                      <div className="target-confidence">
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${stock.priceTargets.longTerm.confidence}%`,
                              backgroundColor: stock.priceTargets.longTerm.confidence >= 70 ? '#10b981' : stock.priceTargets.longTerm.confidence >= 50 ? '#fbbf24' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="confidence-text">Güven: {stock.priceTargets.longTerm.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="model-breakdown">
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.8 }}>Model Detayları</h4>
                    <div className="model-grid">
                      <div className="model-item">
                        <span className="model-name">📐 Teknik Analiz</span>
                        <div className="model-values">
                          <span>{stock.priceTargets.models.technical.shortTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.technical.midTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.technical.longTerm.toFixed(2)} ₺</span>
                        </div>
                      </div>
                      <div className="model-item">
                        <span className="model-name">📊 Fundamental</span>
                        <div className="model-values">
                          <span>{stock.priceTargets.models.fundamental.shortTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.fundamental.midTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.fundamental.longTerm.toFixed(2)} ₺</span>
                        </div>
                      </div>
                      <div className="model-item">
                        <span className="model-name">⚡ Momentum</span>
                        <div className="model-values">
                          <span>{stock.priceTargets.models.momentum.shortTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.momentum.midTerm.toFixed(2)} ₺</span>
                          <span>{stock.priceTargets.models.momentum.longTerm.toFixed(2)} ₺</span>
                        </div>
                      </div>
                    </div>
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

const DetailRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => {
  const isNoData = value === '-' || value === 'N/A' || value === '' || value === 'null' || value === 'undefined';
  const displayValue = isNoData ? 'Veri bekleniyor...' : value;

  return (
    <div className="detail-row" style={bold ? { background: 'rgba(102, 126, 234, 0.15)', borderLeft: '3px solid #667eea' } : {}}>
      <span className="detail-label" style={bold ? { fontWeight: '700', opacity: 1 } : {}}>{label}</span>
      <span
        className="detail-value"
        style={{
          ...(bold ? { fontWeight: '700', fontSize: '15px' } : {}),
          ...(isNoData ? { color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '12px' } : {})
        }}
      >
        {displayValue}
      </span>
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
};

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

        .price-targets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .price-target-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .target-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .target-label {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.8;
        }

        .target-timeframe {
          font-size: 11px;
          opacity: 0.6;
        }

        .target-price {
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
        }

        .target-potential {
          font-size: 16px;
          font-weight: 600;
        }

        .target-confidence {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }

        .confidence-bar {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .confidence-text {
          font-size: 11px;
          opacity: 0.7;
        }

        .model-breakdown {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .model-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .model-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .model-item:last-child {
          border-bottom: none;
        }

        .model-name {
          font-size: 13px;
          opacity: 0.8;
        }

        .model-values {
          display: flex;
          gap: 16px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
