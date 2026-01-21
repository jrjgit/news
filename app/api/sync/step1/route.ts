import { NextRequest, NextResponse } from 'next/server'
import { rssParser } from '@/lib/rss-parser'
import { newsGenerator } from '@/lib/news-generator'
import { prisma } from '@/lib/db'

/**
 * 步骤1：获取和选择新闻
 * 预计耗时：5-10秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    // 检查今日是否已同步
    const existingLog = await prisma.syncLog.findUnique({
      where: { syncDate: today },
    })

    if (existingLog) {
      return NextResponse.json({
        success: true,
        message: '今日新闻已同步',
        step: 1,
        completed: true,
      })
    }

    // 获取新闻
    const allNews = await rssParser.fetchAllNews()
    const { domestic, international } = rssParser.selectDailyNews(allNews)

    // 生成摘要
    const allNewsItems = [...domestic, ...international]
    const newsWithSummaries = await newsGenerator.batchGenerateSummaries(allNewsItems)

    // 保存到临时存储（使用syncLog）
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'IN_PROGRESS',
        newsCount: newsWithSummaries.length,
        errorMessage: JSON.stringify({ domestic, international, newsWithSummaries }),
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '步骤1完成：新闻获取和摘要生成',
      step: 1,
      duration: `${duration}秒`,
      newsCount: newsWithSummaries.length,
      nextStep: '/api/sync/step2',
    })
  } catch (error) {
    console.error('步骤1失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '步骤1失败',
        step: 1,
      },
      { status: 500 }
    )
  }
}