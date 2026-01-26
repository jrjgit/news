'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioPlayerProps {
  src: string // 可以是单个 URL 或用 | 分隔的多个 URL
  title: string
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [chunkDurations, setChunkDurations] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  // 解析音频 URL（支持单个 URL 或分块 URL）
  const chunkUrls = src.includes('|') ? src.split('|') : [src]
  const currentUrl = chunkUrls[currentChunk] || chunkUrls[0]

  // 当 src 变化时，重置播放器
  useEffect(() => {
    setCurrentChunk(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setChunkDurations([])
  }, [src])

  // 更新总时长
  useEffect(() => {
    if (chunkDurations.length > 0) {
      const total = chunkDurations.reduce((sum, d) => sum + d, 0)
      setTotalDuration(total)
    }
  }, [chunkDurations])

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      // 更新当前分块的时长
      if (audio.duration > 0) {
        setChunkDurations(prev => {
          const newDurations = [...prev]
          newDurations[currentChunk] = audio.duration
          return newDurations
        })
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      // 更新当前分块的时长
      setChunkDurations(prev => {
        const newDurations = [...prev]
        newDurations[currentChunk] = audio.duration
        return newDurations
      })
    }

    const handleEnded = () => {
      // 播放下一个分块
      if (currentChunk < chunkUrls.length - 1) {
        setCurrentChunk(prev => prev + 1)
      } else {
        // 所有分块播放完毕
        setIsPlaying(false)
        setCurrentChunk(0)
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentChunk, chunkUrls])

  // 切换播放/暂停
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  // 切换到指定分块
  const playChunk = (chunkIndex: number) => {
    if (chunkIndex < 0 || chunkIndex >= chunkUrls.length) return
    setCurrentChunk(chunkIndex)
    setIsPlaying(true)
  }

  // 进度条拖动（仅支持当前分块）
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const time = parseFloat(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  // 计算总进度（所有分块）
  const getTotalProgress = () => {
    if (chunkDurations.length === 0) return 0
    const completedChunksDuration = chunkDurations
      .slice(0, currentChunk)
      .reduce((sum, d) => sum + d, 0)
    const currentProgress = (currentTime / (chunkDurations[currentChunk] || 1)) * (chunkDurations[currentChunk] || 0)
    return ((completedChunksDuration + currentProgress) / totalDuration) * 100
  }

  // 格式化时间
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 计算总播放时间
  const getTotalPlayedTime = () => {
    const completedChunksDuration = chunkDurations
      .slice(0, currentChunk)
      .reduce((sum, d) => sum + d, 0)
    return completedChunksDuration + currentTime
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1">
          <div className="text-white font-medium mb-1">{title}</div>
          
          {/* 总进度条 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm">{formatTime(getTotalPlayedTime())}</span>
            <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${getTotalProgress()}%` }}
              />
            </div>
            <span className="text-gray-400 text-sm">{formatTime(totalDuration)}</span>
          </div>

          {/* 当前分块进度条 */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-gray-500 text-xs">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* 分块选择器 */}
      {chunkUrls.length > 1 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
          <span className="text-gray-400 text-sm">分块:</span>
          {chunkUrls.map((_, index) => (
            <button
              key={index}
              onClick={() => playChunk(index)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                index === currentChunk
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
          <span className="text-gray-500 text-sm ml-auto">
            {currentChunk + 1} / {chunkUrls.length}
          </span>
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentUrl}
        key={currentChunk} // 当分块变化时重新加载音频
      />
    </div>
  )
}