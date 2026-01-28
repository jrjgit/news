'use client'

import { useState, useEffect, useCallback } from 'react'
import { NewsCard } from '@/components/NewsCard'
import { AudioPlayer } from '@/components/AudioPlayer'

interface News {
  id: string
  title: string
  summary: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  importance: number
  audioUrl: string | null
  audioUrls: string | null
}

export default function Home() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ percent: 0, message: '' })
  const [audioUrls, setAudioUrls] = useState<string[]>([])

  // 加载新闻
  const loadNews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/news?date=${date}`)
      const data = await res.json()
      console.log('[Page] 加载新闻:', data)
      setNews(data.news || [])
      
      // 解析音频URLs
      const firstNews = data.news?.[0]
      console.log('[Page] 第一条新闻:', firstNews)
      if (firstNews?.audioUrls) {
        try {
          const urls = JSON.parse(firstNews.audioUrls)
          console.log('[Page] 解析音频URLs:', urls)
          setAudioUrls(urls)
        } catch (e) {
          console.error('[Page] 解析音频URLs失败:', e)
          setAudioUrls(firstNews.audioUrl ? [firstNews.audioUrl] : [])
        }
      } else if (firstNews?.audioUrl) {
        setAudioUrls([firstNews.audioUrl])
      } else {
        setAudioUrls([])
      }
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadNews()
  }, [loadNews])

  // 生成日报
  const generate = async () => {
    setGenerating(true)
    setProgress({ percent: 0, message: '开始生成...' })

    // 启动生成
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }).catch(console.error)

    // SSE 监听进度
    const es = new EventSource(`/api/job/stream?date=${date}`)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setProgress({ percent: data.progress, message: data.message })

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'done') {
        es.close()
        setGenerating(false)
        // 延迟一下再加载，确保数据库已更新
        setTimeout(() => loadNews(), 500)
      }
    }

    es.onerror = () => {
      es.close()
      setGenerating(false)
    }
  }

  // 生成音频
  const [audioGenerating, setAudioGenerating] = useState(false)

  const generateAudio = async () => {
    setAudioGenerating(true)
    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()

      if (data.success && data.audioUrls) {
        setAudioUrls(data.audioUrls)
      } else {
        console.error('生成音频失败:', data.error)
        alert(data.error || '生成音频失败')
      }
    } catch (error) {
      console.error('生成音频错误:', error)
      alert('生成音频失败，请重试')
    } finally {
      setAudioGenerating(false)
    }
  }

  const domestic = news.filter(n => n.category === 'DOMESTIC')
  const international = news.filter(n => n.category === 'INTERNATIONAL')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              每日新闻播报
            </h1>
            <p className="text-slate-400 text-sm mt-1">AI 生成 · 自动播报</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={generate}
              disabled={generating}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-all"
            >
              {generating ? '生成中...' : '生成日报'}
            </button>
          </div>
        </header>

        {/* Progress */}
        {generating && (
          <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">{progress.message}</span>
              <span className="text-blue-400">{progress.percent}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Audio Player */}
        {news.length > 0 && (
          <div className="mb-8">
            <AudioPlayer
              urls={audioUrls}
              onGenerate={audioUrls.length === 0 ? generateAudio : undefined}
              generating={audioGenerating}
            />
          </div>
        )}

        {/* News List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p>暂无新闻</p>
            <button
              onClick={generate}
              className="mt-4 text-blue-400 hover:text-blue-300 underline"
            >
              点击生成日报
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Domestic */}
            {domestic.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full" />
                  国内新闻
                  <span className="text-sm font-normal text-slate-500">({domestic.length})</span>
                </h2>
                <div className="space-y-3">
                  {domestic.map((item) => (
                    <NewsCard key={item.id} news={item} />
                  ))}
                </div>
              </section>
            )}

            {/* International */}
            {international.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-purple-500 rounded-full" />
                  国际新闻
                  <span className="text-sm font-normal text-slate-500">({international.length})</span>
                </h2>
                <div className="space-y-3">
                  {international.map((item) => (
                    <NewsCard key={item.id} news={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
