import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const todayDateOnly = new Date(dateStr)

    const news = await prisma.news.findMany({
      where: {
        newsDate: todayDateOnly,
        category: 'INTERNATIONAL',
      },
      select: {
        id: true,
        title: true,
        content: true,
        translatedContent: true,
        summary: true,
      },
      orderBy: {
        id: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      count: news.length,
      news: news.map(n => ({
        id: n.id,
        title: n.title,
        originalContentLength: n.content?.length || 0,
        translatedContentLength: n.translatedContent?.length || 0,
        hasTranslation: !!n.translatedContent,
        isTranslated: n.translatedContent !== n.content,
        translatedContent: n.translatedContent ? (n.translatedContent.substring(0, 100) + (n.translatedContent.length > 100 ? '...' : '')) : '',
        originalContent: n.content ? (n.content.substring(0, 100) + (n.content.length > 100 ? '...' : '')) : '',
      })),
    })
  } catch (error) {
    console.error('获取翻译调试信息失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取翻译调试信息失败',
      },
      { status: 500 }
    )
  }
}