'use client'

import { useState } from 'react'

export type SortOption = 'importance' | 'createdAt' | 'newsDate'
export type SortOrder = 'asc' | 'desc'
export type CategoryFilter = 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FAVORITES'

interface FilterPanelProps {
  onSortChange: (option: SortOption) => void
  onOrderChange: (order: SortOrder) => void
  onCategoryChange: (category: CategoryFilter) => void
  currentSort: SortOption
  currentOrder: SortOrder
  currentCategory: CategoryFilter
}

const categoryOptions = [
  { value: 'ALL' as CategoryFilter, label: '全部', icon: '⊕' },
  { value: 'DOMESTIC' as CategoryFilter, label: '国内', icon: '◉' },
  { value: 'INTERNATIONAL' as CategoryFilter, label: '国际', icon: '◎' },
  { value: 'FAVORITES' as CategoryFilter, label: '收藏', icon: '♥' },
]

const sortOptions = [
  { value: 'importance' as SortOption, label: '重要性' },
  { value: 'createdAt' as SortOption, label: '发布时间' },
  { value: 'newsDate' as SortOption, label: '新闻日期' },
]

export default function FilterPanel({
  onSortChange,
  onOrderChange,
  onCategoryChange,
  currentSort,
  currentOrder,
  currentCategory,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-zinc-400 hover:text-zinc-200 transition-colors md:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          筛选与排序
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <div className={`${isExpanded ? 'block' : 'hidden md:block'}`}>
        <div className="p-5 space-y-5">
          {/* Category Filter */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">分类筛选</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onCategoryChange(option.value)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    flex items-center gap-2
                    ${currentCategory === option.value
                      ? 'bg-zinc-100 text-zinc-900 shadow-lg shadow-zinc-100/10'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/[0.06]'
                    }
                  `}
                >
                  <span className="opacity-70">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">排序方式</label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${currentSort === option.value
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/[0.06]'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <span className="text-xs font-medium text-zinc-500">排序方向</span>
            <div className="flex bg-zinc-800/50 rounded-lg p-1 border border-white/[0.06]">
              <button
                onClick={() => onOrderChange('desc')}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5
                  ${currentOrder === 'desc'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                降序
              </button>
              <button
                onClick={() => onOrderChange('asc')}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5
                  ${currentOrder === 'asc'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                升序
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
