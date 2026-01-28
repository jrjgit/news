'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  urls: string[]
  onGenerate?: () => void
  generating?: boolean
}

export function AudioPlayer({ urls, onGenerate, generating }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentUrl = urls[currentIndex] || urls[0]
  const totalSegments = urls.length
  const hasAudio = urls.length > 0 && urls[0]

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentUrl
      if (playing) {
        audioRef.current.play()
      }
    }
  }, [currentUrl, playing])

  const toggle = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setPlaying(!playing)
    }
  }

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const audio = audioRef.current
      const segmentProgress = (audio.currentTime / audio.duration) * 100
      const totalProgress = ((currentIndex + audio.currentTime / audio.duration) / totalSegments) * 100
      setProgress(totalProgress)
      setCurrentTime(audio.currentTime)
    }
  }

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const onEnded = () => {
    if (currentIndex < urls.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setPlaying(false)
      setCurrentIndex(0)
      setProgress(0)
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 没有音频但有生成按钮的情况
  if (!hasAudio && onGenerate) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">
              音频尚未生成
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              点击按钮生成语音播报
            </p>
          </div>

          <button
            onClick={onGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                生成音频
              </>
            )}
          </button>
        </div>

        {generating && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">正在生成语音，请稍候...</p>
          </div>
        )}
      </div>
    )
  }

  if (!urls.length) return null

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-blue-500/20"
        >
          {playing ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-200 truncate">
              今日新闻播报
            </p>
            <span className="text-xs text-slate-400">
              {currentIndex + 1} / {totalSegments} 段
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Segment indicators */}
          {totalSegments > 1 && (
            <div className="flex gap-1 mt-2">
              {urls.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setPlaying(true)
                  }}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'bg-blue-500' 
                      : idx < currentIndex 
                        ? 'bg-purple-500/50' 
                        : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 tabular-nums">
          {formatTime(currentTime)}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={currentUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        className="hidden"
      />
    </div>
  )
}
