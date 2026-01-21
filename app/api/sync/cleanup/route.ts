import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const todayStart = new Date(dateStr)
    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 删除今天的所有syncLog记录
    const deleted = await prisma.syncLog.deleteMany({
      where: {
        syncDate: {
          gte: todayStart,
          lt: tomorrow,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `已删除 ${deleted.count} 条今日的同步记录`,
      deletedCount: deleted.count,
    })
  } catch (error) {
    console.error('清理失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '清理失败',
      },
      { status: 500 }
    )
  }
}