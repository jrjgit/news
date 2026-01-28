import { NextRequest, NextResponse } from 'next/server'
import { enqueueSyncTask } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    console.log('[Sync API] 创建异步同步任务...')
    
    // 解析请求参数
    const body = await request.json().catch(() => ({}))
    const { forceRefresh = false } = body
    
    // 创建异步任务，立即返回任务ID
    const jobId = await enqueueSyncTask({
      forceRefresh,
      createdAt: new Date().toISOString(),
    })

    console.log(`[Sync API] 同步任务已创建: ${jobId}`)

    // 触发后台处理（不等待）
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    fetch(`${baseUrl}/api/sync/trigger`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    }).catch((err) => {
      console.warn('[Sync API] 触发后台处理失败:', err.message)
      // 不影响主流程，Worker会兜底处理
    })

    return NextResponse.json({
      success: true,
      message: '同步任务已创建',
      jobId,
      status: 'pending',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建同步任务失败'
    console.error('[Sync API] 创建任务失败:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}