import React, { useState } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
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
      setError(err.response?.data?.error || 'Hisse verisi alınamadı');
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
              placeholder="Hisse sembolü girin (örn: THYAO, GARAN, AKBNK)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? 'Yükleniyor...' : 'Analiz Et'}
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
          {/* Header - Şirket Bilgisi */}
          <div className="header-card">
            <div className="company-info">
              <h1>{data.companyName}</h1>
              <span className="symbol">{data.symbol}</span>
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
              Son Güncelleme: {formatDate(data.lastUpdated)}
            </div>
          </div>

          {/* Main Grid */}
          <div className="analysis-grid">
            {/* Fiyat Verileri */}
            <div className="card">
              <h2>📊 Fiyat Verileri</h2>
              <div className="data-grid">
                <DataRow label="Anlık Fiyat" value={formatCurrency(data.priceData.currentPrice, 2)} />
                <DataRow label="Gün Açılış" value={formatCurrency(data.tradingData.dailyOpen, 2)} />
                <DataRow label="Gün Yüksek" value={formatCurrency(data.priceData.dayHigh, 2)} />
                <DataRow label="Gün Düşük" value={formatCurrency(data.priceData.dayLow, 2)} />
                <DataRow label="Gün Ortalama" value={formatCurrency(data.priceData.dayAverage, 2)} />
                <DataRow label="7 Gün Yüksek" value={formatCurrency(data.priceData.week1High, 2)} />
                <DataRow label="7 Gün Düşük" value={formatCurrency(data.priceData.week1Low, 2)} />
                <DataRow label="30 Gün Yüksek" value={formatCurrency(data.priceData.day30High, 2)} />
                <DataRow label="30 Gün Düşük" value={formatCurrency(data.priceData.day30Low, 2)} />
                <DataRow label="52 Hafta Yüksek" value={formatCurrency(data.priceData.week52High, 2)} />
                <DataRow label="52 Hafta Düşük" value={formatCurrency(data.priceData.week52Low, 2)} />
                <DataRow
                  label="52 Hafta Değişim"
                  value={formatPercent(data.priceData.week52Change)}
                  color={getChangeColor(data.priceData.week52Change)}
                />
                <DataRow
                  label="52 Hafta Fark (TL)"
                  value={formatCurrency(data.priceData.week52ChangeTL, 2)}
                  color={getChangeColor(data.priceData.week52ChangeTL)}
                />
              </div>
            </div>

            {/* İşlem Verileri */}
            <div className="card">
              <h2>💹 İşlem Verileri</h2>
              <div className="data-grid">
                <DataRow label="Alış" value={formatCurrency(data.tradingData.bid, 2)} />
                <DataRow label="Satış" value={formatCurrency(data.tradingData.ask, 2)} />
                <DataRow label="Hacim" value={formatCompact(data.tradingData.volume)} />
                <DataRow label="Hacim (TL)" value={formatCompact(data.tradingData.volumeTL)} />
                <DataRow label="Lot Büyüklüğü" value={formatNumber(data.tradingData.lotSize)} />
                <DataRow
                  label="Günlük Fark"
                  value={formatCurrency(data.tradingData.dailyChange, 2)}
                  color={getChangeColor(data.tradingData.dailyChange)}
                />
                <DataRow
                  label="Günlük Fark %"
                  value={formatPercent(data.tradingData.dailyChangePercent)}
                  color={getChangeColor(data.tradingData.dailyChangePercent)}
                />
              </div>
            </div>

            {/* Temel Göstergeler */}
            <div className="card">
              <h2>🎯 Temel Göstergeler</h2>
              <div className="data-grid">
                <DataRow label="Piyasa Değeri" value={formatCompact(data.fundamentals.marketCap)} />
                <DataRow
                  label="F/K Oranı"
                  value={formatNumber(data.fundamentals.fk, 2)}
                  color={getPERatioColor(data.fundamentals.fk)}
                />
                <DataRow label="PD/DD" value={formatNumber(data.fundamentals.pdDD, 2)} />
                <DataRow label="FD/FAVO" value={formatNumber(data.fundamentals.fdFAVO, 2)} />
                <DataRow label="PD/EBITDA" value={formatNumber(data.fundamentals.pdEBITDA, 2)} />
                <DataRow label="Hisse Sayısı" value={formatCompact(data.fundamentals.shares)} />
                <DataRow label="Ödenmiş Sermaye" value={formatCompact(data.fundamentals.paidCapital)} />
              </div>
            </div>

            {/* Finansal Tablo */}
            <div className="card">
              <h2>💰 Finansal Tablo ({data.financials.period || 'N/A'})</h2>
              <div className="data-grid">
                <DataRow label="Hasılat" value={formatCompact(data.financials.revenue)} />
                <DataRow label="Brüt Kar" value={formatCompact(data.financials.grossProfit)} />
                <DataRow label="Net Kar" value={formatCompact(data.financials.netIncome)} />
                <DataRow
                  label="Karlılık %"
                  value={formatPercent(data.financials.profitability)}
                  color={getProfitabilityColor(data.financials.profitability)}
                />
                <DataRow label="Öz Sermaye" value={formatCompact(data.financials.equity)} />
                <DataRow label="Toplam Varlıklar" value={formatCompact(data.financials.totalAssets)} />
                <DataRow label="Dönen Varlıklar" value={formatCompact(data.financials.currentAssets)} />
                <DataRow label="Duran Varlıklar" value={formatCompact(data.financials.fixedAssets)} />
                <DataRow label="Kısa Vadeli Borçlar" value={formatCompact(data.financials.shortTermLiabilities)} />
                <DataRow label="Uzun Vadeli Borçlar" value={formatCompact(data.financials.longTermLiabilities)} />
                <DataRow label="KV Banka Kredisi" value={formatCompact(data.financials.shortTermBankLoans)} />
                <DataRow label="UV Banka Kredisi" value={formatCompact(data.financials.longTermBankLoans)} />
                <DataRow label="Ticari Alacaklar" value={formatCompact(data.financials.tradeReceivables)} />
                <DataRow label="Finansal Yatırımlar" value={formatCompact(data.financials.financialInvestments)} />
                <DataRow label="Yatırım Amaçlı GM" value={formatCompact(data.financials.investmentProperty)} />
                <DataRow label="Peşin Ödenmiş Giderler" value={formatCompact(data.financials.prepaidExpenses)} />
                <DataRow label="Ertelenmiş Vergi" value={formatCompact(data.financials.deferredTax)} />
              </div>
            </div>

            {/* Ek Analizler */}
            <div className="card">
              <h2>📈 Ek Analizler</h2>
              <div className="data-grid">
                <DataRow label="Yurtiçi Satış %" value={formatPercent(data.analysis.domesticSalesRatio)} />
                <DataRow label="Yurtdışı Satış %" value={formatPercent(data.analysis.foreignSalesRatio)} />
                <DataRow label="İhracat %" value={formatPercent(data.analysis.exportRatio)} />
                <DataRow label="Ortalama Temettü" value={formatPercent(data.analysis.averageDividend)} />
              </div>
            </div>

            {/* AI Özet (Placeholder) */}
            <div className="card ai-summary">
              <h2>🤖 Hızlı Değerlendirme</h2>
              <div className="summary-content">
                <SummaryItem
                  label="Değerleme"
                  value={getValuationSummary(data.fundamentals.fk)}
                />
                <SummaryItem
                  label="Karlılık"
                  value={getProfitabilitySummary(data.financials.profitability)}
                />
                <SummaryItem
                  label="52 Hafta Performans"
                  value={getPerformanceSummary(data.priceData.week52Change)}
                />
                <SummaryItem
                  label="Borç Durumu"
                  value={getDebtSummary(
                    data.financials.shortTermLiabilities,
                    data.financials.longTermLiabilities,
                    data.financials.equity
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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

        .search-input-group input::placeholder {
          color: rgba(255, 255, 255, 0.4);
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
          transition: transform 0.2s;
        }

        .search-btn:hover:not(:disabled),
        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .search-btn:disabled,
        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .company-info h1 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .symbol {
          font-size: 14px;
          opacity: 0.8;
        }

        .current-price {
          text-align: right;
        }

        .price {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .change {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 18px;
          font-weight: 600;
        }

        .last-updated {
          font-size: 12px;
          opacity: 0.7;
          width: 100%;
          text-align: right;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
        }

        .card h2 {
          font-size: 18px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .data-grid {
          display: grid;
          gap: 12px;
        }

        .ai-summary {
          grid-column: 1 / -1;
        }

        .summary-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }

          .header-card {
            flex-direction: column;
            text-align: center;
          }

          .current-price {
            text-align: center;
          }

          .last-updated {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

// Helper Components
const DataRow: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="data-row">
    <span className="label">{label}</span>
    <span className="value" style={{ color }}>
      {value}
    </span>
    <style jsx>{`
      .data-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .label {
        font-size: 14px;
        opacity: 0.7;
      }

      .value {
        font-size: 14px;
        font-weight: 600;
      }
    `}</style>
  </div>
);

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="summary-item">
    <div className="summary-label">{label}</div>
    <div className="summary-value">{value}</div>
    <style jsx>{`
      .summary-item {
        background: rgba(255, 255, 255, 0.03);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .summary-label {
        font-size: 12px;
        opacity: 0.7;
        margin-bottom: 8px;
      }

      .summary-value {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.5;
      }
    `}</style>
  </div>
);

// Helper Functions
function getValuationSummary(pe: number | null): string {
  if (pe === null) return 'Veri yok';
  if (pe < 0) return '❌ Zarar ediyor';
  if (pe < 10) return '✅ Düşük değerli (potansiyel fırsat)';
  if (pe < 20) return '⚠️ Normal değerleme aralığında';
  return '❌ Yüksek değerli (dikkatli olun)';
}

function getProfitabilitySummary(profitability: number | null): string {
  if (profitability === null) return 'Veri yok';
  if (profitability < 0) return '❌ Zarar ediyor';
  if (profitability < 5) return '⚠️ Düşük karlılık';
  if (profitability < 15) return '✅ Orta düzey karlılık';
  return '✅ Yüksek karlılık';
}

function getPerformanceSummary(change: number | null): string {
  if (change === null) return 'Veri yok';
  if (change < -20) return '📉 Güçlü düşüş trendi';
  if (change < 0) return '📉 Düşüş trendinde';
  if (change < 20) return '📈 Yükseliş trendinde';
  return '📈 Güçlü yükseliş trendi';
}

function getDebtSummary(
  shortTerm: number | null,
  longTerm: number | null,
  equity: number | null
): string {
  if (!shortTerm || !longTerm || !equity) return 'Veri yok';
  const totalDebt = shortTerm + longTerm;
  const debtRatio = totalDebt / equity;

  if (debtRatio < 0.5) return '✅ Düşük borç yükü';
  if (debtRatio < 1) return '⚠️ Orta düzey borç';
  return '❌ Yüksek borç yükü';
}

export default StockAnalysis;
