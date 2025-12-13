import React, { useState } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Target, Activity, BarChart3, Wallet } from 'lucide-react';
import { stockApi } from '../services/api';
import { StockData } from '../types';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompact,
  formatDate,
  getChangeColor,
  getPERatioColor,
  getProfitabilityColor,
} from '../utils/formatters';

const StockAnalysis: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const stockData = await stockApi.getStock(symbol.trim().toUpperCase());
      setData(stockData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Hisse verisi alinamadi');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (data) {
      stockApi.clearStockCache(data.symbol).then(() => {
        handleSearch(new Event('submit') as any);
      });
    }
  };

  return (
    <div className="stock-analysis">
      {/* Search Bar */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <Search size={20} />
            <input
              type="text"
              placeholder="Hisse sembolu girin (orn: THYAO, GARAN, AKBNK)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? 'Yukleniyor...' : 'Analiz Et'}
          </button>
          {data && (
            <button type="button" onClick={handleRefresh} className="refresh-btn" disabled={loading}>
              <RefreshCw size={18} />
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="error-message">
          <strong>Hata:</strong> {error}
        </div>
      )}

      {data && (
        <div className="analysis-content">
          {/* Header - Sirket Bilgisi */}
          <div className="header-card">
            <div className="company-info">
              <h1>{data.companyName}</h1>
              <span className="symbol">{data.symbol}</span>
              {data.sector && <span className="sector-badge">{data.sector}</span>}
            </div>
            <div className="current-price">
              <div className="price">{formatCurrency(data.currentPrice, 2)}</div>
              <div
                className="change"
                style={{ color: getChangeColor(data.tradingData.dailyChangePercent) }}
              >
                {data.tradingData.dailyChangePercent && data.tradingData.dailyChangePercent > 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {formatCurrency(data.tradingData.dailyChange, 2)} (
                {formatPercent(data.tradingData.dailyChangePercent)})
              </div>
            </div>
            <div className="last-updated">
              Son Guncelleme: {formatDate(data.lastUpdated)}
            </div>
          </div>

          {/* Birikim Sinyalleri - Onemli Uyarilar */}
          {data.accumulationSignals && data.accumulationSignals.alerts.length > 0 && (
            <div className="alerts-card">
              <h2><Activity size={18} /> Birikim/Dagitim Sinyalleri</h2>
              <div className="accumulation-status" data-status={data.accumulationSignals.status}>
                <span className="status-label">Durum:</span>
                <span className="status-value">{getAccumulationStatusText(data.accumulationSignals.status)}</span>
                <span className="score">Skor: {data.accumulationSignals.overallScore}/100</span>
              </div>
              <div className="alerts-list">
                {data.accumulationSignals.alerts.map((alert, i) => (
                  <div key={i} className="alert-item">{alert}</div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Analysis */}
          {data.smartAnalysis && (
            <div className="smart-analysis-card">
              <h2><BarChart3 size={18} /> Akilli Analiz</h2>
              <div className="rating-section">
                <div className="rating-badge" data-rating={data.smartAnalysis.rating}>
                  {data.smartAnalysis.rating}
                </div>
                <div className="overall-score">
                  Genel Skor: <strong>{data.smartAnalysis.overallScore}/100</strong>
                </div>
              </div>

              <div className="scores-grid">
                <ScoreBar label="Degerleme" score={data.smartAnalysis.valuationScore} />
                <ScoreBar label="Karlilik" score={data.smartAnalysis.profitabilityScore} />
                <ScoreBar label="Likidite" score={data.smartAnalysis.liquidityScore} />
                <ScoreBar label="Borclanma" score={data.smartAnalysis.leverageScore} />
              </div>

              {data.smartAnalysis.strengths.length > 0 && (
                <div className="analysis-section">
                  <h4>Guclu Yonler</h4>
                  {data.smartAnalysis.strengths.map((s, i) => (
                    <div key={i} className="strength-item">{s}</div>
                  ))}
                </div>
              )}

              {data.smartAnalysis.weaknesses.length > 0 && (
                <div className="analysis-section">
                  <h4>Zayif Yonler</h4>
                  {data.smartAnalysis.weaknesses.map((w, i) => (
                    <div key={i} className="weakness-item">{w}</div>
                  ))}
                </div>
              )}

              {data.smartAnalysis.warnings.length > 0 && (
                <div className="analysis-section warnings">
                  <h4><AlertTriangle size={14} /> Uyarilar</h4>
                  {data.smartAnalysis.warnings.map((w, i) => (
                    <div key={i} className="warning-item">{w}</div>
                  ))}
                </div>
              )}

              {data.smartAnalysis.recommendations.length > 0 && (
                <div className="analysis-section recommendations">
                  <h4>Oneriler</h4>
                  {data.smartAnalysis.recommendations.map((r, i) => (
                    <div key={i} className="recommendation-item">{r}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Al/Sat Seviyeleri ve Fiyat Hedefleri */}
          {data.priceTargets && (
            <div className="price-targets-card">
              <h2><Target size={18} /> Fiyat Hedefleri ve Al/Sat Seviyeleri</h2>

              <div className="targets-grid">
                <div className="target-box">
                  <div className="target-label">Kisa Vade ({data.priceTargets.shortTerm.timeframe})</div>
                  <div className="target-price">{formatCurrency(data.priceTargets.shortTerm.target, 2)}</div>
                  <div className="target-potential" style={{ color: getChangeColor(data.priceTargets.shortTerm.potential) }}>
                    {data.priceTargets.shortTerm.potential > 0 ? '+' : ''}{data.priceTargets.shortTerm.potential.toFixed(1)}%
                  </div>
                  <div className="target-confidence">Guven: {data.priceTargets.shortTerm.confidence}%</div>
                </div>

                <div className="target-box">
                  <div className="target-label">Orta Vade ({data.priceTargets.midTerm.timeframe})</div>
                  <div className="target-price">{formatCurrency(data.priceTargets.midTerm.target, 2)}</div>
                  <div className="target-potential" style={{ color: getChangeColor(data.priceTargets.midTerm.potential) }}>
                    {data.priceTargets.midTerm.potential > 0 ? '+' : ''}{data.priceTargets.midTerm.potential.toFixed(1)}%
                  </div>
                  <div className="target-confidence">Guven: {data.priceTargets.midTerm.confidence}%</div>
                </div>

                <div className="target-box">
                  <div className="target-label">Uzun Vade ({data.priceTargets.longTerm.timeframe})</div>
                  <div className="target-price">{formatCurrency(data.priceTargets.longTerm.target, 2)}</div>
                  <div className="target-potential" style={{ color: getChangeColor(data.priceTargets.longTerm.potential) }}>
                    {data.priceTargets.longTerm.potential > 0 ? '+' : ''}{data.priceTargets.longTerm.potential.toFixed(1)}%
                  </div>
                  <div className="target-confidence">Guven: {data.priceTargets.longTerm.confidence}%</div>
                </div>
              </div>

              {data.priceTargets.buyLevels && data.priceTargets.sellLevels && (
                <div className="levels-grid">
                  <div className="buy-levels">
                    <h4><Wallet size={14} /> Alim Seviyeleri</h4>
                    <div className="level-row strong-buy">
                      <span>Guclu Alim:</span>
                      <span>{formatCurrency(data.priceTargets.buyLevels.strong, 2)}</span>
                    </div>
                    <div className="level-row moderate-buy">
                      <span>Orta Alim:</span>
                      <span>{formatCurrency(data.priceTargets.buyLevels.moderate, 2)}</span>
                    </div>
                    <div className="level-row weak-buy">
                      <span>Zayif Alim:</span>
                      <span>{formatCurrency(data.priceTargets.buyLevels.weak, 2)}</span>
                    </div>
                  </div>

                  <div className="sell-levels">
                    <h4><TrendingUp size={14} /> Satim Seviyeleri</h4>
                    <div className="level-row weak-sell">
                      <span>Zayif Satim:</span>
                      <span>{formatCurrency(data.priceTargets.sellLevels.weak, 2)}</span>
                    </div>
                    <div className="level-row moderate-sell">
                      <span>Orta Satim:</span>
                      <span>{formatCurrency(data.priceTargets.sellLevels.moderate, 2)}</span>
                    </div>
                    <div className="level-row strong-sell">
                      <span>Guclu Satim:</span>
                      <span>{formatCurrency(data.priceTargets.sellLevels.strong, 2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Grid */}
          <div className="analysis-grid">
            {/* Fiyat Verileri */}
            <div className="card">
              <h2>Fiyat Verileri</h2>
              <div className="data-grid">
                <DataRow label="Anlik Fiyat" value={formatCurrency(data.priceData.currentPrice, 2)} />
                <DataRow label="Gun Acilis" value={formatCurrency(data.tradingData.dailyOpen, 2)} />
                <DataRow label="Gun Yuksek" value={formatCurrency(data.priceData.dayHigh, 2)} />
                <DataRow label="Gun Dusuk" value={formatCurrency(data.priceData.dayLow, 2)} />
                <DataRow label="Gun Ortalama" value={formatCurrency(data.priceData.dayAverage, 2)} />
                <DataRow label="52 Hafta Yuksek" value={formatCurrency(data.priceData.week52High, 2)} />
                <DataRow label="52 Hafta Dusuk" value={formatCurrency(data.priceData.week52Low, 2)} />
                <DataRow
                  label="52 Hafta Degisim"
                  value={formatPercent(data.priceData.week52Change)}
                  color={getChangeColor(data.priceData.week52Change)}
                />
              </div>
            </div>

            {/* Islem Verileri */}
            <div className="card">
              <h2>Islem Verileri</h2>
              <div className="data-grid">
                <DataRow label="Alis" value={formatCurrency(data.tradingData.bid, 2)} />
                <DataRow label="Satis" value={formatCurrency(data.tradingData.ask, 2)} />
                <DataRow label="Hacim" value={formatCompact(data.tradingData.volume)} />
                <DataRow label="Hacim (TL)" value={formatCompact(data.tradingData.volumeTL)} />
                <DataRow
                  label="Gunluk Fark"
                  value={formatCurrency(data.tradingData.dailyChange, 2)}
                  color={getChangeColor(data.tradingData.dailyChange)}
                />
                <DataRow
                  label="Gunluk Fark %"
                  value={formatPercent(data.tradingData.dailyChangePercent)}
                  color={getChangeColor(data.tradingData.dailyChangePercent)}
                />
              </div>
            </div>

            {/* Temel Gostergeler */}
            <div className="card">
              <h2>Temel Gostergeler</h2>
              <div className="data-grid">
                <DataRow label="Piyasa Degeri" value={formatCompact(data.fundamentals.marketCap)} />
                <DataRow
                  label="F/K Orani"
                  value={formatNumber(data.fundamentals.fk, 2)}
                  color={getPERatioColor(data.fundamentals.fk)}
                />
                <DataRow label="PD/DD" value={formatNumber(data.fundamentals.pdDD, 2)} />
                <DataRow label="FD/FAVO" value={formatNumber(data.fundamentals.fdFAVO, 2)} />
                <DataRow label="PD/EBITDA" value={formatNumber(data.fundamentals.pdEBITDA, 2)} />
                <DataRow label="Hisse Sayisi" value={formatCompact(data.fundamentals.shares)} />
                <DataRow
                  label="ROE %"
                  value={formatPercent(data.fundamentals.roe)}
                  color={getProfitabilityColor(data.fundamentals.roe)}
                />
                <DataRow
                  label="ROA %"
                  value={formatPercent(data.fundamentals.roa)}
                />
              </div>
            </div>

            {/* Finansal Tablo */}
            <div className="card">
              <h2>Finansal Tablo ({data.financials.period || 'N/A'})</h2>
              <div className="data-grid">
                <DataRow label="Hasilat" value={formatCompact(data.financials.revenue)} />
                <DataRow label="Brut Kar" value={formatCompact(data.financials.grossProfit)} />
                <DataRow label="Net Kar" value={formatCompact(data.financials.netIncome)} />
                <DataRow
                  label="Karlilik %"
                  value={formatPercent(data.financials.profitability)}
                  color={getProfitabilityColor(data.financials.profitability)}
                />
                <DataRow label="Oz Sermaye" value={formatCompact(data.financials.equity)} />
                <DataRow label="Toplam Varliklar" value={formatCompact(data.financials.totalAssets)} />
                <DataRow label="Donen Varliklar" value={formatCompact(data.financials.currentAssets)} />
                <DataRow label="Kisa Vadeli Borclar" value={formatCompact(data.financials.shortTermLiabilities)} />
                <DataRow label="Uzun Vadeli Borclar" value={formatCompact(data.financials.longTermLiabilities)} />
              </div>
            </div>

            {/* Likidite ve Borclanma */}
            <div className="card">
              <h2>Likidite ve Borclanma</h2>
              <div className="data-grid">
                <DataRow label="Cari Oran" value={formatNumber(data.liquidity.currentRatio, 2)} />
                <DataRow label="Asit-Test Orani" value={formatNumber(data.liquidity.acidTestRatio, 2)} />
                <DataRow label="Borc/Oz Sermaye" value={formatNumber(data.leverage.debtToEquity, 2)} />
                <DataRow label="Borc/Varliklar" value={formatNumber(data.leverage.debtToAssets, 2)} />
                <DataRow label="KV Borc Orani %" value={formatPercent(data.leverage.shortTermDebtRatio)} />
                <DataRow label="Isletme Sermayesi" value={formatCompact(data.financials.workingCapital)} />
              </div>
            </div>

            {/* Ek Analizler */}
            <div className="card">
              <h2>Ek Analizler</h2>
              <div className="data-grid">
                <DataRow label="Yurtici Satis %" value={formatPercent(data.analysis.domesticSalesRatio)} />
                <DataRow label="Yurtdisi Satis %" value={formatPercent(data.analysis.foreignSalesRatio)} />
                <DataRow label="Ihracat %" value={formatPercent(data.analysis.exportRatio)} />
                <DataRow label="Ortalama Temettu" value={formatPercent(data.analysis.averageDividend)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .stock-analysis {
          min-height: 100vh;
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .search-section {
          margin-bottom: 30px;
        }

        .search-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-input-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 12px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-input-group input {
          flex: 1;
          background: none;
          border: none;
          color: #fff;
          font-size: 16px;
          outline: none;
        }

        .search-btn,
        .refresh-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .refresh-btn {
          padding: 12px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .header-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .company-info h1 {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .symbol {
          font-size: 14px;
          opacity: 0.8;
          margin-right: 10px;
        }

        .sector-badge {
          background: rgba(255,255,255,0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .current-price {
          text-align: right;
        }

        .price {
          font-size: 32px;
          font-weight: 700;
        }

        .change {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
        }

        .last-updated {
          font-size: 11px;
          opacity: 0.7;
          width: 100%;
          text-align: right;
        }

        /* Alerts Card */
        .alerts-card {
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .alerts-card h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 15px;
          color: #ffa500;
        }

        .accumulation-status {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }

        .accumulation-status[data-status="strong_accumulation"] { border-left: 4px solid #22c55e; }
        .accumulation-status[data-status="accumulation"] { border-left: 4px solid #84cc16; }
        .accumulation-status[data-status="neutral"] { border-left: 4px solid #eab308; }
        .accumulation-status[data-status="distribution"] { border-left: 4px solid #f97316; }
        .accumulation-status[data-status="strong_distribution"] { border-left: 4px solid #ef4444; }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-item {
          padding: 8px 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          font-size: 14px;
        }

        /* Smart Analysis Card */
        .smart-analysis-card {
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .smart-analysis-card h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 15px;
        }

        .rating-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .rating-badge {
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
        }

        .rating-badge[data-rating="Strong Buy"] { background: #22c55e; color: #fff; }
        .rating-badge[data-rating="Buy"] { background: #84cc16; color: #000; }
        .rating-badge[data-rating="Hold"] { background: #eab308; color: #000; }
        .rating-badge[data-rating="Sell"] { background: #f97316; color: #fff; }
        .rating-badge[data-rating="Strong Sell"] { background: #ef4444; color: #fff; }

        .scores-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .analysis-section {
          margin-top: 15px;
          padding: 15px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }

        .analysis-section h4 {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          font-size: 14px;
          opacity: 0.9;
        }

        .strength-item { color: #22c55e; padding: 4px 0; font-size: 13px; }
        .weakness-item { color: #f97316; padding: 4px 0; font-size: 13px; }
        .warning-item { color: #ef4444; padding: 4px 0; font-size: 13px; }
        .recommendation-item { color: #60a5fa; padding: 4px 0; font-size: 13px; }

        /* Price Targets Card */
        .price-targets-card {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .price-targets-card h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .targets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .target-box {
          background: rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .target-label {
          font-size: 12px;
          opacity: 0.7;
          margin-bottom: 8px;
        }

        .target-price {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .target-potential {
          font-size: 16px;
          font-weight: 600;
        }

        .target-confidence {
          font-size: 11px;
          opacity: 0.6;
          margin-top: 4px;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .buy-levels, .sell-levels {
          background: rgba(0,0,0,0.2);
          padding: 15px;
          border-radius: 8px;
        }

        .buy-levels h4, .sell-levels h4 {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .level-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          font-size: 13px;
        }

        .strong-buy { color: #22c55e; }
        .moderate-buy { color: #84cc16; }
        .weak-buy { color: #a3e635; }
        .weak-sell { color: #fbbf24; }
        .moderate-sell { color: #f97316; }
        .strong-sell { color: #ef4444; }

        /* Main Grid */
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }

        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .card h2 {
          font-size: 16px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .data-grid {
          display: grid;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .analysis-grid { grid-template-columns: 1fr; }
          .targets-grid { grid-template-columns: 1fr; }
          .levels-grid { grid-template-columns: 1fr; }
          .scores-grid { grid-template-columns: repeat(2, 1fr); }
          .header-card { flex-direction: column; text-align: center; }
          .current-price { text-align: center; }
        }
      `}</style>
    </div>
  );
};

// Helper Components
const DataRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => {
  const isNoData = value === '-' || value === 'N/A' || value === '';

  return (
    <div className="data-row">
      <span className="label">{label}</span>
      <span className="value" style={{ color: isNoData ? 'rgba(255,255,255,0.3)' : color }}>
        {isNoData ? 'Veri bekleniyor...' : value}
      </span>
      <style>{`
        .data-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .label { font-size: 13px; opacity: 0.7; }
        .value { font-size: 13px; font-weight: 600; }
      `}</style>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 70) return '#22c55e';
    if (s >= 50) return '#eab308';
    if (s >= 30) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="score-bar-container">
      <div className="score-label">{label}</div>
      <div className="score-bar-bg">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: getScoreColor(score) }}
        />
      </div>
      <div className="score-value">{score}</div>
      <style>{`
        .score-bar-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .score-label {
          font-size: 12px;
          opacity: 0.7;
          width: 70px;
        }
        .score-bar-bg {
          flex: 1;
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }
        .score-value {
          font-size: 12px;
          font-weight: 600;
          width: 25px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

// Helper Functions
function getAccumulationStatusText(status: string): string {
  switch (status) {
    case 'strong_accumulation': return 'GUCLU BIRIKIM';
    case 'accumulation': return 'Birikim';
    case 'neutral': return 'Notr';
    case 'distribution': return 'Dagitim';
    case 'strong_distribution': return 'GUCLU DAGITIM';
    default: return status;
  }
}

export default StockAnalysis;
