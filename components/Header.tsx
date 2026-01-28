'use client'

import { useState } from 'react'
import SyncProgress from './SyncProgress'

interface HeaderProps {
  onFetchNews: () => void
}

export default function Header({ onFetchNews }: HeaderProps) {
  const [showSyncProgress, setShowSyncProgress] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">每日热点</h1>
              <p className="text-xs text-zinc-500">AI 驱动的新闻播报</p>
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => setShowSyncProgress(true)}
            className="btn btn-primary text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            同步新闻
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
