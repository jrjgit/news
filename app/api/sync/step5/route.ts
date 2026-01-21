import { NextRequest, NextResponse } from 'next/server'
import { edgeTTS } from '@/lib/tts'
import { prisma, Status } from '@/lib/db'

/**
 * 步骤5：生成整体播报音频
 * 预计耗时：可能需要较长时间（2-5分钟）
 * 注意：此步骤可能超过Vercel的5分钟超时限制
 * 建议在本地环境或使用更长的超时配置执行
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const todayDateOnly = new Date(dateStr)

  try {
    // 获取步骤4的数据
    const syncLog = await prisma.syncLog.findUnique({
      where: { syncDate: todayDateOnly },
    })

    if (!syncLog || syncLog.status !== Status.SUCCESS) {
      return NextResponse.json({
        success: false,
        error: '请先完成步骤4',
      })
    }

    const data = JSON.parse(syncLog.errorMessage || '{}')
    const { script } = data

    if (!script) {
      return NextResponse.json({
        success: false,
        error: '未找到播报脚本',
      })
    }

    // 生成整体音频
    console.log('开始生成整体播报音频...')
    const audioUrl = await edgeTTS.generateDailyNewsAudio(script, dateStr)
    console.log('整体播报音频生成完成')

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: true,
      message: '步骤5完成：整体播报音频生成',
      step: 5,
      duration: `${duration}秒`,
      audioUrl,
      completed: true,
    })
  } catch (error) {
    console.error('步骤5失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: '步骤5失败：音频生成超时或失败',
        step: 5,
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}