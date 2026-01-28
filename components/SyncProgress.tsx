'use client'

import { useState, useEffect, useCallback } from 'react'

interface SyncProgressProps {
  onComplete: () => void
  onClose: () => void
}

interface ProgressStage {
  id: string
  name: string
  icon: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

const STAGES: ProgressStage[] = [
  { id: '初始化', name: '初始化', icon: '⚡', status: 'pending' },
  { id: '获取RSS新闻', name: '获取RSS新闻', icon: '📡', status: 'pending' },
  { id: '选择每日新闻', name: '筛选新闻', icon: '🔍', status: 'pending' },
  { id: '生成AI摘要', name: '生成AI摘要', icon: '🤖', status: 'pending' },
  { id: '翻译国际新闻', name: '翻译国际新闻', icon: '🌐', status: 'pending' },
  { id: '评估重要性', name: '评估重要性', icon: '⭐', status: 'pending' },
  { id: '生成播报文案', name: '生成播报文案', icon: '📝', status: 'pending' },
  { id: '保存数据', name: '保存数据', icon: '💾', status: 'pending' },
]

const STAGE_MAP: Record<string, number> = {
  '初始化': 0,
  '获取RSS新闻': 1,
  '选择每日新闻': 2,
  '生成AI摘要': 3,
  '翻译国际新闻': 4,
  '评估重要性': 5,
  '生成播报文案': 6,
  '生成音频': 6,
  '保存数据': 7,
  '同步完成': 8,
  'completed': 8,
  'failed': -1,
}

export default function SyncProgress({ onComplete, onClose }: SyncProgressProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [jobId, setJobId] = useState<string | null>(null)
  const [stages, setStages] = useState<ProgressStage[]>(STAGES)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('准备开始同步...')
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [result, setResult] = useState<{ newsGenerated?: number; error?: string } | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState('0s')

  // 格式化耗时
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // 更新阶段状态
  const updateStages = (currentStage: string, stageStatus: 'running' | 'completed' | 'failed') => {
    const stageIndex = STAGE_MAP[currentStage] ?? -1
    if (stageIndex < 0) return

    setStages(prev => prev.map((stage, index) => {
      if (index < stageIndex) return { ...stage, status: 'completed' }
      if (index === stageIndex) return { ...stage, status: stageStatus }
      return { ...stage, status: 'pending' }
    }))
  }

  // 开始同步
  const startSync = useCallback(async () => {
    try {
      setStatus('running')
      setStartTime(Date.now())
      updateStages('init', 'running')
      setMessage('正在创建同步任务...')

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: false }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '创建任务失败')
      }

      setJobId(data.jobId)
      updateStages('init', 'completed')
      setMessage('任务已创建，等待处理...')
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : '启动失败')
      updateStages('init', 'failed')
    }
  }, [])

  // 轮询任务状态
  const pollStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/sync/status/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '查询状态失败')
      }

      const { status: jobStatus, progress: jobProgress, result: jobResult } = data

      // 更新进度百分比
      if (jobProgress?.progress !== undefined) {
        setProgress(jobProgress.progress)
      }

      // 更新消息
      if (jobProgress?.message) {
        setMessage(jobProgress.message)
      }

      // 更新阶段
      if (jobProgress?.stage) {
        const stageIndex = STAGE_MAP[jobProgress.stage]
        if (stageIndex !== undefined) {
          const isRunning = jobStatus === 'active' || jobStatus === 'pending'
          updateStages(jobProgress.stage, isRunning ? 'running' : 'completed')
        }
      }

      // 任务完成
      if (jobStatus === 'succeeded') {
        setStatus('completed')
        setProgress(100)
        updateStages('save', 'completed')
        setResult(jobResult || { newsGenerated: 0 })
        setTimeout(() => {
          onComplete()
        }, 1500)
        return true // 停止轮询
      }

      // 任务失败
      if (jobStatus === 'failed') {
        setStatus('failed')
        setResult({ error: jobResult?.error || '任务执行失败' })
        if (jobProgress?.stage) {
          updateStages(jobProgress.stage, 'failed')
        }
        return true // 停止轮询
      }

      return false // 继续轮询
    } catch (error) {
      console.error('轮询状态失败:', error)
      return false
    }
  }, [jobId, onComplete])

  // 轮询效果
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return

    const interval = setInterval(async () => {
      const shouldStop = await pollStatus()
      if (shouldStop) {
        clearInterval(interval)
      }
    }, 2000) // 每2秒轮询一次

    // 立即执行一次
    pollStatus()

    return () => clearInterval(interval)
  }, [jobId, status, pollStatus])

  // 更新时间显示
  useEffect(() => {
    if (status !== 'running') return

    const interval = setInterval(() => {
      setElapsedTime(formatDuration(Date.now() - startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [status, startTime])

  // 组件挂载自动开始
  useEffect(() => {
    startSync()
  }, [startSync])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 200)
  }

  const getStatusIcon = (status: ProgressStage['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />
      case 'running':
        return <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      case 'completed':
        return (
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'failed':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={status !== 'running' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">新闻同步</h2>
              <p className="text-xs text-zinc-500">
                {status === 'running' ? `进行中 · ${elapsedTime}` : status === 'completed' ? '已完成' : status === 'failed' ? '已失败' : '准备中'}
              </p>
            </div>
          </div>
          {status !== 'running' && (
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-400">{message}</span>
            <span className="text-sm font-bold text-zinc-300">{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="px-6 pb-4 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div 
                key={stage.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  stage.status === 'running' 
                    ? 'bg-blue-500/10 border border-blue-500/20' 
                    : stage.status === 'completed'
                    ? 'bg-zinc-800/50'
                    : stage.status === 'failed'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'opacity-50'
                }`}
              >
                {getStatusIcon(stage.status)}
                <span className="text-lg">{stage.icon}</span>
                <span className={`text-sm font-medium ${
                  stage.status === 'running' ? 'text-blue-400' :
                  stage.status === 'completed' ? 'text-zinc-300' :
                  stage.status === 'failed' ? 'text-red-400' :
                  'text-zinc-600'
                }`}>
                  {stage.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-zinc-900/50">
          {status === 'failed' && result?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {result.error}
            </div>
          )}
          
          {status === 'completed' && result?.newsGenerated !== undefined && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">成功生成 {result.newsGenerated} 条新闻</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {status === 'failed' && (
              <button
                onClick={() => {
                  setStatus('idle')
                  setStages(STAGES)
                  setProgress(0)
                  setResult(null)
                  startSync()
                }}
                className="flex-1 btn btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重试
              </button>
            )}
            
            {(status === 'completed' || status === 'failed') && (
              <button
                onClick={handleClose}
                className="flex-1 btn btn-secondary"
              >
                {status === 'completed' ? '完成' : '关闭'}
              </button>
            )}

            {status === 'running' && (
              <div className="flex-1 flex items-center justify-center gap-2 text-zinc-500 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                处理中...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
