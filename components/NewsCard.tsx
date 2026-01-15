'use client'

import { useState } from 'react'
import AudioPlayer from './AudioPlayer'

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

interface NewsCardProps {
  news: News
}

export default function NewsCard({ news }: NewsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const categoryLabel = news.category === 'DOMESTIC' ? '国内' : '国际'
  const categoryColor = news.category === 'DOMESTIC' ? 'bg-blue-600' : 'bg-purple-600'

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`${categoryColor} text-white text-xs px-2 py-1 rounded`}>
            {categoryLabel}
          </span>
          <span className="text-gray-400 text-sm">{news.source}</span>
        </div>
        <span className="text-gray-500 text-sm">
          {new Date(news.newsDate).toLocaleDateString('zh-CN')}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-3">{news.title}</h3>

      <p className={`text-gray-300 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
        {news.content}
      </p>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-500 hover:text-blue-400 text-sm mt-2"
      >
        {isExpanded ? '收起' : '展开全文'}
      </button>

      {news.audioUrl && (
        <div className="mt-4">
          <AudioPlayer src={news.audioUrl} title={news.title} />
        </div>
      )}

      {news.script && (
        <div className="mt-4 p-4 bg-gray-900 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">播报文案</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{news.script}</p>
        </div>
      )}
    </div>
  )
}