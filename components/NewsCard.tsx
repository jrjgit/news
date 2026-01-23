'use client'

import { useState } from 'react'
import Link from 'next/link'

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

interface NewsCardProps {
  news: News
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export default function NewsCard({ news, isFavorite = false, onToggleFavorite }: NewsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const categoryLabel = news.category === 'DOMESTIC' ? '国内' : '国际'
  const categoryColor = news.category === 'DOMESTIC' ? 'bg-blue-600' : 'bg-purple-600'

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-gray-700/50">
      {/* 顶部信息栏 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`${categoryColor} text-white text-xs px-3 py-1 rounded-full font-medium`}>
            {categoryLabel}新闻
          </span>
          <span className="text-gray-400 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            {news.source}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 重要性星级 */}
          {news.importance && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-3.5 h-3.5 ${
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
          <span className="text-gray-500 text-sm">
            {new Date(news.newsDate).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>

      {/* 标题 */}
      <Link href={`/news/${news.id}`}>
        <h3 className="text-xl font-bold text-white mb-3 hover:text-blue-400 transition-colors cursor-pointer">
          {news.title}
        </h3>
      </Link>

      {/* AI摘要 */}
      {news.summary && (
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-blue-400 text-xs font-medium">AI摘要</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{news.summary}</p>
        </div>
      )}

      {/* 新闻内容 */}
      <div className="mb-3">
        <p className={`text-gray-300 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
          {news.content}
        </p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-500 hover:text-blue-400 text-sm mt-2 flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              收起
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              展开全文
            </>
          )}
        </button>
      </div>

      {/* 底部操作栏 */}
      <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between">
        <Link
          href={`/news/${news.id}`}
          className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm transition-colors"
        >
          查看详情
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* 收藏按钮 */}
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isFavorite
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill={isFavorite ? 'currentColor' : 'none'}
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
            {isFavorite ? '已收藏' : '收藏'}
          </button>
        )}
      </div>
    </div>
  )
}