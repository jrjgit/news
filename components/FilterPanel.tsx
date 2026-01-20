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

export default function FilterPanel({
  onSortChange,
  onOrderChange,
  onCategoryChange,
  currentSort,
  currentOrder,
  currentCategory,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sortOptions = [
    { value: 'importance' as SortOption, label: '重要性' },
    { value: 'createdAt' as SortOption, label: '创建时间' },
    { value: 'newsDate' as SortOption, label: '新闻日期' },
  ]

  const categoryOptions = [
    { value: 'ALL' as CategoryFilter, label: '全部' },
    { value: 'DOMESTIC' as CategoryFilter, label: '国内新闻' },
    { value: 'INTERNATIONAL' as CategoryFilter, label: '国际新闻' },
    { value: 'FAVORITES' as CategoryFilter, label: '我的收藏' },
  ]

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
      {/* 筛选按钮（移动端） */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-gray-300 hover:text-white transition-colors md:hidden"
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          筛选和排序
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 筛选内容 */}
      <div className={`p-4 space-y-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {/* 分类筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">新闻分类</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onCategoryChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentCategory === option.value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 排序选项 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">排序方式</label>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentSort === option.value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 排序顺序 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">排序顺序</label>
          <div className="flex gap-2">
            <button
              onClick={() => onOrderChange('desc')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                currentOrder === 'desc'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              降序
            </button>
            <button
              onClick={() => onOrderChange('asc')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                currentOrder === 'asc'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              升序
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}