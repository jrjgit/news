/**
 * 音频处理 Cron 端点
 * Vercel Cron 会每分钟调用一次，检查并处理音频队列
 * 
 * Vercel Cron 配置：
 * {
 *   "path": "/api/sync/audio-cron",
 *   "schedule": "* * * * *"
 * }
 */

import { NextResponse } from 'next/server'
import { getNextAudioJob, getAudioJobStatus, updateAudioJobStatus } from '@/lib/audio-queue'
import { edgeTTS } from '@/lib/tts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let processed = false
  let jobId: string | null = null
  let error: string | null = null

  console.log(`[AudioCron] 开始检查音频队列...`)

  try {
    // 获取下一个待处理的音频任务
    const nextJobId = await getNextAudioJob()

    if (!nextJobId) {
      console.log(`[AudioCron] 没有待处理的音频任务`)
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    const status = await getAudioJobStatus(nextJobId)
    if (!status) {
      console.log(`[AudioCron] 任务 ${nextJobId} 不存在`)
      return NextResponse.json({
        success: true,
        message: '任务不存在',
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    if (status.status !== 'pending') {
      console.log(`[AudioCron] 任务 ${nextJobId} 状态不是 pending (当前: ${status.status})`)
      return NextResponse.json({
        success: true,
        message: `任务状态不是 pending: ${status.status}`,
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    // 处理音频任务
    jobId = nextJobId
    console.log(`[AudioCron] 开始处理任务: ${jobId}, 日期: ${status.date}`)

    // 更新状态为处理中
    await updateAudioJobStatus(jobId, {
      status: 'processing',
      progress: 10,
    })

    // 生成音频
    const filename = `daily-news-${status.date}.mp3`
    console.log(`[AudioCron] 开始生成音频: ${filename}, 脚本长度: ${status.script.length} 字`)

    const audioUrl = await edgeTTS.generateDailyNewsAudio(status.script, status.date)

    console.log(`[AudioCron] 音频生成完成: ${audioUrl}`)

    // 更新为完成
    await updateAudioJobStatus(jobId, {
      status: 'completed',
      progress: 100,
      audioUrl,
    })

    processed = true
    console.log(`[AudioCron] 任务 ${jobId} 完成`)

    return NextResponse.json({
      success: true,
      message: '音频生成成功',
      processed: true,
      jobId,
      audioUrl,
      duration: Date.now() - startTime,
    })
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error(`[AudioCron] 处理失败:`, error)

    // 如果任务存在，更新为失败状态
    if (jobId) {
      try {
        await updateAudioJobStatus(jobId, {
          status: 'failed',
          progress: 0,
          error,
        })
      } catch (updateError) {
        console.error(`[AudioCron] 更新任务状态失败:`, updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error,
        processed,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
