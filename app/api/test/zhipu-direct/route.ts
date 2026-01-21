import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const results = {
    apiKey: process.env.ZHIPU_API_KEY ? '已设置' : '未设置',
    model: process.env.ZHIPU_MODEL || 'glm-4.6',
    tests: [] as any[],
  }

  if (!process.env.ZHIPU_API_KEY) {
    return NextResponse.json({
      error: 'ZHIPU_API_KEY 未设置',
      results,
    })
  }

  try {
    // 直接使用OpenAI SDK测试智谱AI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    })

    // 测试1：简单对话
    try {
      console.log('测试1：简单对话')
      const response1 = await client.chat.completions.create({
        model: results.model,
        messages: [
          {
            role: 'user',
            content: '请回复"测试成功"',
          },
        ],
        max_tokens: 50,
      })

      const content1 = response1.choices[0]?.message?.content
      results.tests.push({
        name: '简单对话',
        success: !!content1,
        response: content1,
        rawResponse: JSON.stringify(response1, null, 2),
      })
    } catch (error: any) {
      results.tests.push({
        name: '简单对话',
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }

    // 测试2：生成摘要
    try {
      console.log('测试2：生成摘要')
      const response2 = await client.chat.completions.create({
        model: results.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的新闻编辑，擅长提炼新闻摘要。',
          },
          {
            role: 'user',
            content: '请为以下新闻生成一个简洁的摘要（100字以内）：\n\n标题：测试新闻标题\n内容：这是一条测试新闻的内容，用于验证AI服务是否正常工作。',
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      })

      const content2 = response2.choices[0]?.message?.content
      results.tests.push({
        name: '生成摘要',
        success: !!content2,
        response: content2,
        rawResponse: JSON.stringify(response2, null, 2),
      })
    } catch (error: any) {
      results.tests.push({
        name: '生成摘要',
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }

    // 测试3：翻译
    try {
      console.log('测试3：翻译')
      const response3 = await client.chat.completions.create({
        model: results.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译，擅长新闻翻译，特别是中英互译。',
          },
          {
            role: 'user',
            content: '请将以下新闻内容翻译为中文：\n\nThis is a test news article about technology.',
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })

      const content3 = response3.choices[0]?.message?.content
      results.tests.push({
        name: '翻译',
        success: !!content3,
        response: content3,
        rawResponse: JSON.stringify(response3, null, 2),
      })
    } catch (error: any) {
      results.tests.push({
        name: '翻译',
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }

    // 测试4：生成播报脚本
    try {
      console.log('测试4：生成播报脚本')
      const response4 = await client.chat.completions.create({
        model: results.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的播客主持人，擅长用轻松有趣的方式播报新闻。',
          },
          {
            role: 'user',
            content: `请生成一个轻松有趣的播客风格新闻播报脚本，包含以下内容：

国内新闻：
- 测试新闻1: 这是第一条测试新闻的摘要。

国际新闻：
- Test News 1: This is a summary of the first test news.

要求：
1. 使用轻松对话式的语言
2. 添加一些过渡语和转场词
3. 每条新闻控制在2-3句话
4. 开头要有吸引人的开场白
5. 结尾要有轻松的结束语

播报脚本：`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      })

      const content4 = response4.choices[0]?.message?.content
      results.tests.push({
        name: '生成播报脚本',
        success: !!content4,
        responseLength: content4?.length || 0,
        response: content4 ? (content4.substring(0, 500) + (content4.length > 500 ? '...' : '')) : '',
        rawResponse: JSON.stringify(response4, null, 2),
      })
    } catch (error: any) {
      results.tests.push({
        name: '生成播报脚本',
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      error: '初始化OpenAI客户端失败',
      message: error.message,
      stack: error.stack,
    })
  }

  return NextResponse.json(results)
}