import React, { useState, useEffect } from 'react';
import { Plus, Trash2, PieChart, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/formatters';

interface PortfolioStock {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  dailyChange?: number;
  totalValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

interface Portfolio {
  _id: string;
  name: string;
  description?: string;
  stocks: PortfolioStock[];
  createdAt: string;
  updatedAt: string;
}

interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  sectorDistribution: { sector: string; value: number; percent: number }[];
  riskMetrics: {
    diversificationScore: number;
    concentrationRisk: string;
    topHolding: { symbol: string; percent: number };
  };
}

const Portfolio: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
  const [newStock, setNewStock] = useState({ symbol: '', quantity: 0, averageCost: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadAnalysis(selectedPortfolio._id);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPortfolios(data.data || []);
        if (data.data?.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load portfolios:', err);
      setError('Portfoyler yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (portfolioId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios/${portfolioId}/analysis`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newPortfolioName, description: newPortfolioDesc }),
      });

      if (response.ok) {
        setNewPortfolioName('');
        setNewPortfolioDesc('');
        setShowAddModal(false);
        loadPortfolios();
      } else {
        const data = await response.json();
        setError(data.error || 'Portfoy olusturulamadi');
      }
    } catch (err) {
      setError('Portfoy olusturulamadi');
    }
  };

  const deletePortfolio = async (id: string) => {
    if (!confirm('Bu portfoyu silmek istediginizden emin misiniz?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setPortfolios(portfolios.filter(p => p._id !== id));
        if (selectedPortfolio?._id === id) {
          setSelectedPortfolio(portfolios.find(p => p._id !== id) || null);
        }
      }
    } catch (err) {
      setError('Portfoy silinemedi');
    }
  };

  const addStock = async () => {
    if (!selectedPortfolio || !newStock.symbol || newStock.quantity <= 0) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios/${selectedPortfolio._id}/stocks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newStock),
        }
      );

      if (response.ok) {
        setNewStock({ symbol: '', quantity: 0, averageCost: 0 });
        setShowAddStockModal(false);
        loadPortfolios();
      } else {
        const data = await response.json();
        setError(data.error || 'Hisse eklenemedi');
      }
    } catch (err) {
      setError('Hisse eklenemedi');
    }
  };

  const removeStock = async (symbol: string) => {
    if (!selectedPortfolio) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portfolios/${selectedPortfolio._id}/stocks/${symbol}`,
        { method: 'DELETE', credentials: 'include' }
      );

      if (response.ok) {
        loadPortfolios();
      }
    } catch (err) {
      setError('Hisse silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner"></div>
        <p>Portfoyler yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <h1><PieChart size={28} /> Portfoy Yonetimi</h1>
        <button className="add-portfolio-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Yeni Portfoy
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)}>x</button>
        </div>
      )}

      <div className="portfolio-content">
        {/* Portfolio List */}
        <div className="portfolio-list">
          <h3>Portfoyler</h3>
          {portfolios.length === 0 ? (
            <div className="empty-state">
              <PieChart size={48} />
              <p>Henuz portfoy olusturmadiniz</p>
              <button onClick={() => setShowAddModal(true)}>Ilk Portfoyunuzu Olusturun</button>
            </div>
          ) : (
            portfolios.map(portfolio => (
              <div
                key={portfolio._id}
                className={`portfolio-item ${selectedPortfolio?._id === portfolio._id ? 'selected' : ''}`}
                onClick={() => setSelectedPortfolio(portfolio)}
              >
                <div className="portfolio-info">
                  <h4>{portfolio.name}</h4>
                  <p>{portfolio.stocks.length} hisse</p>
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePortfolio(portfolio._id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Portfolio Details */}
        {selectedPortfolio && (
          <div className="portfolio-details">
            <div className="details-header">
              <h2>{selectedPortfolio.name}</h2>
              <button className="add-stock-btn" onClick={() => setShowAddStockModal(true)}>
                <Plus size={18} /> Hisse Ekle
              </button>
            </div>

            {/* Analysis Summary */}
            {analysis && (
              <div className="analysis-summary">
                <div className="summary-card">
                  <span className="label">Toplam Deger</span>
                  <span className="value">{formatCurrency(analysis.totalValue, 2)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Toplam Maliyet</span>
                  <span className="value">{formatCurrency(analysis.totalCost, 2)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Kar/Zarar</span>
                  <span className="value" style={{ color: getChangeColor(analysis.totalProfitLoss) }}>
                    {formatCurrency(analysis.totalProfitLoss, 2)} ({formatPercent(analysis.totalProfitLossPercent)})
                  </span>
                </div>
                <div className="summary-card">
                  <span className="label">Cesitlendirme</span>
                  <span className="value">{analysis.riskMetrics.diversificationScore}/100</span>
                </div>
              </div>
            )}

            {/* Stock List */}
            <div className="stock-list">
              <h3>Hisseler</h3>
              {selectedPortfolio.stocks.length === 0 ? (
                <div className="empty-state small">
                  <p>Bu portfoyde hisse yok</p>
                  <button onClick={() => setShowAddStockModal(true)}>Hisse Ekle</button>
                </div>
              ) : (
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Sembol</th>
                      <th>Adet</th>
                      <th>Maliyet</th>
                      <th>Guncel</th>
                      <th>K/Z</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio.stocks.map(stock => (
                      <tr key={stock.symbol}>
                        <td className="symbol">{stock.symbol}</td>
                        <td>{stock.quantity}</td>
                        <td>{formatCurrency(stock.averageCost, 2)}</td>
                        <td>{stock.currentPrice ? formatCurrency(stock.currentPrice, 2) : '-'}</td>
                        <td style={{ color: getChangeColor(stock.profitLossPercent || 0) }}>
                          {stock.profitLossPercent !== undefined ? formatPercent(stock.profitLossPercent) : '-'}
                        </td>
                        <td>
                          <button className="remove-stock-btn" onClick={() => removeStock(stock.symbol)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Portfolio Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Yeni Portfoy Olustur</h3>
            <input
              type="text"
              placeholder="Portfoy Adi"
              value={newPortfolioName}
              onChange={e => setNewPortfolioName(e.target.value)}
            />
            <textarea
              placeholder="Aciklama (opsiyonel)"
              value={newPortfolioDesc}
              onChange={e => setNewPortfolioDesc(e.target.value)}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>Iptal</button>
              <button className="confirm-btn" onClick={createPortfolio}>Olustur</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="modal-overlay" onClick={() => setShowAddStockModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Hisse Ekle</h3>
            <input
              type="text"
              placeholder="Sembol (ornek: THYAO)"
              value={newStock.symbol}
              onChange={e => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
            />
            <input
              type="number"
              placeholder="Adet"
              value={newStock.quantity || ''}
              onChange={e => setNewStock({ ...newStock, quantity: parseInt(e.target.value) || 0 })}
            />
            <input
              type="number"
              placeholder="Ortalama Maliyet (TL)"
              value={newStock.averageCost || ''}
              onChange={e => setNewStock({ ...newStock, averageCost: parseFloat(e.target.value) || 0 })}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAddStockModal(false)}>Iptal</button>
              <button className="confirm-btn" onClick={addStock}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .portfolio-page {
          min-height: 100vh;
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .portfolio-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .portfolio-header h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
        }

        .add-portfolio-btn, .add-stock-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .add-portfolio-btn:hover, .add-stock-btn:hover {
          transform: translateY(-2px);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          margin-bottom: 20px;
        }

        .error-message button {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
        }

        .portfolio-content {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
        }

        .portfolio-list {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .portfolio-list h3 {
          font-size: 16px;
          margin-bottom: 16px;
          opacity: 0.8;
        }

        .portfolio-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .portfolio-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .portfolio-item.selected {
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.5);
        }

        .portfolio-info h4 {
          font-size: 15px;
          margin-bottom: 4px;
        }

        .portfolio-info p {
          font-size: 12px;
          opacity: 0.6;
        }

        .delete-btn, .remove-stock-btn {
          background: rgba(239, 68, 68, 0.2);
          border: none;
          color: #f87171;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
        }

        .delete-btn:hover, .remove-stock-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .portfolio-details {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .details-header h2 {
          font-size: 22px;
        }

        .analysis-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-card .label {
          font-size: 12px;
          opacity: 0.6;
        }

        .summary-card .value {
          font-size: 18px;
          font-weight: 700;
        }

        .stock-list h3 {
          font-size: 16px;
          margin-bottom: 16px;
          opacity: 0.8;
        }

        .stock-table {
          width: 100%;
          border-collapse: collapse;
        }

        .stock-table th, .stock-table td {
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stock-table th {
          font-size: 12px;
          opacity: 0.6;
          font-weight: 600;
        }

        .stock-table .symbol {
          font-weight: 700;
          color: #667eea;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-state svg {
          opacity: 0.3;
          margin-bottom: 16px;
        }

        .empty-state p {
          opacity: 0.6;
          margin-bottom: 16px;
        }

        .empty-state button {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
        }

        .empty-state.small {
          padding: 20px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #1a1f3a;
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }

        .modal h3 {
          margin-bottom: 20px;
        }

        .modal input, .modal textarea {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .modal textarea {
          min-height: 80px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .cancel-btn, .confirm-btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .confirm-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .portfolio-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(102, 126, 234, 0.3);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .portfolio-content {
            grid-template-columns: 1fr;
          }

          .analysis-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
