'use client'

import { useState } from 'react'
import Link from 'next/link'

interface News {
  id: number
  title: string
  content: string
  translatedContent?: string | null
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

  const isDomestic = news.category === 'DOMESTIC'
  const displayContent = !isDomestic && news.translatedContent 
    ? news.translatedContent 
    : news.content

  return (
    <article className="group relative bg-zinc-900/40 rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] hover:bg-zinc-900/60 transition-all duration-300">
      {/* Gradient Border Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />
      
      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Badge */}
            <span className={`
              inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold
              ${isDomestic 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }
            `}>
              {isDomestic ? '国内' : '国际'}
            </span>
            
            {/* Source */}
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              {news.source}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Importance Stars */}
            {news.importance && news.importance > 0 && (
              <div className="flex items-center gap-0.5" title={`重要性: ${news.importance}/5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-3 h-3 ${star <= news.importance! ? 'text-amber-400' : 'text-zinc-700'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
            
            {/* Date */}
            <time className="text-xs text-zinc-600 font-medium">
              {new Date(news.newsDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </time>
          </div>
        </div>

        {/* Title */}
        <Link href={`/news/${news.id}`}>
          <h3 className="text-lg font-bold text-zinc-100 mb-3 leading-snug group-hover:text-blue-400 transition-colors cursor-pointer">
            {news.title}
          </h3>
        </Link>

        {/* AI Summary */}
        {news.summary && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/[0.08] to-purple-500/[0.08] border border-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">AI 摘要</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{news.summary}</p>
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          <p className={`text-sm text-zinc-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
            {displayContent}
          </p>
          {(displayContent?.length || 0) > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  收起内容
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  展开全文
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <Link
            href={`/news/${news.id}`}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 group/link"
          >
            查看详情
            <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isFavorite
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }
              `}
            >
              <svg
                className={`w-4 h-4 transition-all ${isFavorite ? 'scale-110' : ''}`}
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isFavorite ? '已收藏' : '收藏'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
