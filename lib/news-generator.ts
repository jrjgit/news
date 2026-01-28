import { NewsItem } from './rss-parser'
import { AIService, PodcastScriptRequest, type AIServiceResponse } from './ai-service'

export interface NewsWithSummary extends NewsItem {
  summary?: string
  translatedContent?: string
  importance?: number
}

export class NewsGenerator {
  private aiEnabled: boolean = false
  private aiSummaryEnabled: boolean = true
  private aiTranslationEnabled: boolean = true
  private aiImportanceEnabled: boolean = true

  constructor() {
    // 检查是否启用了AI服务
    this.aiEnabled = !!process.env.AI_SERVICE_PROVIDER

    // 检查各个AI功能是否启用
    this.aiSummaryEnabled = process.env.AI_ENABLE_SUMMARY !== 'false'
    this.aiTranslationEnabled = process.env.AI_ENABLE_TRANSLATION !== 'false'
    // 禁用重要性评估功能（智谱AI推理模型经常返回空content导致失败）
    this.aiImportanceEnabled = false

    if (this.aiEnabled) {
      console.log('AI服务已启用，将使用AI生成播报脚本')
      console.log(`AI功能状态: 摘要=${this.aiSummaryEnabled}, 翻译=${this.aiTranslationEnabled}, 重要性=${this.aiImportanceEnabled}`)
    }
  }

  /**
   * 生成播报脚本（优先使用AI，失败时回退到模板）
   */
  async generateScript(
    domesticNews: NewsItem[],
    internationalNews: NewsItem[]
  ): Promise<string> {
    // 如果启用AI服务，尝试使用AI生成
    if (this.aiEnabled) {
      try {
        return await this.generateAINewsScript(domesticNews, internationalNews)
      } catch (error) {
        console.error('AI生成脚本失败，回退到模板模式:', error)
        return this.generateTemplateScript(domesticNews, internationalNews)
      }
    }

    // 否则使用模板模式
    return this.generateTemplateScript(domesticNews, internationalNews)
  }

  /**
   * 使用AI生成播报脚本（轻松播客风格）
   */
  private async generateAINewsScript(
    domesticNews: NewsItem[],
    internationalNews: NewsItem[]
  ): Promise<string> {
    console.log('开始使用AI生成播报脚本...')

    // 准备新闻数据（使用摘要或内容）
    const domesticNewsData = domesticNews.map(news => ({
      title: news.title,
      summary: news.summary || this.simplifyContent(news.content),
    }))

    const internationalNewsData = internationalNews.map(news => ({
      title: news.title,
      summary: news.translatedContent || news.summary || this.simplifyContent(news.content),
    }))

    const request: PodcastScriptRequest = {
      domesticNews: domesticNewsData,
      internationalNews: internationalNewsData,
      style: 'casual', // 轻松播客风格
    }

    console.log(`准备发送AI请求：国内新闻${domesticNewsData.length}条，国际新闻${internationalNewsData.length}条`)

    try {
      const response = await AIService.generatePodcastScript(request)

      if (!response.success) {
        console.error('AI生成脚本失败:', response.error)
        throw new Error(response.error || 'AI生成脚本失败')
      }

      if (!response.data || response.data.trim().length === 0) {
        console.error('AI返回了空内容')
        throw new Error('AI返回了空内容')
      }

      console.log(`AI生成脚本成功，长度: ${response.data.length} 字符`)
      return response.data
    } catch (error) {
      console.error('AI生成脚本异常:', error)
      throw error
    }
  }

  /**
   * 使用模板生成播报脚本（原有逻辑，作为后备）
   */
  generateTemplateScript(
    domesticNews: NewsItem[],
    internationalNews: NewsItem[]
  ): string {
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    let script = ''

    // 开场白
    script += this.generateIntro(today)

    // 国内新闻
    if (domesticNews.length > 0) {
      script += this.generateSection('国内新闻', domesticNews)
    }

    // 国际新闻
    if (internationalNews.length > 0) {
      script += this.generateSection('国际新闻', internationalNews)
    }

    // 结束语
    script += this.generateOutro()

    return script
  }

  /**
   * 生成开场白（轻松风格）
   */
  private generateIntro(date: string): string {
    const greetings = [
      `嘿，大家好！欢迎收听今天的新闻播报。今天是${date}，让我们来看看今天都有哪些值得关注的事情吧。\n\n`,
      `朋友们好呀！今天是${date}，很高兴又和大家见面了。今天有不少有趣的新闻，咱们一起来听听。\n\n`,
      `哈喽各位！今天是${date}，新的一天，新的新闻。准备好了吗？让我们开始今天的新闻之旅吧。\n\n`,
    ]
    // 随机选择一个问候语
    return greetings[Math.floor(Math.random() * greetings.length)]
  }

  /**
   * 生成新闻板块
   */
  private generateSection(title: string, newsItems: NewsItem[]): string {
    const transitions = [
      `好，接下来咱们来看看${title}。\n\n`,
      `说到${title}，这几条消息挺有意思的。\n\n`,
      `${title}方面也有不少动态，来听听看。\n\n`,
    ]

    let section = transitions[Math.floor(Math.random() * transitions.length)]

    newsItems.forEach((item, index) => {
      section += this.generateNewsItem(item, index + 1)
    })

    // 添加板块结束过渡
    section += `\n${this.getSectionTransition(title)}\n\n`
    return section
  }

  /**
   * 生成单条新闻
   */
  private generateNewsItem(item: NewsItem, index: number): string {
    const openers = [
      `首先`,
      `第一条`,
      `来听听这条`,
      `这条新闻很有意思`,
    ]

    const content = item.translatedContent || item.summary || this.simplifyContent(item.content)

    let newsItem = `${openers[Math.min(index - 1, openers.length - 1)]}，${item.title}。\n`
    newsItem += `${content}。\n\n`

    return newsItem
  }

  /**
   * 获取板块过渡语
   */
  private getSectionTransition(sectionTitle: string): string {
    const transitions = [
      `好了，${sectionTitle}就先说到这里。`,
      `${sectionTitle}的消息就这些，咱们继续。`,
      `${sectionTitle}部分告一段落，接下来看看其他的。`,
    ]
    return transitions[Math.floor(Math.random() * transitions.length)]
  }

  /**
   * 生成结束语（轻松风格）
   */
  private generateOutro(): string {
    const outros = [
      `好了，今天的新闻播报就到这里。希望这些信息对你有用。感谢收听，我们下期再见！`,
      `今天的新闻就分享到这儿了。别忘了关注我们的更新哦。谢谢大家的收听，拜拜！`,
      `以上是今天的热点新闻。如果你有什么想法，欢迎和我们交流。感谢收听，下期节目再会！`,
    ]
    return outros[Math.floor(Math.random() * outros.length)]
  }

  /**
   * 生成单条新闻的播报脚本
   */
  generateIndividualScript(item: NewsItem): string {
    const content = item.translatedContent || item.summary || this.simplifyContent(item.content)
    return `来自${item.source}的报道：${item.title}。\n${content}。`
  }

  /**
   * 简化内容，使其更适合口语播报
   * 改进：智能截断，避免在句子中间截断
   */
  simplifyContent(content: string): string {
    // 移除HTML标签（如果还有的话）
    let simplified = content.replace(/<[^>]*>/g, '')

    // 移除多余的空白字符
    simplified = simplified.replace(/\s+/g, ' ').trim()

    // 简化标点符号
    simplified = simplified.replace(/；/g, '，')
    simplified = simplified.replace(/：/g, '，')

    // 限制每条新闻的内容长度（减少到100字，加快音频生成速度）
    const maxLength = 100
    if (simplified.length > maxLength) {
      // 尝试在句号处截断
      let truncated = simplified.substring(0, maxLength)
      const lastPeriod = truncated.lastIndexOf('。')
      const lastComma = truncated.lastIndexOf('，')

      // 如果找到句号或逗号，在那里截断
      if (lastPeriod > maxLength * 0.7) {
        truncated = truncated.substring(0, lastPeriod + 1)
      } else if (lastComma > maxLength * 0.7) {
        truncated = truncated.substring(0, lastComma + 1)
      } else {
        // 否则直接截断并添加省略号
        truncated = truncated.substring(0, maxLength - 1) + '……'
      }

      simplified = truncated
    }

    return simplified
  }

  /**
   * 批量生成新闻摘要
   */
  async batchGenerateSummaries(newsItems: NewsItem[]): Promise<NewsWithSummary[]> {
    if (!this.aiEnabled || !this.aiSummaryEnabled) {
      // 如果AI未启用或摘要功能未启用，返回简化内容
      console.log('AI摘要功能已禁用，使用简化内容')
      return newsItems.map(item => ({ ...item, summary: this.simplifyContent(item.content) }))
    }

    console.log(`开始批量生成 ${newsItems.length} 条新闻摘要...`)

    const requests = newsItems.map(item => ({
      title: item.title,
      content: item.content,
      category: item.category,
    }))

    try {
      // 添加超时控制，120秒超时（增加超时时间）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('批量生成摘要超时')), 120000)
      )

      const startTime = Date.now()
      const response = await Promise.race([
        AIService.batchSummarizeNews(requests),
        timeoutPromise,
      ]) as AIServiceResponse<string[]>
      const duration = Date.now() - startTime

      console.log(`批量生成摘要完成，耗时 ${duration}ms`)

      if (response.success && response.data) {
        return newsItems.map((item, index) => ({
          ...item,
          summary: response.data![index],
        }))
      }
    } catch (error) {
      console.error('批量生成摘要失败:', error instanceof Error ? error.message : error)
      console.warn('将使用简化内容作为摘要')
    }

    // 失败时返回简化后的内容
    return newsItems.map(item => ({ ...item, summary: this.simplifyContent(item.content) }))
  }

  /**
   * 批量翻译国际新闻
   */
  async batchTranslateInternationalNews(
    newsItems: NewsItem[]
  ): Promise<NewsWithSummary[]> {
    const internationalNews = newsItems.filter(item => item.category === 'INTERNATIONAL')

    if (internationalNews.length === 0 || !this.aiEnabled || !this.aiTranslationEnabled) {
      console.log('AI翻译功能已禁用')
      return newsItems.map(item => ({ ...item }))
    }

    console.log(`开始批量翻译 ${internationalNews.length} 条国际新闻...`)
    console.log('国际新闻列表:', internationalNews.map(n => ({ title: n.title.substring(0, 50), link: n.link })))

    const requests = internationalNews.map(item => ({
      content: item.content,
      targetLanguage: '中文',
    }))

    try {
      // 添加超时控制，120秒超时
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('批量翻译超时')), 120000)
      )

      const startTime = Date.now()
      const response = await Promise.race([
        AIService.batchTranslate(requests),
        timeoutPromise,
      ]) as AIServiceResponse<string[]>
      const duration = Date.now() - startTime

      console.log(`批量翻译完成，耗时 ${duration}ms`)

      if (response.success && response.data) {
        // 创建一个Map来存储国际新闻的索引和对应的翻译结果
        const translations = new Map<number, string>()
        internationalNews.forEach((item, index) => {
          // 使用索引作为key，因为它是唯一的
          translations.set(index, response.data![index])
          console.log(`翻译 ${index + 1}/${internationalNews.length}: ${item.title.substring(0, 50)}...`)
        })

        return newsItems.map((item, itemIndex) => {
          if (item.category === 'INTERNATIONAL') {
            // 找到这条新闻在国际新闻数组中的索引
            const internationalIndex = internationalNews.findIndex(n => n.title === item.title && n.link === item.link)
            if (internationalIndex !== -1) {
              const translated = translations.get(internationalIndex)
              return {
                ...item,
                translatedContent: translated || item.content,
              }
            }
          }
          return { ...item }
        })
      }
    } catch (error) {
      console.error('批量翻译失败:', error instanceof Error ? error.message : error)
      console.warn('将跳过翻译功能')
    }

    // 失败时返回原文
    return newsItems.map(item => ({ ...item }))
  }

  /**
   * 批量评估新闻重要性
   */
  async batchEvaluateImportance(
    newsItems: NewsItem[]
  ): Promise<NewsWithSummary[]> {
    if (!this.aiEnabled || !this.aiImportanceEnabled) {
      // 如果AI未启用或重要性评估功能未启用，返回默认重要性
      console.log('AI重要性评估功能已禁用，使用默认评分')
      return newsItems.map(item => ({ ...item, importance: 3 }))
    }

    const results: NewsWithSummary[] = []

    for (const item of newsItems) {
      try {
        // 添加超时控制，每个请求20秒超时（增加超时时间）
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('评估重要性超时')), 20000)
        )

        const startTime = Date.now()
        const response = await Promise.race([
          AIService.evaluateImportance(item.title, item.content),
          timeoutPromise,
        ]) as AIServiceResponse<number>
        const duration = Date.now() - startTime

        results.push({
          ...item,
          importance: response?.success && response?.data ? response.data : 3,
        })
      } catch (error) {
        console.error(`评估重要性失败: ${item.title}`, error instanceof Error ? error.message : error)
        results.push({ ...item, importance: 3 })
      }

      // 每个请求之间延迟2秒，避免触发频率限制
      if (results.length < newsItems.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return results
  }
}

export const newsGenerator = new NewsGenerator()