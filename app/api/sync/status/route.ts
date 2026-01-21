import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: today },
    })

    if (!syncLog) {
      return NextResponse.json({
        exists: false,
        message: '今日没有同步记录',
      })
    }

    // 尝试解析errorMessage中的数据
    let data = null
    try {
      data = syncLog.errorMessage ? JSON.parse(syncLog.errorMessage) : null
    } catch (e) {
      // 解析失败，保持原样
    }

    return NextResponse.json({
      exists: true,
      status: syncLog.status,
      syncDate: syncLog.syncDate,
      newsCount: syncLog.newsCount,
      errorMessage: syncLog.errorMessage,
      parsedData: data,
      createdAt: syncLog.createdAt,
    })
  } catch (error) {
    console.error('获取状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取状态失败',
      },
      { status: 500 }
    )
  }
}