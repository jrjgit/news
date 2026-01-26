// 音频处理端点 - 供外部 Cron 服务调用
// 外部 Cron 配置示例 (cron-job.org):
// - URL: https://你的域名/api/audio/process
// - Schedule: 每 15 分钟 (每 15 分钟执行一次)
//
// Vercel Cron: 每日同步新闻时自动生成音频
// 外部 Cron: 每 15 分钟检查并处理未完成的音频任务

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { streamingTTS } from '@/lib/streaming-tts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  console.log('[AudioProcess] 开始检查音频任务...')

  try {
    // 获取下一个待处理的音频任务
    const audioTask = await prisma.audioTask.findFirst({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (!audioTask) {
      console.log('[AudioProcess] 没有待处理的音频任务')
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: false,
        duration: Date.now() - startTime,
      })
    }

    console.log('[AudioProcess] 开始处理任务:', audioTask.id, '日期:', audioTask.date)

    // 更新状态为处理中
    await prisma.audioTask.update({
      where: { id: audioTask.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    })

    // 流式生成音频
    console.log('[AudioProcess] 开始流式生成音频, 脚本长度:', audioTask.script.length, '字')

    const { urls, totalSize, chunkCount } = await streamingTTS.generateStreamingAudio(
      audioTask.script,
      audioTask.id,
      async (progress, currentChunk, totalChunks) => {
        // 更新进度
        await prisma.audioTask.update({
          where: { id: audioTask.id },
          data: {
            progress,
            currentChunk,
            chunkCount: totalChunks,
          },
        })
        console.log(`[AudioProcess] 进度: ${progress}%, 分块 ${currentChunk}/${totalChunks}`)
      }
    )

    // 将分块 URL 合并为播放列表（用 | 分隔）
    const playlistUrl = urls.join('|')

    console.log('[AudioProcess] 音频生成完成:', {
      chunkCount,
      totalSize,
      duration: Date.now() - startTime,
    })

    // 更新为完成
    await prisma.audioTask.update({
      where: { id: audioTask.id },
      data: {
        status: 'COMPLETED',
        audioUrl: playlistUrl,
        finishedAt: new Date(),
      },
    })

    // 更新关联的新闻记录
    if (audioTask.date) {
      await prisma.news.updateMany({
        where: {
          newsDate: {
            gte: new Date(audioTask.date),
            lt: new Date(new Date(audioTask.date).getTime() + 24 * 60 * 60 * 1000),
          },
        },
        data: {
          audioGenerated: true,
          audioTaskId: audioTask.id,
        },
      })
    }

    console.log('[AudioProcess] 任务完成:', audioTask.id)

    return NextResponse.json({
      success: true,
      message: '音频生成成功',
      processed: true,
      taskId: audioTask.id,
      audioUrl: playlistUrl,
      chunkCount,
      totalSize,
      duration: Date.now() - startTime,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('[AudioProcess] 处理失败:', error)

    // 如果有任务ID，更新为失败状态
    const audioTask = await prisma.audioTask.findFirst({
      where: {
        status: 'PROCESSING',
      },
    })

    if (audioTask) {
      await prisma.audioTask.update({
        where: { id: audioTask.id },
        data: {
          status: 'FAILED',
          errorMessage: error,
          finishedAt: new Date(),
        },
      })
    }

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
