/**
 * Worker进程入口 - 处理后台同步任务
 * 使用 Vercel KV 作为任务队列
 * 
 * 运行方式：
 * - 本地开发: npx ts-node worker.ts
 * - Vercel Cron: 通过 /api/sync/cron 端点触发
 */

import { syncNews } from './cron/sync-news'
import { aiCircuitBreaker } from './lib/circuit-breaker'
import {
  getNextPendingJob,
  getJobStatus,
  updateJobStatus,
  type SyncJobData,
  type SyncJobResult,
  type SyncProgress,
} from './lib/job-queue'

/**
 * 处理单个任务
 */
async function processJob(jobId: string): Promise<void> {
  console.log(`[Worker] 开始处理任务 ${jobId}`)

  const status = await getJobStatus(jobId)
  if (!status) {
    console.error(`[Worker] 任务 ${jobId} 不存在`)
    return
  }

  // 从status中获取任务参数
  const { forceRefresh = false, newsCount = 10 } = status.data

  console.log(`[Worker] 参数: forceRefresh=${forceRefresh}, newsCount=${newsCount}`)

  try {
    // 更新状态为处理中
    await updateJobStatus(jobId, {
      status: 'active',
      progress: { stage: 'processing', progress: 5, message: '开始处理任务' },
    })

    // 执行同步任务
    const result = await syncNews(
      forceRefresh,
      newsCount,
      // 进度回调
      (progress: SyncProgress) => {
        console.log(`[Worker] 进度更新:`, progress)
        updateJobStatus(jobId, { progress })
      },
      // 熔断器
      aiCircuitBreaker
    )

    console.log(`[Worker] 任务 ${jobId} 完成`)

    // 更新为成功
    await updateJobStatus(jobId, {
      status: 'succeeded',
      progress: { stage: 'completed', progress: 100, message: '任务完成' },
      result: {
        success: true,
        newsGenerated: result?.newsGenerated || 0,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Worker] 任务 ${jobId} 失败:`, error)

    // 更新为失败
    await updateJobStatus(jobId, {
      status: 'failed',
      progress: { stage: 'failed', progress: 0, message: '任务失败' },
      result: {
        success: false,
        error: errorMessage,
      },
    })
  }
}

/**
 * Worker主循环（轮询模式）
 */
async function runWorker(): Promise<void> {
  console.log('[Worker] Worker 进程已启动，开始轮询任务...')

  const pollInterval = 5000 // 5秒轮询一次

  while (true) {
    try {
      // 获取下一个待处理任务
      const jobId = await getNextPendingJob()

      if (jobId) {
        // 检查任务是否已经在处理中
        const status = await getJobStatus(jobId)
        if (status && status.status === 'pending') {
          await processJob(jobId)
        } else {
          // 任务已被处理或不存在，从队列移除
          console.log(`[Worker] 跳过任务 ${jobId} (状态: ${status?.status})`)
        }
      }
    } catch (error) {
      console.error('[Worker] 轮询出错:', error)
    }

    // 等待下次轮询
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }
}

/**
 * 单次处理（适合 Vercel Serverless 函数）
 */
export async function processOneJob(): Promise<{ processed: boolean; jobId?: string; error?: string }> {
  try {
    const jobId = await getNextPendingJob()

    if (!jobId) {
      return { processed: false }
    }

    const status = await getJobStatus(jobId)
    if (status && status.status === 'pending') {
      await processJob(jobId)
      return { processed: true, jobId }
    }

    return { processed: false }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Worker] 处理任务出错:', error)
    return { processed: false, error: errorMessage }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  // 优雅关闭
  const shutdown = () => {
    console.log('[Worker] 正在关闭...')
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // 检查是否是一次性处理模式
  const singleRun = process.argv.includes('--single')

  if (singleRun) {
    // 单次处理
    processOneJob()
      .then((result) => {
        console.log('[Worker] 单次处理结果:', result)
        process.exit(result.processed ? 0 : 1)
      })
      .catch((error) => {
        console.error('[Worker] 单次处理失败:', error)
        process.exit(1)
      })
  } else {
    // 持续轮询
    runWorker().catch((error) => {
      console.error('[Worker] Worker异常退出:', error)
      process.exit(1)
    })
  }
}