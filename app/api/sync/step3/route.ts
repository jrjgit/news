import { NextRequest, NextResponse } from 'next/server'
import { newsGenerator, NewsWithSummary } from '@/lib/news-generator'
import { edgeTTS } from '@/lib/tts'
import { prisma, Status } from '@/lib/db'

/**
 * 步骤3：生成播报脚本
 * 预计耗时：10-15秒
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const todayDateOnly = new Date(dateStr)

  try {

    // 获取步骤2的数据
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })

    if (!syncLog || syncLog.status !== Status.IN_PROGRESS) {
      return NextResponse.json({
        success: false,
        error: '请先执行步骤2',
      })
    }

    const data = JSON.parse(syncLog.errorMessage || '{}')
    const { newsWithImportance, domestic, international } = data

    if (!newsWithImportance) {
      return NextResponse.json({
        success: false,
        error: '未找到步骤2的数据',
      })
    }

    // 生成播报脚本
    const domesticWithSummary = newsWithImportance.filter((n: NewsWithSummary) => n.category === 'DOMESTIC')
    const internationalWithSummary = newsWithImportance.filter((n: NewsWithSummary) => n.category === 'INTERNATIONAL')
    const script = await newsGenerator.generateScript(domesticWithSummary, internationalWithSummary)

    // 更新syncLog
    await prisma.syncLog.update({
      where: { syncDate: todayDateOnly },
      data: {
        errorMessage: JSON.stringify({ ...data, script }),
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '步骤3完成：播报脚本生成',
      step: 3,
      duration: `${duration}秒`,
      nextStep: '/api/sync/step4',
    })
  } catch (error) {
    console.error('步骤3失败:', error)

    // 获取当前数据以保留newsWithImportance
    const currentLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })
    const currentData = currentLog?.errorMessage ? JSON.parse(currentLog.errorMessage) : {}

    // 更新syncLog为失败，但保留newsWithImportance
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
        error: '步骤3失败',
        step: 3,
      },
      { status: 500 }
    )
  }
}