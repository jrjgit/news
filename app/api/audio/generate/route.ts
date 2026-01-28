// 音频生成 API - 单独调用
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAudio } from '@/lib/tts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { date } = await req.json().catch(() => ({ date: null }))

  if (!date) {
    return Response.json({ success: false, error: '缺少 date 参数' }, { status: 400 })
  }

  try {
    // 查找需要生成音频的新闻
    const news = await prisma.news.findMany({
      where: { date },
    })

    if (news.length === 0) {
      return Response.json({ success: false, error: '未找到该日期的新闻' }, { status: 404 })
    }

    // 检查是否已有音频
    if (news[0].audioUrl) {
      return Response.json({
        success: true,
        message: '音频已存在',
        audioUrl: news[0].audioUrl,
        audioUrls: news[0].audioUrls ? JSON.parse(news[0].audioUrls) : []
      })
    }

    // 获取脚本
    let script = news[0].script
    if (!script) {
      // 如果没有脚本，拼接摘要生成
      script = news.map(n => `${n.title}。${n.summary}`).join('。')
    }

    console.log(`[AudioAPI] 开始生成音频，脚本长度: ${script.length}`)

    // 生成音频
    const audioUrls: string[] = []
    await generateAudio(script, date, async (url, idx) => {
      audioUrls.push(url)
      console.log(`[AudioAPI] 音频片段 ${idx + 1} 完成: ${url}`)
    })

    // 保存音频URL
    await prisma.news.updateMany({
      where: { date },
      data: {
        audioUrl: audioUrls[0],
        audioUrls: JSON.stringify(audioUrls),
      },
    })

    console.log(`[AudioAPI] 音频生成完成，共 ${audioUrls.length} 段`)

    return Response.json({
      success: true,
      message: '音频生成完成',
      audioUrl: audioUrls[0],
      audioUrls
    })
  } catch (error) {
    console.error('[AudioAPI] 生成失败:', error)
    const msg = error instanceof Error ? error.message : '未知错误'
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}

// 查询音频状态
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return Response.json({ success: false, error: '缺少 date 参数' }, { status: 400 })
  }

  try {
    const news = await prisma.news.findMany({
      where: { date },
      take: 1,
    })

    if (news.length === 0) {
      return Response.json({ success: false, error: '未找到新闻' }, { status: 404 })
    }

    const hasAudio = !!news[0].audioUrl

    return Response.json({
      success: true,
      hasAudio,
      audioUrl: news[0].audioUrl,
      audioUrls: news[0].audioUrls ? JSON.parse(news[0].audioUrls) : [],
      script: news[0].script,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}
