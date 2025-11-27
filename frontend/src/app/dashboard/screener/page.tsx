'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    pbMin: '',
    pbMax: '',
    peMin: '',
    peMax: '',
    roeMin: '',
    debtToEquityMax: '',
  })

  const handleScreen = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/stocks/screen', { filters })
      setStocks(data.data)
      toast.success(`${data.data.length} hisse bulundu`)
    } catch (error: any) {
      toast.error('Tarama hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hisse Tarayıcı</h1>
        <p className="text-gray-400">Özel kriterlere göre hisse filtrele</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
        <h2 className="text-xl font-bold mb-4">Filtreler</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">P/B Min</label>
            <input
              type="number"
              step="0.1"
              value={filters.pbMin}
              onChange={(e) => setFilters({ ...filters, pbMin: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">P/B Max</label>
            <input
              type="number"
              step="0.1"
              value={filters.pbMax}
              onChange={(e) => setFilters({ ...filters, pbMax: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="2.0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">F/K Min</label>
            <input
              type="number"
              step="0.1"
              value={filters.peMin}
              onChange={(e) => setFilters({ ...filters, peMin: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">F/K Max</label>
            <input
              type="number"
              step="0.1"
              value={filters.peMax}
              onChange={(e) => setFilters({ ...filters, peMax: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="15.0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">ROE Min (%)</label>
            <input
              type="number"
              step="1"
              value={filters.roeMin}
              onChange={(e) => setFilters({ ...filters, roeMin: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="15"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Borç/Özkaynak Max</label>
            <input
              type="number"
              step="0.1"
              value={filters.debtToEquityMax}
              onChange={(e) => setFilters({ ...filters, debtToEquityMax: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="0.5"
            />
          </div>
        </div>

        <button
          onClick={handleScreen}
          disabled={loading}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:opacity-50"
        >
          <Search size={20} />
          {loading ? 'Taranıyor...' : 'Hisseleri Tara'}
        </button>
      </div>

      {/* Results */}
      {stocks.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Sonuçlar ({stocks.length})</h2>

          <div className="space-y-2">
            {stocks.map((stock) => (
              <div
                key={stock._id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition cursor-pointer"
                onClick={() => window.location.href = `/dashboard/stock/${stock.symbol}`}
              >
                <div>
                  <div className="font-bold text-lg">{stock.symbol}</div>
                  <div className="text-sm text-gray-400">{stock.name}</div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Fiyat</div>
                    <div className="font-bold">₺{stock.price.toFixed(2)}</div>
                  </div>

                  <div className={`text-right ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <div className="text-sm text-gray-400">Değişim</div>
                    <div className="font-bold">{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
