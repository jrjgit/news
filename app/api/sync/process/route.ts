/**
 * 立即处理同步任务（Serverless 环境使用）
 * POST /api/sync/process
 * 
 * 请求体: { jobId: string }
 * 
 * 这个 API 直接执行任务，不依赖常驻 Worker
 */

import { NextResponse } from 'next/server'
import { syncNews } from '@/cron/sync-news'
import { getJobStatus, updateJobStatus } from '@/lib/job-queue'
import { aiCircuitBreaker } from '@/lib/circuit-breaker'

// 最大执行时间 60 秒（Vercel Hobby 限制）
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: '缺少 jobId' },
        { status: 400 }
      )
    }

    console.log(`[API] 开始处理任务: ${jobId}`)

    // 获取任务状态
    const status = await getJobStatus(jobId)
    if (!status) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      )
    }

    if (status.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `任务状态为 ${status.status}，无法处理` },
        { status: 400 }
      )
    }

    // 更新为处理中
    await updateJobStatus(jobId, {
      status: 'active',
      progress: { stage: 'processing', progress: 5, message: '开始处理任务' },
    })

    // 执行任务
    const { forceRefresh = false, newsCount = 10 } = status.data
    
    const startTime = Date.now()
    
    const result = await syncNews(
      forceRefresh,
      newsCount,
      // 进度回调
      async (progress) => {
        console.log(`[API] 进度: ${progress.stage} - ${progress.progress}%`)
        await updateJobStatus(jobId, { progress })
      },
      // 熔断器
      aiCircuitBreaker
    )

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.success) {
      await updateJobStatus(jobId, {
        status: 'succeeded',
        progress: { stage: 'completed', progress: 100, message: '任务完成' },
        result: {
          success: true,
          newsGenerated: result.newsGenerated,
        },
      })

      console.log(`[API] 任务完成: ${jobId}, 生成 ${result.newsGenerated} 条新闻, 耗时 ${duration}s`)

      return NextResponse.json({
        success: true,
        message: '任务处理完成',
        jobId,
        result: {
          newsGenerated: result.newsGenerated,
          duration: `${duration}s`,
        },
      })
    } else {
      await updateJobStatus(jobId, {
        status: 'failed',
        progress: { stage: 'failed', progress: 0, message: result.error || '任务失败' },
        result: {
          success: false,
          error: result.error,
        },
      })

      console.error(`[API] 任务失败: ${jobId}, 错误: ${result.error}`)

      return NextResponse.json({
        success: false,
        error: result.error,
        jobId,
      }, { status: 500 })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[API] 处理任务失败:', error)

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
