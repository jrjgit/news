'use client'

import { useState, useRef } from 'react'

interface Props {
  url: string
}

export function AudioPlayer({ url }: Props) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

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
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(p)
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
        >
          {playing ? (
            <span className="text-white text-lg">⏸</span>
          ) : (
            <span className="text-white text-lg ml-1">▶</span>
          )}
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">今日新闻播报</p>
          <div className="h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  )
}
