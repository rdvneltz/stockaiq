'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function StrategiesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Özel Stratejiler</h1>
        <p className="text-gray-400">Kendi al-sat stratejilerini oluştur ve yönet</p>
      </div>

      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <h2 className="text-xl font-bold mb-4">Strateji Builder Yakında</h2>
        <p className="text-gray-400">
          Özel kriterlere göre stratejiler oluşturabilme özelliği yakında eklenecek.
        </p>
      </div>
    </div>
  )
}
