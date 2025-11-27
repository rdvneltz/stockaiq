'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import ws from '@/lib/websocket'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const [signals, setSignals] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const socket = ws.connect()

    socket.on('trading_signal', (data: any) => {
      console.log('New signal:', data)
    })

    return () => {
      ws.disconnect()
    }
  }, [])

  const loadData = async () => {
    try {
      const [signalsRes, watchlistRes] = await Promise.all([
        api.get('/api/signals'),
        api.get('/api/watchlist'),
      ])
      setSignals(signalsRes.data.data.slice(0, 10))
      setWatchlist(watchlistRes.data.data.symbols || [])

      if (watchlistRes.data.data.symbols) {
        ws.subscribe(watchlistRes.data.data.symbols)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Real-time piyasa özeti ve sinyaller</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Toplam Sinyal</span>
            <AlertCircle className="text-blue-500" size={24} />
          </div>
          <div className="text-3xl font-bold">{signals.length}</div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Al Sinyali</span>
            <TrendingUp className="text-green-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-green-500">
            {signals.filter(s => s.type === 'BUY').length}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Sat Sinyali</span>
            <TrendingDown className="text-red-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-red-500">
            {signals.filter(s => s.type === 'SELL').length}
          </div>
        </div>
      </div>

      {/* Recent Signals */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold mb-4">Son Sinyaller</h2>

        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal._id}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">{signal.symbol}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    signal.type === 'BUY'
                      ? 'bg-green-500/20 text-green-500'
                      : signal.type === 'SELL'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}
                >
                  {signal.type}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Güç</div>
                  <div className="font-bold">{signal.strength}/100</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-400">Fundamental</div>
                  <div className="font-bold">{signal.fundamentalScore}/100</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-400">Teknik</div>
                  <div className="font-bold">{signal.technicalScore}/100</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
