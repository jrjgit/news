import { NextRequest, NextResponse } from 'next/server'
import { newsGenerator } from '@/lib/news-generator'
import { prisma, Status } from '@/lib/db'

/**
 * 步骤2：翻译和评估重要性
 * 预计耗时：30-40秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const today = new Date()

    // 获取步骤1的数据
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: today },
    })

    if (!syncLog || syncLog.status !== Status.IN_PROGRESS) {
      return NextResponse.json({
        success: false,
        error: '请先执行步骤1',
      })
    }

    const data = JSON.parse(syncLog.errorMessage || '{}')
    const { newsWithSummaries } = data

    if (!newsWithSummaries) {
      return NextResponse.json({
        success: false,
        error: '未找到步骤1的数据',
      })
    }

    // 翻译国际新闻
    const newsWithTranslations = await newsGenerator.batchTranslateInternationalNews(newsWithSummaries)

    // 评估重要性
    const newsWithImportance = await newsGenerator.batchEvaluateImportance(newsWithTranslations)

    // 更新syncLog
    await prisma.syncLog.update({
      where: { syncDate: today },
      data: {
        errorMessage: JSON.stringify({ ...data, newsWithImportance }),
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '步骤2完成：翻译和重要性评估',
      step: 2,
      duration: `${duration}秒`,
      nextStep: '/api/sync/step3',
    })
  } catch (error) {
    console.error('步骤2失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '步骤2失败',
        step: 2,
      },
      { status: 500 }
    )
  }
}