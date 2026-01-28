'use client'

import { useState, useCallback, useEffect } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = '搜索新闻标题、摘要...' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, onSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
      <div className={`
        relative flex items-center
        bg-zinc-900/80 rounded-xl
        border transition-all duration-300
        ${isFocused 
          ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' 
          : 'border-white/[0.06] hover:border-white/[0.12]'
        }
      `}>
        {/* Search Icon */}
        <div className="absolute left-4 text-zinc-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full py-3 pl-12 pr-10 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
