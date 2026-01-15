import Parser from 'rss-parser'

export interface NewsItem {
  title: string
  content: string
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
      const feed = await this.parser.parseURL(url)
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

      return items
    } catch (error) {
      console.error(`解析RSS源失败: ${url}`, error)
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

    return allNews
  }

  selectDailyNews(newsItems: NewsItem[]): { domestic: NewsItem[]; international: NewsItem[] } {
    // 按发布时间排序，取最新的
    const sorted = newsItems.sort((a, b) => {
      const dateA = a.pubDate?.getTime() || 0
      const dateB = b.pubDate?.getTime() || 0
      return dateB - dateA
    })

    const domestic = sorted.filter(item => item.category === 'DOMESTIC').slice(0, 7)
    const international = sorted.filter(item => item.category === 'INTERNATIONAL').slice(0, 3)

    return { domestic, international }
  }
}

export const rssParser = new RSSParser()