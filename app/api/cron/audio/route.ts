// Cron 任务 - 自动生成待处理的音频
import { prisma } from '@/lib/db'
import { generateAudio } from '@/lib/tts'

export const runtime = 'nodejs'
export const maxDuration = 60

// Vercel Cron 配置: 每分钟执行一次
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  // 简单的安全验证
  if (secret && authHeader !== `Bearer ${secret}`) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 查找最近3天内没有音频但有脚本的新闻
    const today = new Date().toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const pendingNews = await prisma.news.groupBy({
      by: ['date'],
      where: {
        date: { gte: threeDaysAgo, lte: today },
        audioUrl: null,
        script: { not: null },
      },
      _count: { id: true },
    })

    if (pendingNews.length === 0) {
      return Response.json({ success: true, message: '没有待处理的音频', processed: 0 })
    }

    console.log(`[CronAudio] 发现 ${pendingNews.length} 个待处理日期`)

    // 只处理第一个（避免超时）
    const dateToProcess = pendingNews[0].date

    // 获取该日期的第一条新闻（包含脚本）
    const newsItem = await prisma.news.findFirst({
      where: { date: dateToProcess },
    })

    if (!newsItem || !newsItem.script) {
      return Response.json({ success: true, message: '没有脚本', processed: 0 })
    }

    console.log(`[CronAudio] 处理日期: ${dateToProcess}, 脚本长度: ${newsItem.script.length}`)

    // 生成音频
    const audioUrls: string[] = []
    await generateAudio(newsItem.script, dateToProcess, (url, idx) => {
      audioUrls.push(url)
      console.log(`[CronAudio] 片段 ${idx + 1} 完成: ${url}`)
    })

    // 保存
    await prisma.news.updateMany({
      where: { date: dateToProcess },
      data: {
        audioUrl: audioUrls[0],
        audioUrls: JSON.stringify(audioUrls),
      },
    })

    console.log(`[CronAudio] 完成，共 ${audioUrls.length} 段音频`)

    return Response.json({
      success: true,
      message: '音频生成完成',
      date: dateToProcess,
      audioCount: audioUrls.length,
      remaining: pendingNews.length - 1,
    })
  } catch (error) {
    console.error('[CronAudio] 错误:', error)
    const msg = error instanceof Error ? error.message : '未知错误'
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}
