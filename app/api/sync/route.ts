import { NextRequest, NextResponse } from 'next/server'
import { syncNews } from '@/cron/sync-news'

export async function POST(request: NextRequest) {
  try {
    // 等待同步任务完成
    await syncNews()

    return NextResponse.json({
      success: true,
      message: '同步任务完成',
    })
  } catch (error) {
    console.error('同步任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '同步任务失败',
      },
      { status: 500 }
    )
  }
}