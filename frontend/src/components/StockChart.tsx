import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';

// Client-side cache for historical data (persists during session)
const historicalDataCache = new Map<string, { data: CandlestickData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika cache

interface StockChartProps {
  symbol: string;
  currentPrice: number;
  dayHigh: number | null;
  dayLow: number | null;
  week52High: number | null;
  week52Low: number | null;
}

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  currentPrice,
  dayHigh,
  dayLow,
  week52High,
  week52Low
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [interval, setInterval] = useState<'1h' | '4h' | '1d' | '1wk' | '1mo'>('1d');
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bollingerSeriesRef = useRef<{
    upper: ISeriesApi<'Line'> | null;
    middle: ISeriesApi<'Line'> | null;
    lower: ISeriesApi<'Line'> | null;
  }>({ upper: null, middle: null, lower: null });

  // Her interval için uygun period'u otomatik belirle
  const getPeriodForInterval = (interval: string): string => {
    switch (interval) {
      case '1h':
        return '5d'; // 1 saatlik için 5 gün yeterli
      case '4h':
        return '1mo'; // 4 saatlik için 1 ay
      case '1d':
        return '6mo'; // Günlük için 6 ay
      case '1wk':
        return '2y'; // Haftalık için 2 yıl
      case '1mo':
        return '5y'; // Aylık için 5 yıl
      default:
        return '6mo';
    }
  };

  // Fetch real historical data from backend with caching and abort support
  const fetchHistoricalData = useCallback(async () => {
    const cacheKey = `${symbol}-${interval}`;

    // Check cache first
    const cached = historicalDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setHistoricalData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const period = getPeriodForInterval(interval);

      const response = await fetch(
        `${API_BASE_URL}/stocks/${symbol}/historical?period=${period}&interval=${interval}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error('Historical data fetch failed');
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Store in cache
        historicalDataCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
        setHistoricalData(result.data);
      } else {
        console.warn('No data returned from API');
        setHistoricalData([]);
      }
    } catch (err: any) {
      // Don't log abort errors - they're intentional
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error fetching historical data:', err);
      setError('Grafik verisi yüklenemedi');
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    fetchHistoricalData();

    // Cleanup: cancel pending request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHistoricalData]);

  // Calculate Bollinger Bands
  const calculateBollingerBands = (data: CandlestickData[], period: number = 20, stdDev: number = 2) => {
    const upper: LineData[] = [];
    const middle: LineData[] = [];
    const lower: LineData[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const closes = slice.map(d => d.close);
      const avg = closes.reduce((a, b) => a + b, 0) / period;
      const variance = closes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
      const std = Math.sqrt(variance);

      middle.push({ time: data[i].time, value: avg });
      upper.push({ time: data[i].time, value: avg + stdDev * std });
      lower.push({ time: data[i].time, value: avg - stdDev * std });
    }

    return { upper, middle, lower };
  };

  // Calculate Fibonacci levels
  const calculateFibonacciLevels = () => {
    if (!week52High || !week52Low) return [];

    const diff = week52High - week52Low;
    const levels = [
      { level: 0, price: week52Low, label: '0.0%' },
      { level: 0.236, price: week52Low + diff * 0.236, label: '23.6%' },
      { level: 0.382, price: week52Low + diff * 0.382, label: '38.2%' },
      { level: 0.5, price: week52Low + diff * 0.5, label: '50.0%' },
      { level: 0.618, price: week52Low + diff * 0.618, label: '61.8%' },
      { level: 0.786, price: week52Low + diff * 0.786, label: '78.6%' },
      { level: 1, price: week52High, label: '100.0%' }
    ];

    return levels;
  };

  useEffect(() => {
    if (!chartContainerRef.current || historicalData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Use real historical data from API
    candlestickSeries.setData(historicalData);
    candlestickSeriesRef.current = candlestickSeries;

    // Add Bollinger Bands
    if (showBollinger) {
      const bollinger = calculateBollingerBands(historicalData);

      const upperBand = chart.addLineSeries({
        color: 'rgba(102, 126, 234, 0.5)',
        lineWidth: 1,
        priceLineVisible: false,
      });
      upperBand.setData(bollinger.upper);
      bollingerSeriesRef.current.upper = upperBand;

      const middleBand = chart.addLineSeries({
        color: 'rgba(251, 191, 36, 0.8)',
        lineWidth: 2,
        priceLineVisible: false,
      });
      middleBand.setData(bollinger.middle);
      bollingerSeriesRef.current.middle = middleBand;

      const lowerBand = chart.addLineSeries({
        color: 'rgba(102, 126, 234, 0.5)',
        lineWidth: 1,
        priceLineVisible: false,
      });
      lowerBand.setData(bollinger.lower);
      bollingerSeriesRef.current.lower = lowerBand;
    }

    // Add Fibonacci levels as price lines
    if (showFibonacci && week52High && week52Low) {
      const fibLevels = calculateFibonacciLevels();
      fibLevels.forEach(fib => {
        candlestickSeries.createPriceLine({
          price: fib.price,
          color: 'rgba(255, 152, 0, 0.5)',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `Fib ${fib.label}`,
        });
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [historicalData, showBollinger, showFibonacci, week52High, week52Low]);

  return (
    <div className="stock-chart-container">
      <div className="chart-controls">
        <div className="controls-left">
          <label className="control-label">
            <input
              type="checkbox"
              checked={showBollinger}
              onChange={(e) => setShowBollinger(e.target.checked)}
            />
            <span>Bollinger Bands</span>
          </label>
          <label className="control-label">
            <input
              type="checkbox"
              checked={showFibonacci}
              onChange={(e) => setShowFibonacci(e.target.checked)}
            />
            <span>Fibonacci Retracement</span>
          </label>
        </div>
        <div className="interval-selector">
          <button
            className={interval === '1h' ? 'active' : ''}
            onClick={() => setInterval('1h')}
            title="1 Saatlik mumlar"
          >
            1 Saat
          </button>
          <button
            className={interval === '4h' ? 'active' : ''}
            onClick={() => setInterval('4h')}
            title="4 Saatlik mumlar"
          >
            4 Saat
          </button>
          <button
            className={interval === '1d' ? 'active' : ''}
            onClick={() => setInterval('1d')}
            title="Günlük mumlar"
          >
            Günlük
          </button>
          <button
            className={interval === '1wk' ? 'active' : ''}
            onClick={() => setInterval('1wk')}
            title="Haftalık mumlar"
          >
            Haftalık
          </button>
          <button
            className={interval === '1mo' ? 'active' : ''}
            onClick={() => setInterval('1mo')}
            title="Aylık mumlar"
          >
            Aylık
          </button>
        </div>
      </div>
      {loading ? (
        <div className="chart-loading">Grafik yükleniyor...</div>
      ) : historicalData.length === 0 ? (
        <div className="chart-no-data">
          <div className="no-data-icon">📊</div>
          <div className="no-data-message">
            {(interval === '1h' || interval === '4h')
              ? 'Gün içi veriler için API yapılandırması gerekli. Lütfen günlük, haftalık veya aylık grafik seçin.'
              : 'Bu sembol için grafik verisi bulunamadı.'}
          </div>
          {(interval === '1h' || interval === '4h') && (
            <div className="no-data-suggestion">
              <button onClick={() => setInterval('1d')}>Günlük Grafiğe Geç</button>
            </div>
          )}
        </div>
      ) : (
        <div ref={chartContainerRef} className="chart-wrapper" />
      )}
      <div className="chart-info">
        <div className="info-item">
          <span className="info-label">Güncel:</span>
          <span className="info-value">{currentPrice.toFixed(2)} ₺</span>
        </div>
        {dayHigh && (
          <div className="info-item">
            <span className="info-label">Gün Yüksek:</span>
            <span className="info-value">{dayHigh.toFixed(2)} ₺</span>
          </div>
        )}
        {dayLow && (
          <div className="info-item">
            <span className="info-label">Gün Düşük:</span>
            <span className="info-value">{dayLow.toFixed(2)} ₺</span>
          </div>
        )}
      </div>

      <style>{`
        .stock-chart-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chart-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .controls-left {
          display: flex;
          gap: 20px;
        }

        .interval-selector {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.2);
          padding: 4px;
          border-radius: 6px;
        }

        .interval-selector button {
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .interval-selector button:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.05);
        }

        .interval-selector button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .chart-loading {
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          opacity: 0.7;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .chart-no-data {
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 32px;
          text-align: center;
        }

        .no-data-icon {
          font-size: 48px;
          opacity: 0.3;
        }

        .no-data-message {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          max-width: 300px;
          line-height: 1.5;
        }

        .no-data-suggestion button {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .no-data-suggestion button:hover {
          transform: translateY(-2px);
        }

        .control-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          user-select: none;
        }

        .control-label input[type="checkbox"] {
          cursor: pointer;
        }

        .chart-wrapper {
          border-radius: 8px;
          overflow: hidden;
        }

        .chart-info {
          display: flex;
          gap: 24px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .info-item {
          display: flex;
          gap: 8px;
        }

        .info-label {
          font-size: 13px;
          opacity: 0.7;
        }

        .info-value {
          font-size: 13px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .chart-controls {
            flex-direction: column;
            gap: 12px;
          }

          .chart-info {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default StockChart;
