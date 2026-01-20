import { NewsItem } from './rss-parser'
import { AIService, PodcastScriptRequest } from './ai-service'

export interface NewsWithSummary extends NewsItem {
  summary?: string
  translatedContent?: string
  importance?: number
}

export class NewsGenerator {
  private aiEnabled: boolean = false

  constructor() {
    // 检查是否启用了AI服务
    this.aiEnabled = !!process.env.AI_SERVICE_PROVIDER
    if (this.aiEnabled) {
      console.log('AI服务已启用，将使用AI生成播报脚本')
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

    const response = await AIService.generatePodcastScript(request)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'AI生成脚本失败')
    }

    return response.data
  }

  /**
   * 使用模板生成播报脚本（原有逻辑，作为后备）
   */
  private generateTemplateScript(
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

    // 限制每条新闻的内容长度
    const maxLength = 200
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
    if (!this.aiEnabled) {
      // 如果AI未启用，返回空摘要
      return newsItems.map(item => ({ ...item, summary: this.simplifyContent(item.content) }))
    }

    const requests = newsItems.map(item => ({
      title: item.title,
      content: item.content,
      category: item.category,
    }))

    try {
      const response = await AIService.batchSummarizeNews(requests)

      if (response.success && response.data) {
        return newsItems.map((item, index) => ({
          ...item,
          summary: response.data![index],
        }))
      }
    } catch (error) {
      console.error('批量生成摘要失败:', error)
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

    if (internationalNews.length === 0 || !this.aiEnabled) {
      return newsItems.map(item => ({ ...item }))
    }

    const requests = internationalNews.map(item => ({
      content: item.content,
      targetLanguage: '中文',
    }))

    try {
      const response = await AIService.batchTranslate(requests)

      if (response.success && response.data) {
        const translations = new Map<number, string>()
        internationalNews.forEach((item, index) => {
          translations.set(item.title.length, response.data![index])
        })

        return newsItems.map(item => {
          if (item.category === 'INTERNATIONAL') {
            return {
              ...item,
              translatedContent: translations.get(item.title.length) || item.content,
            }
          }
          return { ...item }
        })
      }
    } catch (error) {
      console.error('批量翻译失败:', error)
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
    if (!this.aiEnabled) {
      // 如果AI未启用，返回默认重要性
      return newsItems.map(item => ({ ...item, importance: 3 }))
    }

    const results: NewsWithSummary[] = []

    for (const item of newsItems) {
      try {
        const response = await AIService.evaluateImportance(item.title, item.content)
        results.push({
          ...item,
          importance: response.success && response.data ? response.data : 3,
        })
      } catch (error) {
        console.error(`评估重要性失败: ${item.title}`, error)
        results.push({ ...item, importance: 3 })
      }
    }

    return results
  }
}

export const newsGenerator = new NewsGenerator()