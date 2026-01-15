import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const category = searchParams.get('category')

    // 构建查询条件
    const where: any = {}

    if (date) {
      where.newsDate = new Date(date)
    } else {
      // 默认返回今天的新闻
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.newsDate = today
    }

    if (category) {
      where.category = category.toUpperCase()
    }

    // 查询新闻
    const news = await prisma.news.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: news,
      count: news.length,
    })
  } catch (error) {
    console.error('获取新闻失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取新闻失败',
      },
      { status: 500 }
    )
  }
}