'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AudioPlayer from '@/components/AudioPlayer'

interface NewsDetail {
  id: number
  title: string
  content: string
  summary?: string
  translatedContent?: string
  originalLink?: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  importance?: number
  newsDate: string
  audioUrl?: string
  script?: string
  createdAt: string
}

export default function NewsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [news, setNews] = useState<NewsDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch(`/api/news/${params.id}`)

        if (!response.ok) {
          throw new Error('新闻不存在')
        }

        const data = await response.json()

        if (data.success) {
          setNews(data.data)
        } else {
          throw new Error(data.error || '获取新闻失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取新闻失败')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchNews()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '新闻不存在'}</p>
          <Link
            href="/"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const categoryLabel = news.category === 'DOMESTIC' ? '国内' : '国际'
  const categoryColor = news.category === 'DOMESTIC' ? 'bg-blue-600' : 'bg-purple-600'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors"
          >
            首页
          </Link>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 新闻头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColor}`}>
              {categoryLabel}新闻
            </span>
            {news.importance && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${
                      star <= news.importance! ? 'text-yellow-500' : 'text-gray-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4">{news.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span>来源：{news.source}</span>
            <span>•</span>
            <span>{new Date(news.newsDate).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        {/* AI摘要 */}
        {news.summary && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-800/50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-blue-400 font-medium">AI摘要</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{news.summary}</p>
          </div>
        )}

        {/* 新闻内容 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">新闻内容</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{news.content}</p>
          </div>
        </div>

        {/* 翻译内容（国际新闻） */}
        {news.translatedContent && news.category === 'INTERNATIONAL' && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">中文翻译</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{news.translatedContent}</p>
            </div>
          </div>
        )}

        {/* 音频播放器 */}
        {news.audioUrl && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-300">语音播报</h2>
            <AudioPlayer src={news.audioUrl} title={news.title} />
          </div>
        )}

        {/* 播报文案 */}
        {news.script && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">播报文案</h2>
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{news.script}</p>
            </div>
          </div>
        )}

        {/* 原文链接 */}
        {news.originalLink && (
          <div className="mb-6">
            <a
              href={news.originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              查看原文
            </a>
          </div>
        )}

        {/* 元数据 */}
        <div className="pt-6 border-t border-gray-800 text-sm text-gray-500">
          <p>创建时间：{new Date(news.createdAt).toLocaleString('zh-CN')}</p>
        </div>
      </main>
    </div>
  )
}