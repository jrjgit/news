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
  // 为每个新闻添加标题和摘要
  const newsText = news.map((n, i) =>
    `新闻${i + 1}：${n.title}。${n.summary || ''}`
  ).join('\n\n')

  const prompt = `你是一位专业的新闻主播，请根据以下新闻内容，写一段播报文案。

要求：
1. 轻松、口语化、自然流畅
2. 开头要有问候语（如"大家好，欢迎收听今日热点"）
3. 按顺序播报每条新闻，包含标题和核心内容
4. 结尾要有结束语（如"以上就是今日热点，感谢您的收听"）
5. 字数在800-1200字之间
6. 不要出现编号，要像正常说话一样

新闻内容：
${newsText}`

  // 使用更多 token 生成长文案
  return await chat(prompt, 1500)
}

async function chat(prompt: string, maxTokens: number = 500): Promise<string> {
  if (!API_KEY) {
    console.warn('[AI] 未配置 API Key')
    // 返回一个基本的模板文案，而不是截断的prompt
    return '大家好，欢迎收听今日热点新闻。今日暂无详细播报内容。感谢您的收听。'
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000) // 增加到30秒超时

  try {
    console.log(`[AI] 调用 API: ${BASE_URL}, max_tokens: ${maxTokens}`)
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: ctrl.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[AI] API error: ${res.status}`, errorText)
      throw new Error(`AI API error: ${res.status}`)
    }

    const data = await res.json()
    const result = data.choices?.[0]?.message?.content?.trim() || ''
    console.log(`[AI] 响应成功，长度: ${result.length}`)
    return result
  } catch (e) {
    clearTimeout(timer)
    console.error('[AI] 调用失败:', e)
    // 失败时返回一个完整的回退文案，不是截断的prompt
    return '大家好，欢迎收听今日热点新闻。今日新闻内容暂时无法获取，请稍后重试。感谢您的收听。'
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
