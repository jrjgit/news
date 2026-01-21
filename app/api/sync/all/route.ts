import { NextRequest, NextResponse } from 'next/server'

/**
 * 完整同步API - 按顺序执行所有步骤
 * 每个步骤独立运行，避免120秒超时
 */
export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const steps = [
    { name: '步骤1', url: `${baseUrl}/api/sync/step1` },
    { name: '步骤2', url: `${baseUrl}/api/sync/step2` },
    { name: '步骤3', url: `${baseUrl}/api/sync/step3` },
    { name: '步骤4', url: `${baseUrl}/api/sync/step4` },
  ]

  const results = []
  const startTime = Date.now()

  for (const step of steps) {
    const stepStartTime = Date.now()

    try {
      const response = await fetch(step.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(2)

      results.push({
        step: step.name,
        success: result.success,
        duration: `${stepDuration}秒`,
        message: result.message,
      })

      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: `${step.name}失败`,
          results,
        })
      }

      // 如果步骤1已完成，说明今日已同步
      if (result.completed) {
        return NextResponse.json({
          success: true,
          message: '今日新闻已同步',
          results,
        })
      }
    } catch (error) {
      const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(2)

      results.push({
        step: step.name,
        success: false,
        duration: `${stepDuration}秒`,
        error: error instanceof Error ? error.message : '未知错误',
      })

      return NextResponse.json({
        success: false,
        message: `${step.name}执行失败`,
        results,
      })
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

  return NextResponse.json({
    success: true,
    message: '所有步骤完成',
    results,
    totalDuration: `${totalDuration}秒`,
  })
}