/**
 * AI服务抽象层
 * 提供统一的AI调用接口，支持多种AI提供商
 */

export interface AIServiceConfig {
  provider: 'openai' | 'deepseek' | 'local' | 'zhipu'
  apiKey?: string
  baseUrl?: string
  model?: string
}

export interface NewsSummaryRequest {
  title: string
  content: string
  category: 'DOMESTIC' | 'INTERNATIONAL'
}

export interface NewsTranslationRequest {
  content: string
  targetLanguage: string
}

export interface PodcastScriptRequest {
  domesticNews: Array<{ title: string; summary: string }>
  internationalNews: Array<{ title: string; summary: string }>
  style: 'formal' | 'casual' | 'mixed'
}

export interface AIServiceResponse<T = string> {
  success: boolean
  data?: T
  error?: string
}

/**
 * AI服务接口
 * 所有AI提供商适配器必须实现此接口
 */
export interface IAIServiceProvider {
  /**
   * 生成新闻摘要
   */
  summarizeNews(request: NewsSummaryRequest): Promise<AIServiceResponse<string>>

  /**
   * 翻译内容
   */
  translateContent(request: NewsTranslationRequest): Promise<AIServiceResponse<string>>

  /**
   * 生成播客脚本
   */
  generatePodcastScript(request: PodcastScriptRequest): Promise<AIServiceResponse<string>>

  /**
   * 评估新闻重要性
   */
  evaluateImportance(title: string, content: string): Promise<AIServiceResponse<number>>

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>
}

/**
 * AI服务工厂
 * 根据配置创建对应的AI服务提供商实例
 */
export class AIServiceFactory {
  private static instance: IAIServiceProvider | null = null

  /**
   * 获取AI服务实例（单例模式）
   */
  static async getInstance(config?: AIServiceConfig): Promise<IAIServiceProvider> {
    if (this.instance) {
      return this.instance
    }

    const provider = config?.provider || process.env.AI_SERVICE_PROVIDER || 'openai'

    switch (provider) {
      case 'openai':
        const { OpenAIAdapter } = await import('./ai-providers/openai-adapter')
        this.instance = new OpenAIAdapter({
          apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
          model: config?.model || process.env.OPENAI_MODEL || 'gpt-4',
        })
        break

      case 'deepseek':
        const { DeepSeekAdapter } = await import('./ai-providers/deepseek-adapter')
        this.instance = new DeepSeekAdapter({
          apiKey: config?.apiKey || process.env.DEEPSEEK_API_KEY,
          model: config?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        })
        break

      case 'local':
        const { LocalModelAdapter } = await import('./ai-providers/local-adapter')
        this.instance = new LocalModelAdapter({
          baseUrl: config?.baseUrl || process.env.LOCAL_MODEL_BASE_URL || 'http://localhost:11434',
          model: config?.model || process.env.LOCAL_MODEL_MODEL || 'llama2',
        })
        break

      case 'zhipu':
        const { ZhipuAdapter } = await import('./ai-providers/zhipu-adapter')
        this.instance = new ZhipuAdapter({
          apiKey: config?.apiKey || process.env.ZHIPU_API_KEY,
          model: config?.model || process.env.ZHIPU_MODEL || 'glm-4.6',
        })
        break

      default:
        throw new Error(`未知的AI服务提供商: ${provider}`)
    }

    // 健康检查
    const isHealthy = await this.instance.healthCheck()
    if (!isHealthy) {
      console.warn(`AI服务提供商 ${provider} 健康检查失败`)
    }

    return this.instance
  }

  /**
   * 重置服务实例（用于测试或切换提供商）
   */
  static reset(): void {
    this.instance = null
  }
}

/**
 * AI服务辅助类
 * 提供便捷的AI调用方法
 */
export class AIService {
  private static client: IAIServiceProvider | null = null

  static async initialize(config?: AIServiceConfig): Promise<void> {
    this.client = await AIServiceFactory.getInstance(config)
  }

  /**
   * 确保服务已初始化
   */
  private static async ensureInitialized(): Promise<IAIServiceProvider> {
    if (!this.client) {
      this.client = await AIServiceFactory.getInstance()
    }
    return this.client
  }

  /**
   * 生成新闻摘要
   */
  static async summarizeNews(request: NewsSummaryRequest): Promise<AIServiceResponse<string>> {
    const client = await this.ensureInitialized()
    return client.summarizeNews(request)
  }

  /**
   * 翻译内容
   */
  static async translateContent(request: NewsTranslationRequest): Promise<AIServiceResponse<string>> {
    const client = await this.ensureInitialized()
    return client.translateContent(request)
  }

  /**
   * 生成播客脚本
   */
  static async generatePodcastScript(request: PodcastScriptRequest): Promise<AIServiceResponse<string>> {
    const client = await this.ensureInitialized()
    return client.generatePodcastScript(request)
  }

  /**
   * 评估新闻重要性
   */
  static async evaluateImportance(title: string, content: string): Promise<AIServiceResponse<number>> {
    const client = await this.ensureInitialized()
    return client.evaluateImportance(title, content)
  }

  /**
   * 批量处理新闻摘要（并行处理，带并发控制）
   */
  static async batchSummarizeNews(
    requests: NewsSummaryRequest[]
  ): Promise<AIServiceResponse<string[]>> {
    // 使用并发控制，限制同时进行的请求数量为1个（避免触发429错误）
    const concurrency = 1
    const results: string[] = []

    // 分批处理
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const promises = batch.map(async (request) => {
        const response = await this.summarizeNews(request)
        if (response.success && response.data) {
          return response.data
        } else {
          // 如果失败，使用原文作为摘要
          return request.content.substring(0, 200)
        }
      })

      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
    }

    return {
      success: true,
      data: results,
    }
  }

  /**
   * 批量翻译（并行处理，带并发控制）
   */
  static async batchTranslate(
    requests: NewsTranslationRequest[]
  ): Promise<AIServiceResponse<string[]>> {
    console.log(`AIService: 开始批量翻译，共 ${requests.length} 条`)

    // 使用并发控制，限制同时进行的请求数量为1个（避免触发429错误）
    const concurrency = 1
    const results: string[] = []

    // 分批处理
    for (let i = 0; i < requests.length; i += concurrency) {
      const batchIndex = Math.floor(i / concurrency) + 1
      const batch = requests.slice(i, i + concurrency)
      console.log(`AIService: 处理第 ${batchIndex} 批翻译，共 ${batch.length} 条`)

      const promises = batch.map(async (request, index) => {
        const response = await this.translateContent(request)
        if (response.success && response.data) {
          console.log(`AIService: 批次 ${batchIndex} 第 ${index + 1} 条翻译成功`)
          return response.data
        } else {
          console.warn(`AIService: 批次 ${batchIndex} 第 ${index + 1} 条翻译失败，使用原文`)
          // 如果失败，使用原文
          return request.content
        }
      })

      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
    }

    console.log(`AIService: 批量翻译完成，成功 ${results.length} 条`)

    return {
      success: true,
      data: results,
    }
  }
}