import { NewsItem } from './rss-parser'

export class NewsGenerator {
  generateScript(domesticNews: NewsItem[], internationalNews: NewsItem[]): string {
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

  private generateIntro(date: string): string {
    return `各位听众朋友，大家好。今天是${date}，欢迎收听每日热点新闻播报。\n\n`
  }

  private generateSection(title: string, newsItems: NewsItem[]): string {
    let section = `首先，我们来关注${title}。\n\n`

    newsItems.forEach((item, index) => {
      section += this.generateNewsItem(item, index + 1)
    })

    section += '\n'
    return section
  }

  private generateNewsItem(item: NewsItem, index: number): string {
    let newsItem = `第${index}条新闻：${item.title}。\n`
    newsItem += `${this.simplifyContent(item.content)}\n\n`
    return newsItem
  }

  private simplifyContent(content: string): string {
    // 简化内容，使其更适合口语播报
    let simplified = content

    // 移除过于复杂的句子结构
    simplified = simplified.replace(/，/g, '，')
    simplified = simplified.replace(/。/g, '。')
    simplified = simplified.replace(/；/g, '，')
    simplified = simplified.replace(/：/g, '，')

    // 限制每条新闻的内容长度
    if (simplified.length > 200) {
      simplified = simplified.substring(0, 200) + '。'
    }

    return simplified
  }

  private generateOutro(): string {
    return '以上是今天的热点新闻播报。感谢您的收听，我们下期再见。'
  }

  generateIndividualScript(item: NewsItem): string {
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return `来自${item.source}的报道：${item.title}。\n${this.simplifyContent(item.content)}。`
  }
}

export const newsGenerator = new NewsGenerator()