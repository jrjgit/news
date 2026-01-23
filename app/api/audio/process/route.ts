// 音频处理端点 - 供外部 Cron 服务调用
// 外部 Cron 配置示例 (cron-job.org):
// - URL: https://你的域名/api/audio/process
// - Schedule: 每 15 分钟 (每 15 分钟执行一次)
//
// Vercel Cron: 每日同步新闻时自动生成音频
// 外部 Cron: 每 15 分钟检查并处理未完成的音频任务

import { NextResponse } from 'next/server'
import { getNextAudioJob, getAudioJobStatus, updateAudioJobStatus } from '@/lib/audio-queue'
import { edgeTTS } from '@/lib/tts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  console.log('[AudioProcess] 开始检查音频队列...')

  try {
    // 获取下一个待处理的音频任务
    const nextJobId = await getNextAudioJob()

    if (!nextJobId) {
      console.log('[AudioProcess] 没有待处理的音频任务')
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    const status = await getAudioJobStatus(nextJobId)
    if (!status) {
      console.log('[AudioProcess] 任务不存在')
      return NextResponse.json({
        success: true,
        message: '任务不存在',
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    if (status.status !== 'pending' && status.status !== 'processing') {
      console.log('[AudioProcess] 任务状态不是 pending/processing:', status.status)
      return NextResponse.json({
        success: true,
        message: '任务状态不是 pending/processing: ' + status.status,
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    // 如果正在处理中，且是最近开始的，可能是上次失败了，重新处理
    if (status.status === 'processing' && status.progress === 10) {
      const jobTime = new Date(status.createdAt).getTime()
      if (Date.now() - jobTime < 5 * 60 * 1000) {
        console.log('[AudioProcess] 任务正在处理中，跳过')
        return NextResponse.json({
          success: true,
          message: '任务正在处理中',
          processed: false,
          duration: Date.now() - startTime,
        })
      }
    }

    // 处理音频任务
    console.log('[AudioProcess] 开始处理任务:', nextJobId, '日期:', status.date)

    // 更新状态为处理中
    await updateAudioJobStatus(nextJobId, {
      status: 'processing',
      progress: 10,
    })

    // 生成音频
    const filename = 'daily-news-' + status.date + '.mp3'
    console.log('[AudioProcess] 开始生成音频:', filename, '脚本长度:', status.script.length, '字')

    const audioUrl = await edgeTTS.generateDailyNewsAudio(status.script, status.date)

    console.log('[AudioProcess] 音频生成完成:', audioUrl)

    // 更新为完成
    await updateAudioJobStatus(nextJobId, {
      status: 'completed',
      progress: 100,
      audioUrl,
    })

    console.log('[AudioProcess] 任务完成:', nextJobId)

    return NextResponse.json({
      success: true,
      message: '音频生成成功',
      processed: true,
      jobId: nextJobId,
      audioUrl,
      duration: Date.now() - startTime,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('[AudioProcess] 处理失败:', error)

    return NextResponse.json(
      {
        success: false,
        error,
        processed: false,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
