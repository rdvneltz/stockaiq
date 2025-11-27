'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function StockDetailPage() {
  const params = useParams()
  const symbol = params.symbol as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStockData()
  }, [symbol])

  const loadStockData = async () => {
    try {
      const { data: response } = await api.get(`/api/stocks/${symbol}`)
      setData(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400">Yükleniyor...</div>
  }

  if (!data || !data.stock) {
    return <div className="text-gray-400">Hisse bulunamadı</div>
  }

  const { stock, ratios, technical, signal, sentiments } = data

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{stock.symbol}</h1>
        <p className="text-gray-400">{stock.name}</p>
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Fiyat</div>
          <div className="text-3xl font-bold">₺{stock.price.toFixed(2)}</div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Değişim</div>
          <div className={`text-3xl font-bold ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Hacim</div>
          <div className="text-2xl font-bold">{(stock.volume / 1000000).toFixed(2)}M</div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Piyasa Değeri</div>
          <div className="text-2xl font-bold">₺{(stock.marketCap / 1000000000).toFixed(2)}B</div>
        </div>
      </div>

      {/* Signal */}
      {signal && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold mb-4">Al-Sat Sinyali</h2>

          <div className="flex items-center gap-4 mb-6">
            <span className={`px-6 py-3 rounded-full text-xl font-bold ${
              signal.type === 'BUY'
                ? 'bg-green-500/20 text-green-500'
                : signal.type === 'SELL'
                ? 'bg-red-500/20 text-red-500'
                : 'bg-gray-500/20 text-gray-500'
            }`}>
              {signal.type}
            </span>
            <div>
              <div className="text-sm text-gray-400">Sinyal Gücü</div>
              <div className="text-2xl font-bold">{signal.strength}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Fundamental</div>
              <div className="text-xl font-bold">{signal.fundamentalScore}/100</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Teknik</div>
              <div className="text-xl font-bold">{signal.technicalScore}/100</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Sentiment</div>
              <div className="text-xl font-bold">{signal.sentimentScore}/100</div>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Hedef Fiyatlar:</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Sektör</div>
                <div className="font-bold">₺{signal.targetPriceSector.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Fibonacci</div>
                <div className="font-bold">₺{signal.targetPriceFibonacci.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Destek/Direnç</div>
                <div className="font-bold">₺{signal.targetPriceSupport.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ratios */}
      {ratios && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold mb-4">Finansal Oranlar</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">P/B</div>
              <div className="text-xl font-bold">{ratios.pb.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">F/K</div>
              <div className="text-xl font-bold">{ratios.pe.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">ROE</div>
              <div className="text-xl font-bold">{ratios.roe.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Borç/Özkaynak</div>
              <div className="text-xl font-bold">{ratios.debtToEquity.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Indicators */}
      {technical && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold mb-4">Teknik İndikatörler</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">RSI</div>
              <div className="text-xl font-bold">{technical.rsi.toFixed(1)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">MACD</div>
              <div className="text-xl font-bold">{technical.macd.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">SMA 50</div>
              <div className="text-xl font-bold">₺{technical.sma50.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Bollinger Üst</div>
              <div className="text-xl font-bold">₺{technical.bollingerUpper.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sentiments */}
      {sentiments && sentiments.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Son Haberler ve Sentiment</h2>

          <div className="space-y-3">
            {sentiments.slice(0, 5).map((sent: any, i: number) => (
              <div key={i} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-bold">{sent.title}</div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    sent.sentiment > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {sent.sentiment > 0 ? '+' : ''}{sent.sentiment}
                  </span>
                </div>
                <div className="text-sm text-gray-400">{sent.source} • {sent.importance}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
