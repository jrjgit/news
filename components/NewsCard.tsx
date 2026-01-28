'use client'

interface News {
  id: string
  title: string
  summary: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  importance: number
}

interface Props {
  news: News
}

export function NewsCard({ news }: Props) {
  const stars = '★'.repeat(news.importance) + '☆'.repeat(5 - news.importance)

  return (
    <div className="group bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-slate-100 group-hover:text-blue-400 transition-colors">
            {news.title}
          </h3>
          <p className="text-slate-400 text-sm mt-2 line-clamp-2">
            {news.summary}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="text-slate-500">{news.source}</span>
            <span className="text-amber-500">{stars}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
