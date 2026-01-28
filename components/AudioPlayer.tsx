'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  urls: string[]
}

export function AudioPlayer({ urls }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentUrl = urls[currentIndex] || urls[0]
  const totalSegments = urls.length

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
