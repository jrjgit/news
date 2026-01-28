'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import NewsCard from '@/components/NewsCard'
import SearchBar from '@/components/SearchBar'
import AudioPlayer from '@/components/AudioPlayer'
import FilterPanel, {
  SortOption,
  SortOrder,
  CategoryFilter,
} from '@/components/FilterPanel'

interface News {
  id: number
  title: string
  content: string
  summary?: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  importance?: number
  newsDate: string
  audioUrl: string | null
  script: string | null
}

// 请求缓存
const requestCache = new Map<string, { data: News[]; timestamp: number }>()
const CACHE_DURATION = 60 * 1000

interface AudioStatus {
  status: 'not_generated' | 'pending' | 'processing' | 'completed' | 'unavailable'
  audioUrl: string | null
  progress: number
  error?: string
}

export default function Home() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetchParams, setLastFetchParams] = useState<string>('')

  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    status: 'not_generated',
    audioUrl: null,
    progress: 0,
  })
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('importance')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [favorites, setFavorites] = useState<number[]>([])

  // 加载收藏
  useEffect(() => {
    const saved = localStorage.getItem('news-favorites')
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('news-favorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (newsId: number) => {
    setFavorites((prev) =>
      prev.includes(newsId) ? prev.filter((id) => id !== newsId) : [...prev, newsId]
    )
  }

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({
      date: selectedDate,
      sortBy,
      order: sortOrder,
    })
    if (categoryFilter !== 'ALL' && categoryFilter !== 'FAVORITES') {
      params.append('category', categoryFilter)
    }
    return params.toString()
  }, [selectedDate, sortBy, sortOrder, categoryFilter])

  const fetchNews = useCallback(async () => {
    const params = buildParams()
    const now = Date.now()
    const cached = requestCache.get(params)
    if (cached && now - cached.timestamp < CACHE_DURATION && params === lastFetchParams) {
      setNews(cached.data)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/news?${params}`)
      const data = await response.json()

      if (data.success) {
        requestCache.set(params, { data: data.data, timestamp: now })
        setLastFetchParams(params)
        setNews(data.data)
      }
    } catch (error) {
      console.error('获取新闻失败:', error)
    } finally {
      setLoading(false)
    }
  }, [buildParams, lastFetchParams])

  const checkAudioStatus = useCallback(async () => {
    if (audioUnavailable) return
    try {
      const response = await fetch(`/api/audio/status?date=${selectedDate}`)
      const data = await response.json()
      if (data.success && data.data) {
        setAudioStatus({
          status: data.data.status,
          audioUrl: data.data.audioUrl,
          progress: data.data.progress,
        })
      } else if (data.error?.includes('KV')) {
        setAudioUnavailable(true)
        setAudioStatus({ status: 'unavailable', audioUrl: null, progress: 0 })
      }
    } catch (error) {
      console.error('检查音频状态失败:', error)
    }
  }, [selectedDate, audioUnavailable])

  const triggerAudioGeneration = async () => {
    if (audioUnavailable) return
    try {
      setAudioLoading(true)
      const response = await fetch(`/api/audio/status?date=${selectedDate}`, { method: 'POST' })
      const data = await response.json()
      if (data.success) checkAudioStatus()
    } catch (error) {
      console.error('触发音频生成失败:', error)
    } finally {
      setAudioLoading(false)
    }
  }

  useEffect(() => {
    if (audioUnavailable) return
    checkAudioStatus()
    const interval = setInterval(checkAudioStatus, 10000)
    return () => clearInterval(interval)
  }, [checkAudioStatus, audioUnavailable])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const filteredNews = news.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      (item.summary && item.summary.toLowerCase().includes(query))
    )
  })

  const domesticNews = filteredNews.filter((n) => n.category === 'DOMESTIC')
  const internationalNews = filteredNews.filter((n) => n.category === 'INTERNATIONAL')
  const favoriteNews = filteredNews.filter((n) => favorites.includes(n.id))

  const renderSection = (title: string, icon: string, items: News[], showEmpty = true) => {
    if (items.length === 0 && !showEmpty) return null
    return (
      <section className="animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium">
            {items.length}
          </span>
        </div>
        <div className="grid gap-4">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              news={item}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header onFetchNews={fetchNews} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="space-y-4 mb-8">
          {/* Date & Favorites Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/60 rounded-xl px-4 py-2.5 border border-white/[0.06]">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setCategoryFilter(categoryFilter === 'FAVORITES' ? 'ALL' : 'FAVORITES')}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${categoryFilter === 'FAVORITES'
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                  : 'bg-zinc-900/60 text-zinc-400 border border-white/[0.06] hover:text-zinc-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill={categoryFilter === 'FAVORITES' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {categoryFilter === 'FAVORITES' ? '我的收藏' : favorites.length > 0 ? `收藏 (${favorites.length})` : '收藏'}
            </button>
          </div>

          {/* Search */}
          <SearchBar onSearch={setSearchQuery} />

          {/* Filters */}
          <FilterPanel
            onSortChange={setSortBy}
            onOrderChange={setSortOrder}
            onCategoryChange={setCategoryFilter}
            currentSort={sortBy}
            currentOrder={sortOrder}
            currentCategory={categoryFilter}
          />

          {/* Audio Player */}
          {!loading && filteredNews.length > 0 && !audioUnavailable && (
            <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl p-5 border border-blue-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">今日新闻播报</h3>
                    {audioStatus.status === 'completed' && audioStatus.audioUrl && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        音频已就绪
                      </span>
                    )}
                    {audioStatus.status === 'processing' && (
                      <span className="text-xs text-amber-400">生成中 {audioStatus.progress}%</span>
                    )}
                  </div>
                </div>

                {audioStatus.status === 'not_generated' && (
                  <button
                    onClick={triggerAudioGeneration}
                    disabled={audioLoading}
                    className="btn btn-primary text-xs py-2"
                  >
                    {audioLoading ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        处理中...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        生成音频
                      </>
                    )}
                  </button>
                )}
              </div>

              {audioStatus.status === 'completed' && audioStatus.audioUrl && (
                <AudioPlayer src={audioStatus.audioUrl} title="今日新闻播报" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
                <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
              <p className="text-zinc-500 text-sm">加载中...</p>
            </div>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-lg mb-2">
              {searchQuery ? '未找到匹配的新闻' : categoryFilter === 'FAVORITES' ? '暂无收藏' : '暂无新闻'}
            </p>
            <p className="text-zinc-600 text-sm">
              {searchQuery ? '尝试其他关键词' : categoryFilter === 'FAVORITES' ? '点击收藏按钮添加' : '点击同步获取新闻'}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {categoryFilter === 'FAVORITES' && favoriteNews.length > 0 && (
              renderSection('我的收藏', '♥', favoriteNews)
            )}

            {categoryFilter !== 'FAVORITES' && favoriteNews.length > 0 && (
              renderSection('我的收藏', '♥', favoriteNews)
            )}

            {categoryFilter !== 'FAVORITES' && domesticNews.length > 0 && (
              renderSection('国内新闻', '◉', domesticNews)
            )}

            {categoryFilter !== 'FAVORITES' && internationalNews.length > 0 && (
              renderSection('国际新闻', '◎', internationalNews)
            )}
          </div>
        )}
      </main>
    </div>
  )
}
