'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import NewsCard from '@/components/NewsCard'

interface News {
  id: number
  title: string
  content: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  newsDate: string
  audioUrl: string | null
  script: string | null
}

export default function Home() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchNews()
  }, [selectedDate])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/news?date=${selectedDate}`)
      const data = await response.json()

      if (data.success) {
        setNews(data.data)
      } else {
        console.error('获取新闻失败:', data.error)
      }
    } catch (error) {
      console.error('获取新闻失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      const response = await fetch('/api/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        // 等待几秒后刷新新闻
        setTimeout(() => {
          fetchNews()
        }, 5000)
      } else {
        console.error('同步失败:', data.error)
      }
    } catch (error) {
      console.error('同步失败:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const domesticNews = news.filter(n => n.category === 'DOMESTIC')
  const internationalNews = news.filter(n => n.category === 'INTERNATIONAL')

  return (
    <div className="min-h-screen bg-gray-950">
      <Header onSync={handleSync} isSyncing={isSyncing} />

      <main className="container mx-auto px-4 py-8">
        {/* 日期选择器 */}
        <div className="mb-8">
          <label className="block text-gray-400 text-sm mb-2">选择日期</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">暂无新闻数据</p>
            <p className="text-gray-500 text-sm mt-2">点击"手动同步"按钮获取最新新闻</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 国内新闻 */}
            {domesticNews.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-3xl">🇨🇳</span>
                  国内新闻
                </h2>
                <div className="grid gap-4">
                  {domesticNews.map(item => (
                    <NewsCard key={item.id} news={item} />
                  ))}
                </div>
              </section>
            )}

            {/* 国际新闻 */}
            {internationalNews.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-3xl">🌍</span>
                  国际新闻
                </h2>
                <div className="grid gap-4">
                  {internationalNews.map(item => (
                    <NewsCard key={item.id} news={item} />
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
