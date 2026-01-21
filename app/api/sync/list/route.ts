import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const syncLogs = await prisma.syncLog.findMany({
      orderBy: {
        syncDate: 'desc',
      },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      count: syncLogs.length,
      logs: syncLogs.map(log => ({
        id: log.id,
        syncDate: log.syncDate,
        status: log.status,
        newsCount: log.newsCount,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error('获取同步日志失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取同步日志失败',
      },
      { status: 500 }
    )
  }
}