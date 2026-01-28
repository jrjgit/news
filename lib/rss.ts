// 极简 RSS 解析
import Parser from 'rss-parser'

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  timeout: 8000,
})

export interface NewsItem {
  id: string
  title: string
  content: string
  source: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
  pubDate: Date
}

export async function fetchRSS(url: string, source: string, category: 'DOMESTIC' | 'INTERNATIONAL'): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url)
    return (feed.items || []).slice(0, 10).map(item => ({
      id: `${source}-${item.guid || item.link || Math.random()}`,
      title: item.title?.slice(0, 100) || '无标题',
      content: item.contentSnippet?.slice(0, 500) || item.content?.slice(0, 500) || '',
      source,
      category,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    }))
  } catch (e) {
    console.error(`RSS failed: ${url}`, e)
    return []
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const sources = [
    { url: 'https://www.36kr.com/feed', source: '36氪', category: 'DOMESTIC' as const },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', category: 'INTERNATIONAL' as const },
  ].filter(s => s.url)

  // 串行获取，避免同时超时
  const results: NewsItem[] = []
  for (const s of sources.slice(0, 5)) {
    const items = await fetchRSS(s.url, s.source, s.category)
    results.push(...items)
    await new Promise(r => setTimeout(r, 200))
  }

  // 去重（按标题相似度）
  return dedupe(results)
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.slice(0, 20).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
