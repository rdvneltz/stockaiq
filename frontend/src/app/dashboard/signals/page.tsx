'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      const { data } = await api.get('/api/signals')
      setSignals(data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400">Yükleniyor...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Al-Sat Sinyalleri</h1>
        <p className="text-gray-400">Tüm aktif trading sinyalleri</p>
      </div>

      <div className="space-y-4">
        {signals.map((signal) => (
          <div
            key={signal._id}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition cursor-pointer"
            onClick={() => window.location.href = `/dashboard/stock/${signal.symbol}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{signal.symbol}</h3>
                <span className={`inline-block mt-2 px-4 py-1 rounded-full font-semibold ${
                  signal.type === 'BUY'
                    ? 'bg-green-500/20 text-green-500'
                    : signal.type === 'SELL'
                    ? 'bg-red-500/20 text-red-500'
                    : 'bg-gray-500/20 text-gray-500'
                }`}>
                  {signal.type}
                </span>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400">Sinyal Gücü</div>
                <div className="text-3xl font-bold">{signal.strength}/100</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Fundamental</div>
                <div className="text-lg font-bold">{signal.fundamentalScore}/100</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Teknik</div>
                <div className="text-lg font-bold">{signal.technicalScore}/100</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Sentiment</div>
                <div className="text-lg font-bold">{signal.sentimentScore}/100</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
