/**
 * Cron触发器端点 - 供 Vercel Cron Job 调用
 * GET /api/sync/cron
 * 
 * Vercel Cron 配置示例 (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/sync/cron",
 *       "schedule": "0 18 * * *"
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server'
import { syncNews, type SyncResult } from '@/cron/sync-news'
import { aiCircuitBreaker } from '@/lib/circuit-breaker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const timeoutMs = 250000 // 250秒

  console.log('[Cron] 收到 Cron 触发请求')

  // 超时控制器
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutController.abort()
  }, timeoutMs)

  try {
    const result = await Promise.race([
      syncNews(false, 10, undefined, aiCircuitBreaker),
      new Promise<SyncResult>((_, reject) => 
        timeoutController.signal.addEventListener('abort', () => {
          reject(new Error('同步超时'))
        })
      )
    ]) as SyncResult

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`[Cron] 同步完成，耗时 ${duration}秒，生成 ${result.newsGenerated} 条新闻`)

    return NextResponse.json({
      success: result.success,
      message: result.success ? '同步成功' : '同步部分失败',
      newsGenerated: result.newsGenerated,
      duration: `${duration}秒`,
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const errorMessage = error instanceof Error ? error.message : '处理失败'

    console.error('[Cron] 处理失败:', errorMessage)

    // 如果是超时，返回特殊状态码
    if (errorMessage.includes('超时')) {
      return NextResponse.json(
        {
          success: false,
          error: '同步超时',
          duration: `${duration}秒`,
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}秒`,
      },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
