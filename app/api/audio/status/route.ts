/**
 * 音频状态 API
 * 前端查询音频生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { newsGenerator } from '@/lib/news-generator'

// 检查 Redis 是否可用（KV 或 REDIS_URL）
const isRedisConfigured = () => {
  // Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return true
  }
  // 标准 REDIS_URL
  if (process.env.REDIS_URL) {
    return true
  }
  return false
}

/**
 * GET /api/audio/status?date=2026-01-23
 * 获取指定日期的音频状态
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json(
      { success: false, error: '缺少 date 参数' },
      { status: 400 }
    )
  }

  try {
    // 如果 Redis 可用，查询任务队列状态
    if (isRedisConfigured()) {
      try {
        const { getLatestAudioJob } = await import('@/lib/audio-queue')
        const audioJob = await getLatestAudioJob(date)

        if (audioJob) {
          return NextResponse.json({
            success: true,
            data: {
              status: audioJob.status,
              audioUrl: audioJob.audioUrl,
              progress: audioJob.progress,
            },
          })
        }
      } catch (kvError) {
        console.warn('KV 查询失败，降级到 Blob 检查:', kvError)
      }
    }

    // 尝试直接检查 Blob 存储
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { list } = await import('@vercel/blob')
        const { blobs } = await list({ prefix: `audio/daily-news-${date}` })
        
        if (blobs.length > 0) {
          return NextResponse.json({
            success: true,
            data: {
              status: 'completed',
              audioUrl: blobs[0].url,
              progress: 100,
            },
          })
        }
      } catch (blobError) {
        console.warn('Blob 检查失败:', blobError)
      }
    }

    // 没有找到音频，返回未生成状态
    return NextResponse.json({
      success: true,
      data: {
        status: 'not_generated',
        audioUrl: null,
        progress: 0,
      },
    })
  } catch (error) {
    console.error('获取音频状态失败:', error)
    return NextResponse.json(
      { success: false, error: '获取音频状态失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/audio/status?date=2026-01-23
 * 触发音频生成
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json(
      { success: false, error: '缺少 date 参数' },
      { status: 400 }
    )
  }

  // 检查是否配置了 Redis
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { 
        success: false, 
        error: '音频生成功能暂不可用（Redis 环境变量未配置）' 
      },
      { status: 503 }
    )
  }

  try {
    // 获取该日期的新闻脚本
    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const news = await prisma.news.findMany({
      where: {
        newsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { importance: 'desc' },
    })

    if (news.length === 0) {
      return NextResponse.json(
        { success: false, error: '该日期没有新闻数据' },
        { status: 404 }
      )
    }

    // 构建播报脚本
    const domesticNews = news.filter(n => n.category === 'DOMESTIC')
    const internationalNews = news.filter(n => n.category === 'INTERNATIONAL')

    // 使用模板生成脚本（不截断）
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

    // 创建音频生成任务
    const { enqueueAudioJob } = await import('@/lib/audio-queue')
    const jobId = await enqueueAudioJob(date, script)

    return NextResponse.json({
      success: true,
      jobId,
      message: '音频生成任务已加入队列',
    })
  } catch (error) {
    console.error('触发音频生成失败:', error)
    return NextResponse.json(
      { success: false, error: '触发音频生成失败' },
      { status: 500 }
    )
  }
}