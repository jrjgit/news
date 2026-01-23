import { NextRequest, NextResponse } from 'next/server'
import { syncNews, type SyncResult } from '@/cron/sync-news'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timeoutMs = 250000 // 250秒，留5秒给超时响应

  // 超时控制器
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutController.abort()
  }, timeoutMs)

  try {
    console.log('[Sync API] 开始同步新闻...')
    
    const result = await Promise.race([
      syncNews(),
      new Promise<SyncResult>((_, reject) => 
        timeoutController.signal.addEventListener('abort', () => {
          reject(new Error('同步超时'))
        })
      )
    ]) as SyncResult

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`[Sync API] 同步完成，耗时 ${duration}秒，生成 ${result.newsGenerated} 条新闻`)

    return NextResponse.json({
      success: result.success,
      message: result.success ? '新闻同步成功' : '同步部分失败',
      newsGenerated: result.newsGenerated,
      duration: `${duration}秒`,
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const errorMessage = error instanceof Error ? error.message : '同步失败'

    console.error('[Sync API] 同步失败:', errorMessage)

    // 如果是超时，返回特殊状态码
    if (errorMessage.includes('超时')) {
      return NextResponse.json(
        {
          success: false,
          error: '同步超时，请稍后重试',
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