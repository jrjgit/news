'use client'

import { useState } from 'react'
import SyncProgress from './SyncProgress'

interface HeaderProps {
  onFetchNews: () => void
}

export default function Header({ onFetchNews }: HeaderProps) {
  const [showSyncProgress, setShowSyncProgress] = useState(false)

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">每日热点新闻播报</h1>
            <p className="text-gray-400 text-sm mt-1">
              自动聚合每日热点新闻并生成播客风格播报
            </p>
          </div>
          <button
            onClick={() => setShowSyncProgress(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            手动同步
          </button>
        </div>
      </div>

      {showSyncProgress && (
        <SyncProgress
          onComplete={() => {
            setShowSyncProgress(false)
            onFetchNews()
          }}
          onClose={() => setShowSyncProgress(false)}
        />
      )}
    </header>
  )
}