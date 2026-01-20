import cron from 'node-cron'
import { prisma } from '@/lib/db'
import { rssParser } from '@/lib/rss-parser'
import { newsGenerator, NewsWithSummary } from '@/lib/news-generator'
import { edgeTTS } from '@/lib/tts'
import { AIService } from '@/lib/ai-service'

/**
 * 同步新闻主流程
 */
export async function syncNews() {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const startTime = Date.now()

  console.log(`开始同步新闻: ${dateStr}`)

  try {
    // 检查今日是否已同步
    const existingLog = await prisma.syncLog.findUnique({
      where: { syncDate: today },
    })

    if (existingLog) {
      console.log('今日新闻已同步，跳过')
      return
    }

    // 步骤1: 获取所有新闻
    console.log('步骤 1/7: 获取RSS新闻...')
    const allNews = await rssParser.fetchAllNews()

    if (allNews.length === 0) {
      throw new Error('未获取到任何新闻')
    }

    console.log(`获取到 ${allNews.length} 条原始新闻`)

    // 步骤2: 选择每日新闻
    console.log('步骤 2/7: 选择每日新闻...')
    const { domestic, international } = rssParser.selectDailyNews(allNews)

    console.log(`选择 ${domestic.length} 条国内新闻，${international.length} 条国际新闻`)

    // 步骤3: 生成AI摘要（如果启用AI）
    console.log('步骤 3/7: 生成AI摘要...')
    const allNewsItems = [...domestic, ...international]
    const newsWithSummaries = await newsGenerator.batchGenerateSummaries(allNewsItems)
    console.log(`摘要生成完成`)

    // 步骤4: 翻译国际新闻（如果启用AI）
    console.log('步骤 4/7: 翻译国际新闻...')
    const newsWithTranslations = await newsGenerator.batchTranslateInternationalNews(newsWithSummaries)
    console.log(`翻译完成`)

    // 步骤5: 评估新闻重要性（如果启用AI）
    console.log('步骤 5/7: 评估新闻重要性...')
    const newsWithImportance = await newsGenerator.batchEvaluateImportance(newsWithTranslations)
    console.log(`重要性评估完成`)

    // 步骤6: 生成播报文案（AI或模板）
    console.log('步骤 6/7: 生成播报文案...')
    const domesticWithSummary = newsWithImportance.filter(n => n.category === 'DOMESTIC')
    const internationalWithSummary = newsWithImportance.filter(n => n.category === 'INTERNATIONAL')
    const script = await newsGenerator.generateScript(domesticWithSummary, internationalWithSummary)
    console.log(`播报文案生成完成`)

    // 步骤7: 生成音频
    console.log('步骤 7/7: 生成音频...')
    const audioUrl = await edgeTTS.generateDailyNewsAudio(script, dateStr)
    console.log(`整体音频生成完成`)

    // 保存新闻到数据库
    const savedNews = []

    // 并行生成每条新闻的音频（优化性能）
    console.log('生成单条新闻音频...')
    const audioPromises = newsWithImportance.map(async (news, index) => {
      const individualScript = newsGenerator.generateIndividualScript(news)
      const newsAudioUrl = await edgeTTS.generateIndividualNewsAudio(individualScript, index + 1)
      return { news, audioUrl: newsAudioUrl, script: individualScript }
    })

    const audioResults = await Promise.all(audioPromises)

    // 保存到数据库
    for (const { news, audioUrl, script } of audioResults) {
      const newsWithSummary = news as NewsWithSummary
      
      const saved = await prisma.news.create({
        data: {
          title: news.title,
          content: news.content,
          summary: newsWithSummary.summary,
          translatedContent: newsWithSummary.translatedContent,
          originalLink: news.link,
          source: news.source,
          category: news.category,
          importance: newsWithSummary.importance || 3,
          newsDate: today,
          audioUrl,
          script,
        },
      })

      savedNews.push(saved)
    }

    // 记录同步日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'SUCCESS',
        newsCount: savedNews.length,
      },
    })

    // 清理旧数据
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '3')
    await cleanupOldData(retentionDays)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ 新闻同步完成，共保存 ${savedNews.length} 条新闻，耗时 ${duration} 秒`)
  } catch (error) {
    console.error('❌ 新闻同步失败:', error)

    // 记录失败日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'FAILED',
        newsCount: 0,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      },
    })

    throw error
  }
}

/**
 * 清理旧数据
 */
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
  })

  // 删除旧日志
  const deletedLogs = await prisma.syncLog.deleteMany({
    where: {
      syncDate: {
        lt: cutoffDate,
      },
    },
  })

  // 清理旧音频文件
  await edgeTTS.cleanupOldAudio(retentionDays)

  console.log(`清理完成: 删除 ${deletedNews.count} 条新闻，${deletedLogs.count} 条日志`)
}

/**
 * 启动定时任务
 */
export function startCronJob() {
  const schedule = process.env.CRON_SCHEDULE || '0 2 * * *'

  cron.schedule(schedule, async () => {
    console.log('🕐 定时任务触发')
    await syncNews()
  })

  console.log(`⏰ 定时任务已启动，执行时间: ${schedule}`)
}

// 如果直接运行此文件，执行一次同步
if (require.main === module) {
  // 初始化AI服务（如果配置了）
  if (process.env.AI_SERVICE_PROVIDER) {
    AIService.initialize()
      .then(() => console.log('AI服务初始化成功'))
      .catch(err => console.warn('AI服务初始化失败:', err))
  }

  syncNews()
    .then(() => {
      console.log('✅ 同步完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 同步失败:', error)
      process.exit(1)
    })
}