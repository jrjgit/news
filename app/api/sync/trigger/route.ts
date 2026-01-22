/**
 * 触发同步任务API
 * POST /api/sync/trigger
 * 
 * 请求体:
 * {
 *   forceRefresh: boolean,  // 是否强制刷新
 *   newsCount: number       // 新闻数量
 * }
 * 
 * 响应:
 * {
 *   success: boolean,
 *   jobId: string,
 *   message: string,
 *   statusUrl: string
 * }
 */

import { NextResponse } from 'next/server'
import { enqueueSyncTask } from '@/lib/job-queue'

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json().catch(() => ({}))

    const forceRefresh = body.forceRefresh === true
    const newsCount = Math.min(Math.max(parseInt(body.newsCount) || 10, 1), 20)

    console.log(`[API] 收到同步请求: forceRefresh=${forceRefresh}, newsCount=${newsCount}`)

    // 创建同步任务
    const jobId = await enqueueSyncTask({
      forceRefresh,
      newsCount,
      createdAt: new Date().toISOString(),
    })

    console.log(`[API] 任务已创建: ${jobId}`)

    return NextResponse.json({
      success: true,
      jobId,
      message: forceRefresh ? '强制同步任务已加入队列' : '同步任务已加入队列',
      statusUrl: `/api/sync/status/${jobId}`,
      queryParams: {
        jobId,
        forceRefresh,
        newsCount,
      },
    })
  } catch (error) {
    console.error('[API] 创建同步任务失败:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建任务失败',
      },
      { status: 500 }
    )
  }
}

// 禁止GET请求
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: '请使用POST方法触发同步任务',
      example: {
        method: 'POST',
        body: {
          forceRefresh: false,
          newsCount: 10,
        },
      },
    },
    { status: 405 }
  )
}
