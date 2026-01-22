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
import { processOneJob } from '../../../../worker'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[Cron] 收到 Cron 触发请求')

    // 处理一个任务
    const result = await processOneJob()

    if (result.processed) {
      console.log(`[Cron] 已处理任务: ${result.jobId}`)
      return NextResponse.json({
        success: true,
        message: '已处理任务',
        jobId: result.jobId,
      })
    } else {
      console.log('[Cron] 没有待处理的任务')
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: false,
      })
    }
  } catch (error) {
    console.error('[Cron] 处理失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
      },
      { status: 500 }
    )
  }
}
