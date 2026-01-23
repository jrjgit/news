/**
 * 新闻同步核心逻辑
 * 支持进度回调和熔断器保护
 */

import cron from 'node-cron'
import { prisma } from '@/lib/db'
import { rssParser } from '@/lib/rss-parser'
import { newsGenerator, NewsWithSummary } from '@/lib/news-generator'
import { enqueueAudioJob } from '@/lib/audio-queue'
import { AIService } from '@/lib/ai-service'
import { getRateLimitBackoff, sleep, isNonRetryableError } from '@/lib/config'
import { isRateLimitError, isTimeoutError, CircuitBreaker } from '@/lib/circuit-breaker'

// 同步进度接口
export interface SyncProgress {
  stage: string
  progress: number
  message?: string
  details?: {
    current?: number
    total?: number
    failed?: string[]
  }
}

// 同步结果接口
export interface SyncResult {
  success: boolean
  newsGenerated: number
  error?: string
}

/**
 * 同步新闻主流程（支持进度回调和熔断器）
 * @param forceRefresh 是否强制刷新
 * @param newsCount 新闻数量
 * @param onProgress 进度回调
 * @param circuitBreaker 熔断器
 * @param generateAudio 是否生成音频（默认true，用于手动同步；cron模式下由调用方控制）
 */
export async function syncNews(
  forceRefresh: boolean = false,
  newsCount: number = 10,
  onProgress?: (progress: SyncProgress) => void,
  circuitBreaker?: CircuitBreaker,
  generateAudio: boolean = true
): Promise<SyncResult> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const startTime = Date.now()

  // 报告进度
  const reportProgress = (stage: string, progress: number, message?: string, details?: SyncProgress['details']) => {
    const progressObj: SyncProgress = { stage, progress, message, details }
    console.log(`[Sync] ${stage} - ${progress}% ${message || ''}`)
    onProgress?.(progressObj)
  }

  reportProgress('初始化', 5, '开始同步新闻')

  try {
    // 检查今日是否已同步（除非强制刷新）
    if (!forceRefresh) {
      const existingLog = await prisma.syncLog.findUnique({
        where: { syncDate: today },
      })

      if (existingLog && existingLog.status === 'SUCCESS') {
        console.log('今日新闻已同步，跳过')
        return { success: true, newsGenerated: existingLog.newsCount }
      }
    }

    // 步骤1: 获取所有新闻
    reportProgress('获取RSS新闻', 10, '正在获取RSS源...')
    const allNews = await rssParser.fetchAllNews()

    if (allNews.length === 0) {
      throw new Error('未获取到任何新闻')
    }

    console.log(`获取到 ${allNews.length} 条原始新闻`)
    reportProgress('获取RSS新闻', 15, `获取到 ${allNews.length} 条原始新闻`)

    // 步骤2: 选择每日新闻
    reportProgress('选择每日新闻', 20, '正在筛选新闻...')
    const { domestic, international } = rssParser.selectDailyNews(allNews)

    console.log(`选择 ${domestic.length} 条国内新闻，${international.length} 条国际新闻`)
    reportProgress(
      '选择每日新闻',
      25,
      `已选择 ${domestic.length} 条国内，${international.length} 条国际新闻`
    )

    // 步骤3: 生成AI摘要（如果启用AI）
    const allNewsItems = [...domestic, ...international]
    const totalItems = allNewsItems.length

    reportProgress('生成AI摘要', 30, `开始生成 ${totalItems} 条新闻摘要...`)

    const newsWithSummaries = await executeWithCircuitBreaker(
      async () => {
        const result = await newsGenerator.batchGenerateSummaries(allNewsItems)
        return result
      },
      circuitBreaker,
      onProgress,
      '生成AI摘要'
    )

    reportProgress('生成AI摘要', 45, '摘要生成完成')

    // 步骤4: 翻译国际新闻（如果启用AI）
    reportProgress('翻译国际新闻', 50, '开始翻译国际新闻...')

    const newsWithTranslations = await executeWithCircuitBreaker(
      async () => {
        const result = await newsGenerator.batchTranslateInternationalNews(newsWithSummaries)
        return result
      },
      circuitBreaker,
      onProgress,
      '翻译国际新闻'
    )

    reportProgress('翻译国际新闻', 60, '翻译完成')

    // 步骤5: 评估新闻重要性（如果启用AI）
    reportProgress('评估重要性', 65, '开始评估新闻重要性...')

    const newsWithImportance = await executeWithCircuitBreaker(
      async () => {
        const result = await newsGenerator.batchEvaluateImportance(newsWithTranslations)
        return result
      },
      circuitBreaker,
      onProgress,
      '评估重要性'
    )

    reportProgress('评估重要性', 75, '重要性评估完成')

    // 步骤6: 生成播报文案（AI或模板）
    reportProgress('生成播报文案', 80, '正在生成播报文案...')

    const domesticWithSummary = newsWithImportance.filter((n) => n.category === 'DOMESTIC')
    const internationalWithSummary = newsWithImportance.filter((n) => n.category === 'INTERNATIONAL')

    const script = await newsGenerator.generateScript(domesticWithSummary, internationalWithSummary)
    console.log(`播报文案生成完成`)

    reportProgress('生成播报文案', 85, '播报文案生成完成')

    // 步骤7: 根据参数决定是否生成音频
    if (generateAudio) {
      reportProgress('生成音频', 90, '音频生成已加入后台队列...')
      await enqueueAudioJob(dateStr, script)
      console.log(`播报音频已加入后台队列`)
    } else {
      console.log(`跳过音频生成（由调用方控制）`)
    }

    // 保存到数据库 - 批量写入
    reportProgress('保存数据', 95, '正在保存到数据库...')

    // 不再为每条新闻生成单独音频
    const newsData = newsWithImportance.map((news) => {
      const newsWithSummary = news as NewsWithSummary
      return {
        title: news.title,
        content: news.content,
        summary: newsWithSummary.summary,
        translatedContent: newsWithSummary.translatedContent,
        originalLink: news.link,
        source: news.source,
        category: news.category,
        importance: newsWithSummary.importance || 3,
        newsDate: today,
        audioUrl: undefined, // 音频生成完成后会更新
        script: newsGenerator.generateIndividualScript(news),
      }
    })

    // 使用 createMany 批量插入
    const saved = await prisma.news.createMany({
      data: newsData,
    })

    const savedNewsCount = saved.count

    // 记录同步日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'SUCCESS',
        newsCount: savedNewsCount,
      },
    })

    // 清理旧数据（不移除音频，因为音频已通过队列管理）
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '3')
    await cleanupOldData(retentionDays)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ 新闻同步完成，共保存 ${savedNewsCount} 条新闻，耗时 ${duration} 秒`)

    reportProgress('同步完成', 100, `成功保存 ${savedNewsCount} 条新闻`)

    return {
      success: true,
      newsGenerated: savedNewsCount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error('❌ 新闻同步失败:', error)

    // 检查是否为速率限制错误
    if (isRateLimitError(error)) {
      const backoffTime = getRateLimitBackoff()
      console.warn(`检测到速率限制，等待 ${backoffTime / 1000} 秒后重试...`)
      await sleep(backoffTime)
    }

    // 检查是否为不应重试的错误
    if (isNonRetryableError(error)) {
      console.error('检测到永久性错误，跳过重试')
    }

    // 记录失败日志
    await prisma.syncLog.create({
      data: {
        syncDate: today,
        status: 'FAILED',
        newsCount: 0,
        errorMessage,
      },
    })

    return {
      success: false,
      newsGenerated: 0,
      error: errorMessage,
    }
  }
}

/**
 * 使用熔断器执行函数
 */
async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker?: CircuitBreaker,
  onProgress?: (progress: SyncProgress) => void,
  stageName?: string
): Promise<T> {
  if (!circuitBreaker) {
    return fn()
  }

  try {
    return await circuitBreaker.execute(fn)
  } catch (error) {
    // 如果熔断器开启，等待后继续尝试
    if (error instanceof Error && error.message.includes('熔断器')) {
      console.warn(`[${stageName}] 熔断器开启，等待中...`)
      await sleep(10000) // 等待10秒
      return fn() // 仍然尝试执行
    }
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
      .catch((err) => console.warn('AI服务初始化失败:', err instanceof Error ? err.message : err))
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
