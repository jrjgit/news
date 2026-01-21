import { NextRequest, NextResponse } from 'next/server'
import { newsGenerator, NewsWithSummary } from '@/lib/news-generator'
import { edgeTTS } from '@/lib/tts'
import { prisma, Status } from '@/lib/db'

/**
 * 步骤4：保存到数据库
 * 预计耗时：10-15秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const todayDateOnly = new Date(dateStr)

  try {

    // 获取步骤3的数据
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })

    if (!syncLog || syncLog.status !== Status.IN_PROGRESS) {
      return NextResponse.json({
        success: false,
        error: '请先执行步骤3',
      })
    }

    const data = JSON.parse(syncLog.errorMessage || '{}')
    const { newsWithImportance, script, audioUrl } = data

    if (!newsWithImportance) {
      return NextResponse.json({
        success: false,
        error: '未找到步骤3的数据',
      })
    }

    // 生成单条新闻音频
    const audioPromises = newsWithImportance.map(async (news: NewsWithSummary, index: number) => {
      const individualScript = newsGenerator.generateIndividualScript(news)
      const newsAudioUrl = await edgeTTS.generateIndividualNewsAudio(individualScript, index + 1)
      return { news, audioUrl: newsAudioUrl, script: individualScript }
    })

    const audioResults = await Promise.all(audioPromises)

    // 保存到数据库
    const savedNews = []

    for (const { news, audioUrl, script } of audioResults) {
      const saved = await prisma.news.create({
        data: {
          title: news.title,
          content: news.content,
          summary: news.summary,
          translatedContent: news.translatedContent,
          originalLink: news.link,
          source: news.source,
          category: news.category,
          importance: news.importance || 3,
          newsDate: today,
          audioUrl,
          script,
        },
      })

      savedNews.push(saved)
    }

    // 更新syncLog为成功，但保留script供步骤5使用
    await prisma.syncLog.update({
      where: { syncDate: todayDateOnly },
      data: {
        status: Status.SUCCESS,
        newsCount: savedNews.length,
        errorMessage: JSON.stringify({ script }),
      },
    })

    // 清理旧数据
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '3')
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    await prisma.news.deleteMany({
      where: { newsDate: { lt: cutoffDate } },
    })

    await prisma.syncLog.deleteMany({
      where: { syncDate: { lt: cutoffDate } },
    })

    await edgeTTS.cleanupOldAudio(retentionDays)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '步骤4完成：数据保存成功',
      step: 4,
      duration: `${duration}秒`,
      totalNews: savedNews.length,
      nextStep: '/api/sync/step5',
      completed: false, // 还有步骤5需要执行
    })
  } catch (error) {
    console.error('步骤4失败:', error)

    // 获取当前数据以保留script
    const currentLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })
    const currentData = currentLog?.errorMessage ? JSON.parse(currentLog.errorMessage) : { script: '' }

    // 更新syncLog为失败，但保留script
    await prisma.syncLog.update({
      where: { syncDate: todayDateOnly },
      data: {
        status: Status.FAILED,
        errorMessage: JSON.stringify({
          ...currentData,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      },
    })

    return NextResponse.json(
      {
        success: false,
        error: '步骤4失败',
        step: 4,
      },
      { status: 500 }
    )
  }
}