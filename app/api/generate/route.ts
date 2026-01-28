// 流式生成日报 - Serverless Optimized
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAllNews } from '@/lib/rss'
import { summarize, translate, generateScript } from '@/lib/ai'
import { generateAudio } from '@/lib/tts'
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

    // 6. 生成音频 (70-100%)
    await updateJob(job.id, 70, '生成音频...')
    let audioUrls: string[] = []
    try {
      console.log(`[Generate] 开始生成音频，脚本长度: ${script.length}`)
      const estimatedChunks = Math.ceil(script.length / 300)
      await generateAudio(script, date, (url, idx) => {
        audioUrls.push(url)
        console.log(`[Generate] 音频片段 ${idx + 1} 完成: ${url}`)
        const progress = 70 + Math.floor(((idx + 1) / Math.max(estimatedChunks, 1)) * 25)
        updateJob(job.id, progress, `音频片段 ${idx + 1}`).catch(console.error)
      })
      console.log(`[Generate] 音频生成完成，共 ${audioUrls.length} 段`)
    } catch (audioError) {
      console.error('[Generate] 音频生成失败:', audioError)
      // 继续，只是没有音频
    }

    // 7. 完成 - 存储所有音频URL
    await prisma.news.updateMany({
      where: { date },
      data: { 
        audioUrl: audioUrls[0],
        audioUrls: JSON.stringify(audioUrls)
      },
    })

    await updateJob(job.id, 100, '完成', allNews.length)

    return Response.json({ success: true, count: allNews.length, date })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: msg, message: '失败' },
    })
    return Response.json({ success: false, error: msg }, { status: 500 })
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
