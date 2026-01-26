/**
 * 音频进度 Hook
 * 用于监听音频生成任务的进度
 */

import { useState, useEffect, useCallback } from 'react'

export interface AudioProgress {
  status: 'not_generated' | 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentChunk: number
  chunkCount: number
  audioUrl: string | null
  errorMessage: string | null
}

export interface UseAudioProgressOptions {
  date: string
  enabled?: boolean
  pollInterval?: number // 轮询间隔（毫秒）
  onProgress?: (progress: AudioProgress) => void
  onComplete?: (audioUrl: string) => void
  onError?: (error: string) => void
}

export function useAudioProgress({
  date,
  enabled = true,
  pollInterval = 3000,
  onProgress,
  onComplete,
  onError,
}: UseAudioProgressOptions) {
  const [progress, setProgress] = useState<AudioProgress>({
    status: 'not_generated',
    progress: 0,
    currentChunk: 0,
    chunkCount: 0,
    audioUrl: null,
    errorMessage: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  // 检查音频状态
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/audio/status?date=${date}`)
      const data = await response.json()

      if (data.success && data.data) {
        const newProgress: AudioProgress = {
          status: data.data.status,
          progress: data.data.progress || 0,
          currentChunk: data.data.currentChunk || 0,
          chunkCount: data.data.chunkCount || 0,
          audioUrl: data.data.audioUrl || null,
          errorMessage: data.data.errorMessage || null,
        }

        setProgress(newProgress)
        onProgress?.(newProgress)

        // 如果完成，调用回调
        if (newProgress.status === 'completed' && newProgress.audioUrl) {
          onComplete?.(newProgress.audioUrl)
          setIsPolling(false)
        }

        // 如果失败，调用错误回调
        if (newProgress.status === 'failed') {
          onError?.(newProgress.errorMessage || '音频生成失败')
          setIsPolling(false)
        }
      }
    } catch (error) {
      console.error('检查音频状态失败:', error)
      onError?.('检查音频状态失败')
    }
  }, [date, onProgress, onComplete, onError])

  // 触发音频生成
  const triggerGeneration = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/audio/status?date=${date}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        // 开始轮询
        setIsPolling(true)
        await checkStatus()
      } else {
        onError?.(data.error || '触发音频生成失败')
      }
    } catch (error) {
      console.error('触发音频生成失败:', error)
      onError?.('触发音频生成失败')
    } finally {
      setIsLoading(false)
    }
  }, [date, checkStatus, onError])

  // 轮询进度
  useEffect(() => {
    if (!enabled || !isPolling) return

    const interval = setInterval(() => {
      checkStatus()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [enabled, isPolling, pollInterval, checkStatus])

  return {
    progress,
    isLoading,
    isPolling,
    checkStatus,
    triggerGeneration,
  }
}