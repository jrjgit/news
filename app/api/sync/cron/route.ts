/**
 * Cron触发器端点 - 供 Vercel Cron Job 调用
 * GET /api/sync/cron
 * 
 * Vercel Cron 配置示例 (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/sync/cron",
 *       "schedule": "0 2 * * *"
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server'
import { syncNews } from '@/cron/sync-news'
import { aiCircuitBreaker } from '@/lib/circuit-breaker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  try {
    console.log('[Cron] 收到 Cron 触发请求，开始执行新闻同步')

    // 直接执行同步任务
    const result = await syncNews(
      false, // 不强制刷新
      10,    // 新闻数量
      undefined, // 无进度回调
      aiCircuitBreaker
    )

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.success) {
      console.log(`[Cron] 同步成功: ${result.newsGenerated} 条新闻，耗时 ${duration} 秒`)
      return NextResponse.json({
        success: true,
        message: '同步成功',
        newsGenerated: result.newsGenerated,
        duration: `${duration}秒`,
      })
    } else {
      console.log(`[Cron] 同步失败: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error || '同步失败',
          duration: `${duration}秒`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error('[Cron] 处理失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        duration: `${duration}秒`,
      },
      { status: 500 }
    )
  }
}
