import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const results = {
    environment: {},
    aiService: {},
    tests: [] as any[],
  }

  // 检查环境变量
  results.environment = {
    AI_SERVICE_PROVIDER: process.env.AI_SERVICE_PROVIDER,
    ZHIPU_API_KEY: process.env.ZHIPU_API_KEY ? '已设置' : '未设置',
    ZHIPU_MODEL: process.env.ZHIPU_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '已设置' : '未设置',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '已设置' : '未设置',
    NODE_ENV: process.env.NODE_ENV,
  }

  try {
    // 测试1：初始化AI服务
    const { AIService } = await import('@/lib/ai-service')
    console.log('开始初始化AI服务...')

    await AIService.initialize()
    results.aiService = {
      initialized: true,
      provider: process.env.AI_SERVICE_PROVIDER || '未设置',
    }

    // 测试2：健康检查
    const { AIServiceFactory } = await import('@/lib/ai-service')
    const client = await AIServiceFactory.getInstance()
    const healthCheck = await client.healthCheck()

    results.tests.push({
      name: '健康检查',
      success: healthCheck,
      message: healthCheck ? 'AI服务健康检查通过' : 'AI服务健康检查失败',
    })

    // 测试3：生成摘要
    try {
      console.log('测试生成摘要...')
      const summaryResponse = await AIService.summarizeNews({
        title: '测试新闻标题',
        content: '这是一条测试新闻的内容，用于验证AI服务是否正常工作。',
        category: 'DOMESTIC',
      })

      results.tests.push({
        name: '生成摘要',
        success: summaryResponse.success,
        data: summaryResponse.data,
        error: summaryResponse.error,
      })
    } catch (error: any) {
      results.tests.push({
        name: '生成摘要',
        success: false,
        error: error.message,
      })
    }

    // 测试4：翻译
    try {
      console.log('测试翻译...')
      const translationResponse = await AIService.translateContent({
        content: 'This is a test news article about technology.',
        targetLanguage: '中文',
      })

      results.tests.push({
        name: '翻译',
        success: translationResponse.success,
        data: translationResponse.data,
        error: translationResponse.error,
      })
    } catch (error: any) {
      results.tests.push({
        name: '翻译',
        success: false,
        error: error.message,
      })
    }

    // 测试5：生成播报脚本
    try {
      console.log('测试生成播报脚本...')
      const scriptResponse = await AIService.generatePodcastScript({
        domesticNews: [
          {
            title: '测试新闻1',
            summary: '这是第一条测试新闻的摘要。',
          },
        ],
        internationalNews: [
          {
            title: 'Test News 1',
            summary: 'This is a summary of the first test news.',
          },
        ],
        style: 'casual',
      })

      results.tests.push({
        name: '生成播报脚本',
        success: scriptResponse.success,
        data: scriptResponse.data,
        error: scriptResponse.error,
      })
    } catch (error: any) {
      results.tests.push({
        name: '生成播报脚本',
        success: false,
        error: error.message,
      })
    }

    // 测试6：评估重要性
    try {
      console.log('测试评估重要性...')
      const importanceResponse = await AIService.evaluateImportance(
        '测试新闻标题',
        '这是一条测试新闻的内容，用于验证AI服务是否正常工作。'
      )

      results.tests.push({
        name: '评估重要性',
        success: importanceResponse.success,
        data: importanceResponse.data,
        error: importanceResponse.error,
      })
    } catch (error: any) {
      results.tests.push({
        name: '评估重要性',
        success: false,
        error: error.message,
      })
    }

  } catch (error: any) {
    results.tests.push({
      name: '初始化AI服务',
      success: false,
      error: error.message,
      stack: error.stack,
    })
  }

  return NextResponse.json(results)
}