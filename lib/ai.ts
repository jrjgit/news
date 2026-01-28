// 极简 AI 服务 - 直接调用，无复杂封装
const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.ZHIPU_API_KEY || ''
const BASE_URL = process.env.DEEPSEEK_API_KEY 
  ? 'https://api.deepseek.com/v1'
  : 'https://open.bigmodel.cn/api/paas/v4'

export async function summarize(text: string): Promise<string> {
  const prompt = `用一句话总结这条新闻（30字以内）：\n${text.slice(0, 1000)}`
  const result = await chat(prompt)
  return result.slice(0, 100)
}

export async function translate(text: string): Promise<string> {
  const prompt = `翻译成中文（保持简洁）：\n${text.slice(0, 800)}`
  const result = await chat(prompt)
  return result.slice(0, 500)
}

export async function generateScript(news: { title: string; summary: string }[]): Promise<string> {
  const prompt = `作为新闻主播，为以下新闻写一段播报文案（轻松口语化，300字以内）：
${news.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`
  return await chat(prompt)
}

async function chat(prompt: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
      signal: ctrl.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      throw new Error(`AI API error: ${res.status}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  } catch (e) {
    clearTimeout(timer)
    // 失败返回原文摘要
    return prompt.slice(0, 80) + '...'
  }
}

// 批量处理（串行，避免超时）
export async function batchSummarize(items: { id: string; content: string }[]) {
  const results: Record<string, string> = {}
  for (const item of items) {
    results[item.id] = await summarize(item.content)
    await new Promise(r => setTimeout(r, 500))
  }
  return results
}

export async function batchTranslate(items: { id: string; content: string }[]) {
  const results: Record<string, string> = {}
  for (const item of items) {
    results[item.id] = await translate(item.content)
    await new Promise(r => setTimeout(r, 500))
  }
  return results
}
