import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const todayDateOnly = new Date(dateStr)

    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
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

    // 检查newsWithImportance中的翻译内容
    const internationalNews = data?.newsWithImportance?.filter((n: any) => n.category === 'INTERNATIONAL') || []

    return NextResponse.json({
      exists: true,
      status: syncLog.status,
      syncDate: syncLog.syncDate,
      newsCount: syncLog.newsCount,
      internationalNewsCount: internationalNews.length,
      internationalNews: internationalNews.map((n: any) => ({
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
    console.error('获取同步数据调试信息失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取同步数据调试信息失败',
      },
      { status: 500 }
    )
  }
}