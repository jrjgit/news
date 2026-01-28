import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt' // 支持: importance, createdAt, newsDate
    const order = searchParams.get('order') || 'desc' // 支持: asc, desc

    // 构建查询条件
    const where: {
      newsDate?: {
        gte: Date
        lte: Date
      }
      category?: 'DOMESTIC' | 'INTERNATIONAL'
    } = {}

    if (date) {
      // 使用日期范围查询，忽略时间部分
      const targetDate = new Date(date)
      const startDate = new Date(targetDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(targetDate)
      endDate.setHours(23, 59, 59, 999)

      where.newsDate = {
        gte: startDate,
        lte: endDate,
      }
    } else {
      // 默认返回今天的新闻
      const today = new Date()
      const startDate = new Date(today)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)

      where.newsDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    if (category) {
      where.category = category.toUpperCase() as 'DOMESTIC' | 'INTERNATIONAL'
    }

    // 构建排序条件
    const orderBy: Array<{ [key: string]: 'asc' | 'desc' }> = []
    const validSortFields = ['importance', 'createdAt', 'newsDate']
    const validOrder = ['asc', 'desc']

    if (validSortFields.includes(sortBy) && validOrder.includes(order)) {
      orderBy.push({ [sortBy]: order as 'asc' | 'desc' })
    } else {
      // 默认排序
      orderBy.push({ createdAt: 'desc' })
    }

    // 如果按重要性排序，重要性相同时按创建时间排序
    if (sortBy === 'importance') {
      orderBy.push({ createdAt: 'desc' })
    }

    // 查询新闻 - 添加分页限制避免大数据量查询超时
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    
    const news = await prisma.news.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        content: false, // 不返回完整内容，减少数据传输
        summary: true,
        translatedContent: false, // 不返回翻译内容
        originalLink: true,
        source: true,
        category: true,
        importance: true,
        newsDate: true,
        audioUrl: true,
        script: false, // 不返回脚本
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: news,
      count: news.length,
      meta: {
        sortBy,
        order,
        limit,
      },
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
