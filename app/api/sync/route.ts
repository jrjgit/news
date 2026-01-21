import { NextRequest, NextResponse } from 'next/server'
import { syncNews } from '@/cron/sync-news'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    await syncNews()
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '新闻同步成功',
      duration: `${duration}秒`,
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.error('同步失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '同步失败',
        duration: `${duration}秒`,
      },
      { status: 500 }
    )
  }
}