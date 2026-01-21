import { NextRequest, NextResponse } from 'next/server'
import { rssParser } from '@/lib/rss-parser'
import { newsGenerator } from '@/lib/news-generator'
import { prisma, Status } from '@/lib/db'

/**
 * 步骤1：获取和选择新闻
 * 预计耗时：5-10秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const todayDateOnly = new Date(dateStr)

  try {

    // 检查今日是否已同步
    const existingLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })

    if (existingLog) {
      // 如果已成功完成，返回完成状态
      if (existingLog.status === Status.SUCCESS) {
        return NextResponse.json({
          success: true,
          message: '今日新闻已同步',
          step: 1,
          completed: true,
        })
      }
      // 如果是失败或进行中状态，允许重新执行
      // 删除旧的记录，重新开始
      await prisma.syncLog.delete({
        where: { syncDate: todayDateOnly },
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
        syncDate: todayDateOnly,
        status: Status.IN_PROGRESS,
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

    // 更新syncLog为失败
    await prisma.syncLog.update({
      where: { syncDate: todayDateOnly },
      data: {
        status: Status.FAILED,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      },
    })

    return NextResponse.json(
      {
        success: false,
        error: '步骤1失败',
        step: 1,
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}