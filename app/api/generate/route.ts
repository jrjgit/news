// 流式生成日报 - Serverless Optimized
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAllNews } from '@/lib/rss'
import { summarize, translate, generateScript } from '@/lib/ai'
import { config } from '@/lib/config'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel 最大 60s

export async function POST(req: NextRequest) {
  const { date = new Date().toISOString().slice(0, 10) } = await req.json().catch(() => ({}))

  // 创建任务记录
  const job = await prisma.syncJob.upsert({
    where: { date },
    create: { date, status: 'RUNNING', progress: 0, message: '开始获取新闻' },
    update: { status: 'RUNNING', progress: 0, message: '开始获取新闻' },
  })

  try {
    // 1. 获取 RSS (10%)
    await updateJob(job.id, 10, '获取RSS新闻...')
    const items = await fetchAllNews()

    // 2. 筛选分类 (20%)
    await updateJob(job.id, 20, '筛选新闻...')
    const domestic = items.filter(i => i.category === 'DOMESTIC').slice(0, config.newsCount.domestic)
    const international = items.filter(i => i.category === 'INTERNATIONAL').slice(0, config.newsCount.international)

    // 3. AI 摘要 (20-50%)
    await updateJob(job.id, 30, '生成AI摘要...')
    const domesticWithSummary = await Promise.all(
      domestic.map(async (item, idx) => {
        const summary = await summarize(item.content)
        await updateJob(job.id, 30 + Math.floor((idx / domestic.length) * 15), `摘要 ${idx + 1}/${domestic.length}`)
        return { ...item, summary }
      })
    )

    await updateJob(job.id, 45, '翻译国际新闻...')
    const internationalWithTrans = await Promise.all(
      international.map(async (item, idx) => {
        const summary = await translate(item.content)
        await updateJob(job.id, 45 + Math.floor((idx / international.length) * 10), `翻译 ${idx + 1}/${international.length}`)
        return { ...item, summary }
      })
    )

    // 4. 保存到数据库 (50-60%)
    await updateJob(job.id, 55, '保存新闻数据...')
    const allNews = [...domesticWithSummary, ...internationalWithTrans]

    await prisma.news.deleteMany({ where: { date } })
    await prisma.news.createMany({
      data: allNews.map(n => ({
        title: n.title,
        summary: n.summary,
        content: n.content,
        source: n.source,
        category: n.category,
        date,
        importance: Math.floor(Math.random() * 3) + 3, // 3-5
      })),
    })

    // 5. 生成播报文案 (60-70%)
    await updateJob(job.id, 60, '生成播报文案...')
    const script = await generateScript(allNews.map(n => ({ title: n.title, summary: n.summary })))

    // 6. 保存脚本，音频异步生成 (70%)
    await updateJob(job.id, 70, '等待音频生成...')
    await prisma.news.updateMany({
      where: { date },
      data: { script },
    })

    // 7. 触发后台音频生成（不等待完成）
    triggerAudioGeneration(script, date, job.id).catch(console.error)

    await updateJob(job.id, 75, '新闻已生成，音频后台处理中', allNews.length)

    return Response.json({
      success: true,
      count: allNews.length,
      date,
      message: '新闻已生成，音频后台处理中'
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: msg, message: '失败' },
    })
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}

// 后台触发音频生成（使用 fetch 调用另一个 API 端点）
async function triggerAudioGeneration(script: string, date: string, jobId: string) {
  try {
    // 使用 setImmediate 让当前请求先返回
    setTimeout(async () => {
      try {
        const { generateAudio } = await import('@/lib/tts')
        console.log(`[AudioWorker] 开始生成音频，脚本长度: ${script.length}`)

        const audioUrls: string[] = []
        await generateAudio(script, date, async (url, idx) => {
          audioUrls.push(url)
          console.log(`[AudioWorker] 音频片段 ${idx + 1} 完成: ${url}`)

          // 更新进度
          try {
            await prisma.syncJob.update({
              where: { id: jobId },
              data: { progress: 75 + Math.min(idx * 5, 24), message: `音频片段 ${idx + 1}` },
            })
          } catch (e) {
            // ignore
          }
        })

        // 保存音频URL
        await prisma.news.updateMany({
          where: { date },
          data: {
            audioUrl: audioUrls[0],
            audioUrls: JSON.stringify(audioUrls),
          },
        })

        await prisma.syncJob.update({
          where: { id: jobId },
          data: { progress: 100, message: '完成' },
        })

        console.log(`[AudioWorker] 音频生成完成，共 ${audioUrls.length} 段`)
      } catch (error) {
        console.error('[AudioWorker] 音频生成失败:', error)
      }
    }, 100)
  } catch (error) {
    console.error('[AudioWorker] 触发音频生成失败:', error)
  }
}

async function updateJob(id: string, progress: number, message: string, count?: number) {
  try {
    await prisma.syncJob.update({
      where: { id },
      data: { progress, message, newsCount: count },
    })
  } catch (e) {
    console.log(`[Job ${id}] 更新失败，可能任务不存在:`, e)
  }
}
