import Parser from 'rss-parser'

export interface NewsItem {
  title: string
  content: string
  summary?: string
  translatedContent?: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  link?: string
  pubDate?: Date
}

export class RSSParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['description', 'content:encoded', 'content'],
      },
    })
  }

  async parseRSSFeed(url: string, source: string, category: 'DOMESTIC' | 'INTERNATIONAL'): Promise<NewsItem[]> {
    try {
      // 手动获取 RSS 内容，添加完整的浏览器请求头
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        signal: AbortSignal.timeout(30000), // 减少超时时间到30秒
      })

      if (!response.ok) {
        console.warn(`RSS源返回错误 ${response.status}: ${url}`)
        return []
      }

      const xml = await response.text()

      // 检查是否为空或无效XML
      if (!xml || xml.trim().length < 100) {
        console.warn(`RSS源内容为空或过短: ${url}`)
        return []
      }

      const feed = await this.parser.parseString(xml)
      const items: NewsItem[] = []

      for (const item of feed.items) {
        const content = item['content:encoded'] || item.content || item.description || ''

        items.push({
          title: item.title || '无标题',
          content: this.cleanContent(content),
          source,
          category,
          link: item.link,
          pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
        })
      }

      if (items.length === 0) {
        console.warn(`RSS源未获取到任何新闻: ${url}`)
      }

      return items
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`RSS源请求超时: ${url}`)
        } else if (error.message.includes('ENOTFOUND')) {
          console.warn(`RSS源DNS解析失败: ${url}`)
        } else {
          console.warn(`解析RSS源失败: ${url} - ${error.message}`)
        }
      } else {
        console.error(`解析RSS源失败: ${url}`, error)
      }
      return []
    }
  }

  private cleanContent(content: string): string {
    // 移除HTML标签
    let cleaned = content.replace(/<[^>]*>/g, '')
    // 移除多余的空白字符
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    // 限制内容长度
    return cleaned.length > 1000 ? cleaned.substring(0, 1000) + '...' : cleaned
  }

  async fetchAllNews(): Promise<NewsItem[]> {
    const domesticSources = (process.env.RSS_SOURCES_DOMESTIC || '').split(',').filter(Boolean)
    const internationalSources = (process.env.RSS_SOURCES_INTERNATIONAL || '').split(',').filter(Boolean)

    const allNews: NewsItem[] = []

    // 获取国内新闻
    for (const source of domesticSources) {
      const news = await this.parseRSSFeed(source.trim(), '国内新闻', 'DOMESTIC')
      allNews.push(...news)
    }

    // 获取国际新闻
    for (const source of internationalSources) {
      const news = await this.parseRSSFeed(source.trim(), '国际新闻', 'INTERNATIONAL')
      allNews.push(...news)
    }

    // 去重
    return this.deduplicateNews(allNews)
  }

  /**
   * 新闻去重 - 基于标题相似度
   * 使用简单的字符串包含关系和编辑距离算法
   */
  private deduplicateNews(newsItems: NewsItem[]): NewsItem[] {
    const deduplicated: NewsItem[] = []
    const seenTitles: string[] = []

    for (const item of newsItems) {
      const title = item.title.toLowerCase().trim()

      // 检查是否与已见过的标题相似
      const isDuplicate = seenTitles.some(seenTitle => {
        // 如果一个标题完全包含另一个标题，认为是重复
        if (title.includes(seenTitle) || seenTitle.includes(title)) {
          return true
        }

        // 计算简化的相似度（基于字符重叠）
        const similarity = this.calculateSimilarity(title, seenTitle)
        return similarity > 0.8 // 80%相似度阈值
      })

      if (!isDuplicate) {
        deduplicated.push(item)
        seenTitles.push(title)
      }
    }

    console.log(`去重: ${newsItems.length} -> ${deduplicated.length}`)
    return deduplicated
  }

  /**
   * 计算两个字符串的相似度（0-1）
   * 基于字符重叠的简化算法
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0

    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Levenshtein编辑距离算法
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  selectDailyNews(newsItems: NewsItem[]): { domestic: NewsItem[]; international: NewsItem[] } {
    // 从环境变量读取配置，默认为8条国内+5条国际（减少数量以适应Vercel 120秒超时限制）
    const domesticCount = parseInt(process.env.NEWS_COUNT_DOMESTIC || '8', 10)
    const internationalCount = parseInt(process.env.NEWS_COUNT_INTERNATIONAL || '5', 10)

    // 按发布时间排序，取最新的
    const sorted = newsItems.sort((a, b) => {
      const dateA = a.pubDate?.getTime() || 0
      const dateB = b.pubDate?.getTime() || 0
      return dateB - dateA
    })

    const domestic = sorted.filter(item => item.category === 'DOMESTIC').slice(0, domesticCount)
    const international = sorted.filter(item => item.category === 'INTERNATIONAL').slice(0, internationalCount)

    console.log(`选择新闻: ${domestic.length}条国内, ${international.length}条国际`)
    return { domestic, international }
  }
}

export const rssParser = new RSSParser()