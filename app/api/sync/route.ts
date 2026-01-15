import { NextRequest, NextResponse } from 'next/server'
import { syncNews } from '@/cron/sync-news'

export async function POST(request: NextRequest) {
  try {
    // 在后台执行同步任务
    syncNews()
      .then(() => {
        console.log('同步任务完成')
      })
      .catch((error) => {
        console.error('同步任务失败:', error)
      })

    return NextResponse.json({
      success: true,
      message: '同步任务已启动',
    })
  } catch (error) {
    console.error('启动同步任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '启动同步任务失败',
      },
      { status: 500 }
    )
  }
}