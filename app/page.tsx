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
const CACHE_DURATION = 60 * 1000 // 缓存1分钟

// 音频状态
interface AudioStatus {
  status: 'not_generated' | 'pending' | 'processing' | 'completed'
  audioUrl: string | null
  progress: number
}

export default function Home() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetchParams, setLastFetchParams] = useState<string>('')

  // 音频状态
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    status: 'not_generated',
    audioUrl: null,
    progress: 0,
  })
  const [audioLoading, setAudioLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('importance')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')

  // 收藏功能
  const [favorites, setFavorites] = useState<number[]>([])

  // 加载收藏列表
  useEffect(() => {
    const saved = localStorage.getItem('news-favorites')
    if (saved) {
      setFavorites(JSON.parse(saved))
    }
  }, [])

  // 保存收藏列表
  useEffect(() => {
    localStorage.setItem('news-favorites', JSON.stringify(favorites))
  }, [favorites])

  // 切换收藏状态
  const toggleFavorite = (newsId: number) => {
    setFavorites((prev) =>
      prev.includes(newsId) ? prev.filter((id) => id !== newsId) : [...prev, newsId]
    )
  }

  // 构建请求参数
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
    
    // 检查缓存
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
        // 更新缓存
        requestCache.set(params, { data: data.data, timestamp: now })
        setLastFetchParams(params)
        setNews(data.data)
      } else {
        console.error('获取新闻失败:', data.error)
      }
    } catch (error) {
      console.error('获取新闻失败:', error)
    } finally {
      setLoading(false)
    }
  }, [buildParams, lastFetchParams])

  // 检查音频状态
  const checkAudioStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/audio/status?date=${selectedDate}`)
      const data = await response.json()

      if (data.success && data.data) {
        setAudioStatus({
          status: data.data.status,
          audioUrl: data.data.audioUrl,
          progress: data.data.progress,
        })
      }
    } catch (error) {
      console.error('检查音频状态失败:', error)
    }
  }, [selectedDate])

  // 触发音频生成
  const triggerAudioGeneration = async () => {
    try {
      setAudioLoading(true)
      const response = await fetch(`/api/audio/status?date=${selectedDate}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        console.log('音频生成任务已加入队列')
        // 开始轮询音频状态
        checkAudioStatus()
      } else {
        console.error('触发音频生成失败:', data.error)
      }
    } catch (error) {
      console.error('触发音频生成失败:', error)
    } finally {
      setAudioLoading(false)
    }
  }

  // 定期检查音频状态
  useEffect(() => {
    checkAudioStatus()
    const interval = setInterval(checkAudioStatus, 10000) // 每10秒检查一次
    return () => clearInterval(interval)
  }, [checkAudioStatus])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  // 过滤和搜索新闻
  const filteredNews = news.filter((item) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.summary && item.summary.toLowerCase().includes(query))

      if (!matchesSearch) return false
    }

    return true
  })

  // 按分类分组
  const domesticNews = filteredNews.filter((n) => n.category === 'DOMESTIC')
  const internationalNews = filteredNews.filter((n) => n.category === 'INTERNATIONAL')

  // 收藏的新闻
  const favoriteNews = filteredNews.filter((n) => favorites.includes(n.id))

  // 播报音频 URL（根据日期构建）
  const dailyAudioUrl = `/audio/daily-news-${selectedDate}.mp3`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Header onFetchNews={fetchNews} />

      <main className="container mx-auto px-4 py-8">
        {/* 控制面板 */}
        <div className="mb-8 space-y-6">
          {/* 日期选择器 */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">选择日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* 收藏切换 */}
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => {
                  if (categoryFilter === 'FAVORITES') {
                    setCategoryFilter('ALL')
                  } else if (favorites.length > 0) {
                    setCategoryFilter('FAVORITES')
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  categoryFilter === 'FAVORITES' || favorites.length > 0
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={categoryFilter === 'FAVORITES' || favorites.length > 0 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {categoryFilter === 'FAVORITES' ? '我的收藏' : favorites.length > 0 ? `收藏 (${favorites.length})` : '收藏'}
              </button>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="max-w-2xl">
            <SearchBar onSearch={setSearchQuery} placeholder="搜索新闻标题、内容或摘要..." />
          </div>

          {/* 筛选面板 */}
          <FilterPanel
            onSortChange={setSortBy}
            onOrderChange={setSortOrder}
            onCategoryChange={(category) => {
              setCategoryFilter(category)
            }}
            currentSort={sortBy}
            currentOrder={sortOrder}
            currentCategory={categoryFilter}
          />

          {/* 统一播报音频播放器 */}
          {!loading && filteredNews.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-800/30">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-blue-400 font-medium">📻 今日新闻播报</span>
                {audioStatus.status === 'completed' && audioStatus.audioUrl && (
                  <span className="text-green-400 text-sm">✓ 音频已就绪</span>
                )}
                {audioStatus.status === 'processing' && (
                  <span className="text-yellow-400 text-sm animate-pulse">生成中 {audioStatus.progress}%</span>
                )}
                {audioStatus.status === 'pending' && (
                  <span className="text-yellow-400 text-sm">等待生成...</span>
                )}
              </div>
              
              {audioStatus.status === 'completed' && audioStatus.audioUrl ? (
                <AudioPlayer src={audioStatus.audioUrl} title="今日新闻播报" />
              ) : (
                <div className="flex items-center gap-3">
                  {audioStatus.status === 'not_generated' ? (
                    <button
                      onClick={triggerAudioGeneration}
                      disabled={audioLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {audioLoading ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          正在提交...
                        </>
                      ) : (
                        <>
                          <span>🎵</span>
                          生成播报音频
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="animate-spin">⏳</span>
                      音频生成中，请稍候...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 加载状态 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-400">加载中...</p>
            </div>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-24 h-24 mx-auto text-gray-700 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p className="text-gray-400 text-lg mb-2">
              {searchQuery
                ? '未找到匹配的新闻'
                : categoryFilter === 'FAVORITES'
                ? '暂无收藏的新闻'
                : '暂无新闻数据'}
            </p>
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? '尝试使用其他关键词搜索'
                : categoryFilter === 'FAVORITES'
                ? '点击新闻卡片上的收藏按钮添加收藏'
                : '点击"手动同步"按钮获取最新新闻'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 收藏的新闻 - 当选择FAVORITES筛选时显示 */}
            {categoryFilter === 'FAVORITES' && favoriteNews.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">❤️</span>
                  我的收藏
                  <span className="text-sm font-normal text-gray-500">
                    ({favoriteNews.length}条)
                  </span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {favoriteNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      news={item}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 收藏的新闻 - 非FAVORITES筛选时显示在顶部 */}
            {categoryFilter !== 'FAVORITES' && favoriteNews.length > 0 && favorites.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">❤️</span>
                  我的收藏
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {favoriteNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      news={item}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 国内新闻 - 非FAVORITES筛选时显示 */}
            {categoryFilter !== 'FAVORITES' && domesticNews.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">🇨🇳</span>
                  国内新闻
                  <span className="text-sm font-normal text-gray-500">
                    ({domesticNews.length}条)
                  </span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {domesticNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      news={item}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

{/* 国际新闻 - 非FAVORITES筛选时显示 */}
            {categoryFilter !== 'FAVORITES' && internationalNews.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">🌍</span>
                  国际新闻
                  <span className="text-sm font-normal text-gray-500">
                    ({internationalNews.length}条)
                  </span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {internationalNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      news={item}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
