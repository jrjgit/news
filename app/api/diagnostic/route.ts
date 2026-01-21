import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: {} as any,
    aiConfiguration: {} as any,
    recommendations: [] as string[],
  }

  // 检查所有相关环境变量
  const envVars = [
    'AI_SERVICE_PROVIDER',
    'ZHIPU_API_KEY',
    'ZHIPU_MODEL',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'NODE_ENV',
    'AI_ENABLE_SUMMARY',
    'AI_ENABLE_TRANSLATION',
    'AI_ENABLE_IMPORTANCE',
  ]

  envVars.forEach(key => {
    const value = process.env[key]
    diagnostic.environment[key] = value ? (key.includes('KEY') ? '已设置' : value) : '未设置'
  })

  // 分析AI配置
  diagnostic.aiConfiguration = {
    provider: process.env.AI_SERVICE_PROVIDER || '未设置',
    enabled: !!process.env.AI_SERVICE_PROVIDER,
    summaryEnabled: process.env.AI_ENABLE_SUMMARY !== 'false',
    translationEnabled: process.env.AI_ENABLE_TRANSLATION !== 'false',
    importanceEnabled: process.env.AI_ENABLE_IMPORTANCE !== 'false',
  }

  // 生成建议
  if (!process.env.AI_SERVICE_PROVIDER) {
    diagnostic.recommendations.push('❌ AI_SERVICE_PROVIDER 未设置，AI功能将不会启用')
    diagnostic.recommendations.push('   请设置 AI_SERVICE_PROVIDER=zhipu (或其他提供商)')
  }

  if (process.env.AI_SERVICE_PROVIDER === 'zhipu' && !process.env.ZHIPU_API_KEY) {
    diagnostic.recommendations.push('❌ 使用智谱AI但 ZHIPU_API_KEY 未设置')
    diagnostic.recommendations.push('   请设置 ZHIPU_API_KEY')
  }

  if (process.env.AI_SERVICE_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    diagnostic.recommendations.push('❌ 使用OpenAI但 OPENAI_API_KEY 未设置')
    diagnostic.recommendations.push('   请设置 OPENAI_API_KEY')
  }

  if (process.env.AI_SERVICE_PROVIDER === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
    diagnostic.recommendations.push('❌ 使用DeepSeek但 DEEPSEEK_API_KEY 未设置')
    diagnostic.recommendations.push('   请设置 DEEPSEEK_API_KEY')
  }

  if (diagnostic.aiConfiguration.enabled) {
    diagnostic.recommendations.push('✅ AI服务已启用')
  } else {
    diagnostic.recommendations.push('⚠️  AI服务未启用，将使用模板模式生成内容')
  }

  if (diagnostic.aiConfiguration.summaryEnabled) {
    diagnostic.recommendations.push('✅ AI摘要功能已启用')
  } else {
    diagnostic.recommendations.push('⚠️  AI摘要功能已禁用，将使用简化内容')
  }

  if (diagnostic.aiConfiguration.translationEnabled) {
    diagnostic.recommendations.push('✅ AI翻译功能已启用')
  } else {
    diagnostic.recommendations.push('⚠️  AI翻译功能已禁用，将使用原文')
  }

  if (diagnostic.aiConfiguration.importanceEnabled) {
    diagnostic.recommendations.push('✅ AI重要性评估功能已启用')
  } else {
    diagnostic.recommendations.push('⚠️  AI重要性评估功能已禁用，将使用默认评分')
  }

  return NextResponse.json(diagnostic)
}