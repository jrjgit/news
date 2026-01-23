/**
 * Cron触发器端点 - 供 Vercel Cron Job 调用
 * GET /api/sync/cron
 * 
 * 功能：
 * 1. 同步新闻（不包括音频生成）
 * 2. 生成当日音频播报
 * 
 * Vercel Cron 配置示例 (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/sync/cron",
 *       "schedule": "0 18 * * *"
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server'
import { syncNews, type SyncResult } from '@/cron/sync-news'
import { aiCircuitBreaker } from '@/lib/circuit-breaker'
import { prisma } from '@/lib/db'
import { newsGenerator } from '@/lib/news-generator'
import { edgeTTS } from '@/lib/tts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const timeoutMs = 250000 // 250秒

  console.log('[Cron] 收到 Cron 触发请求')

  // 超时控制器
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutController.abort()
  }, timeoutMs)

  try {
    // 1. 同步新闻（不包括音频生成）
    const result = await Promise.race([
      syncNews(false, 10, undefined, aiCircuitBreaker, false), // 最后一个参数 false 表示不生成音频
      new Promise<SyncResult>((_, reject) => 
        timeoutController.signal.addEventListener('abort', () => {
          reject(new Error('同步超时'))
        })
      )
    ]) as SyncResult

    console.log(`[Cron] 同步完成，生成 ${result.newsGenerated} 条新闻`)

    // 2. 查询今日新闻，生成音频
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayNews = await prisma.news.findMany({
      where: {
        newsDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { importance: 'desc' },
    })

    if (todayNews.length === 0) {
      return NextResponse.json({
        success: true,
        message: '同步成功，无新闻数据',
        newsGenerated: result.newsGenerated,
        audioGenerated: false,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}秒`,
      })
    }

    // 3. 构建播报脚本
    const domesticNews = todayNews.filter(n => n.category === 'DOMESTIC')
    const internationalNews = todayNews.filter(n => n.category === 'INTERNATIONAL')

    const script = newsGenerator.generateTemplateScript(
      domesticNews.map(n => ({
        title: n.title,
        content: n.translatedContent || n.summary || n.content,
        source: n.source,
        category: n.category as 'DOMESTIC' | 'INTERNATIONAL',
        link: n.originalLink || undefined,
        pubDate: undefined,
      })),
      internationalNews.map(n => ({
        title: n.title,
        content: n.translatedContent || n.summary || n.content,
        source: n.source,
        category: n.category as 'DOMESTIC' | 'INTERNATIONAL',
        link: n.originalLink || undefined,
        pubDate: undefined,
      }))
    )

    console.log(`[Cron] 播报脚本生成完成，${script.length} 字`)

    // 4. 生成音频
    const dateStr = today.toISOString().split('T')[0]
    console.log(`[Cron] 开始生成音频...`)
    const audioUrl = await edgeTTS.generateDailyNewsAudio(script, dateStr)

    console.log(`[Cron] 音频生成完成: ${audioUrl}`)

    // 5. 更新数据库中的音频 URL
    await prisma.news.updateMany({
      where: {
        newsDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      data: {
        audioUrl,
        script,
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      success: result.success,
      message: '同步和音频生成成功',
      newsGenerated: result.newsGenerated,
      audioGenerated: true,
      audioUrl,
      duration: `${duration}秒`,
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const errorMessage = error instanceof Error ? error.message : '处理失败'

    console.error('[Cron] 处理失败:', errorMessage)

    // 如果是超时，返回特殊状态码
    if (errorMessage.includes('超时')) {
      return NextResponse.json(
        {
          success: false,
          error: '同步超时',
          duration: `${duration}秒`,
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}秒`,
      },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
