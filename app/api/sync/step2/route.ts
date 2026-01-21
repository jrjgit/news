import { NextRequest, NextResponse } from 'next/server'
import { newsGenerator } from '@/lib/news-generator'
import { prisma, Status } from '@/lib/db'
import { syncConfig, sleep } from '@/lib/config'

/**
 * 步骤2：翻译和评估重要性
 * 预计耗时：30-40秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const todayDateOnly = new Date(dateStr)

  try {

    // 获取步骤1的数据
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
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

    // 步骤间延迟，给智谱AI时间恢复配额
    console.log(`步骤2：等待 ${syncConfig.stepDelay / 1000} 秒后开始处理`)
    await sleep(syncConfig.stepDelay)

    // 翻译国际新闻
    const newsWithTranslations = await newsGenerator.batchTranslateInternationalNews(newsWithSummaries)

    // 评估重要性
    const newsWithImportance = await newsGenerator.batchEvaluateImportance(newsWithTranslations)

    // 更新syncLog
    await prisma.syncLog.update({
      where: { syncDate: todayDateOnly },
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
        error: '步骤2失败',
        step: 2,
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}