import cron from 'node-cron'
import { prisma } from '@/lib/db'
import { rssParser } from '@/lib/rss-parser'
import { newsGenerator } from '@/lib/news-generator'
import { edgeTTS } from '@/lib/tts'

export async function syncNews() {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  console.log(`开始同步新闻: ${dateStr}`)

  try {
    // 检查今日是否已同步
    const existingLog = await prisma.syncLog.findUnique({
      where: { syncDate: today },
    }) as any

    if (existingLog) {
      console.log('今日新闻已同步，跳过')
      return
    }

    // 获取所有新闻
    const allNews = await rssParser.fetchAllNews()

    if (allNews.length === 0) {
      throw new Error('未获取到任何新闻')
    }

    // 选择每日新闻
    const { domestic, international } = rssParser.selectDailyNews(allNews)

    console.log(`获取到 ${domestic.length} 条国内新闻，${international.length} 条国际新闻`)

    // 生成播报文案
    const script = newsGenerator.generateScript(domestic, international)

    // 生成音频
    const audioUrl = await edgeTTS.generateDailyNewsAudio(script, dateStr)

    // 保存新闻到数据库
    const savedNews = []

    for (const news of [...domestic, ...international]) {
      const individualScript = newsGenerator.generateIndividualScript(news)
      const newsAudioUrl = await edgeTTS.generateIndividualNewsAudio(individualScript, savedNews.length + 1)

      const saved = await prisma.news.create({
        data: {
          title: news.title,
          content: news.content,
          source: news.source,
          category: news.category,
          newsDate: today,
          audioUrl: newsAudioUrl,
          script: individualScript,
        },
      }) as any

      savedNews.push(saved)
    }

    // 记录同步日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'SUCCESS',
        newsCount: savedNews.length,
      },
    }) as any

    // 清理旧数据
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '3')
    await cleanupOldData(retentionDays)

    console.log(`新闻同步完成，共保存 ${savedNews.length} 条新闻`)
  } catch (error) {
    console.error('新闻同步失败:', error)

    // 记录失败日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'FAILED',
        newsCount: 0,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      },
    }) as any

    throw error
  }
}

async function cleanupOldData(retentionDays: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // 删除旧新闻
  const deletedNews = await prisma.news.deleteMany({
    where: {
      newsDate: {
        lt: cutoffDate,
      },
    },
  }) as any

  // 删除旧日志
  const deletedLogs = await prisma.syncLog.deleteMany({
    where: {
      syncDate: {
        lt: cutoffDate,
      },
    },
  }) as any

  // 清理旧音频文件
  await edgeTTS.cleanupOldAudio(retentionDays)

  console.log(`清理完成: 删除 ${deletedNews.count} 条新闻，${deletedLogs.count} 条日志`)
}

// 启动定时任务
export function startCronJob() {
  const schedule = process.env.CRON_SCHEDULE || '0 2 * * *'

  cron.schedule(schedule, async () => {
    console.log('定时任务触发')
    await syncNews()
  })

  console.log(`定时任务已启动，执行时间: ${schedule}`)
}

// 如果直接运行此文件，执行一次同步
if (require.main === module) {
  syncNews()
    .then(() => {
      console.log('同步完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('同步失败:', error)
      process.exit(1)
    })
}