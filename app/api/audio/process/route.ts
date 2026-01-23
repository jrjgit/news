/**
 * 音频生成处理 API
 * 由 Worker 调用，处理音频生成队列中的任务
 */

import { NextResponse } from 'next/server'
import { getNextAudioJob, updateAudioJobStatus, getAudioJobStatus } from '@/lib/audio-queue'
import { edgeTTS } from '@/lib/tts'

/**
 * 处理一个音频生成任务
 */
async function processAudioJob(): Promise<{ processed: boolean; jobId?: string; error?: string }> {
  try {
    const jobId = await getNextAudioJob()

    if (!jobId) {
      return { processed: false }
    }

    const status = await getAudioJobStatus(jobId)
    if (!status || status.status !== 'pending') {
      return { processed: false }
    }

    console.log(`[AudioAPI] 开始处理任务: ${jobId}`)

    // 更新为处理中
    await updateAudioJobStatus(jobId, {
      status: 'processing',
      progress: 10,
    })

    // 生成音频
    const filename = `daily-news-${status.date}.mp3`
    console.log(`[AudioAPI] 开始生成音频: ${filename}, 脚本长度: ${status.script.length} 字`)

    const audioUrl = await edgeTTS.generateDailyNewsAudio(status.script, status.date)

    console.log(`[AudioAPI] 音频生成完成: ${audioUrl}`)

    // 更新为完成
    await updateAudioJobStatus(jobId, {
      status: 'completed',
      progress: 100,
      audioUrl,
    })

    return { processed: true, jobId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[AudioAPI] 处理失败:', errorMessage)
    return { processed: false, error: errorMessage }
  }
}

/**
 * POST /api/audio/process - 处理一个音频任务
 */
export async function POST() {
  const result = await processAudioJob()

  return NextResponse.json({
    success: result.processed,
    jobId: result.jobId,
    error: result.error,
  })
}
