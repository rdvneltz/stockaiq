'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, Search, TrendingUp, Settings, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            StockAIQ
          </h1>
          <p className="text-xs text-gray-500 mt-1">Real-time BIST Analysis</p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/dashboard/screener"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <Search size={20} />
            <span>Screener</span>
          </Link>

          <Link
            href="/dashboard/signals"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <TrendingUp size={20} />
            <span>Sinyaller</span>
          </Link>

          <Link
            href="/dashboard/strategies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <Settings size={20} />
            <span>Stratejiler</span>
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="absolute bottom-6 left-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/20 transition text-red-500"
        >
          <LogOut size={20} />
          <span>Çıkış</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">{children}</div>
    </div>
  )
}
