import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';

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
  const [showBollinger, setShowBollinger] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [period, setPeriod] = useState<'1mo' | '3mo' | '6mo' | '1y'>('3mo');
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const bollingerSeriesRef = useRef<{
    upper: ISeriesApi<'Line'> | null;
    middle: ISeriesApi<'Line'> | null;
    lower: ISeriesApi<'Line'> | null;
  }>({ upper: null, middle: null, lower: null });

  // Fetch real historical data from backend
  const fetchHistoricalData = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/stocks/${symbol}/historical?period=${period}`);

      if (!response.ok) {
        throw new Error('Historical data fetch failed');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setHistoricalData(result.data);
      } else {
        throw new Error(result.error || 'No data returned');
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Fallback to empty data on error
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, [symbol, period]);

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
        <div className="period-selector">
          <button
            className={period === '1mo' ? 'active' : ''}
            onClick={() => setPeriod('1mo')}
          >
            1 Ay
          </button>
          <button
            className={period === '3mo' ? 'active' : ''}
            onClick={() => setPeriod('3mo')}
          >
            3 Ay
          </button>
          <button
            className={period === '6mo' ? 'active' : ''}
            onClick={() => setPeriod('6mo')}
          >
            6 Ay
          </button>
          <button
            className={period === '1y' ? 'active' : ''}
            onClick={() => setPeriod('1y')}
          >
            1 Yıl
          </button>
        </div>
      </div>
      {loading ? (
        <div className="chart-loading">Grafik yükleniyor...</div>
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

        .period-selector {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.2);
          padding: 4px;
          border-radius: 6px;
        }

        .period-selector button {
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

        .period-selector button:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.05);
        }

        .period-selector button.active {
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
