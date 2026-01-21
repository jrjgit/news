/**
 * AI服务提供商基础适配器
 * 所有具体的AI适配器都应该继承此类
 */

import {
  IAIServiceProvider,
  NewsSummaryRequest,
  NewsTranslationRequest,
  PodcastScriptRequest,
  AIServiceResponse,
} from '../ai-service'

export abstract class BaseAIAdapter<TConfig extends Record<string, unknown> = Record<string, unknown>> implements IAIServiceProvider {
  protected config: TConfig

  constructor(config: TConfig) {
    this.config = config
  }

  /**
   * 生成新闻摘要（子类必须实现）
   */
  abstract summarizeNews(request: NewsSummaryRequest): Promise<AIServiceResponse<string>>

  /**
   * 翻译内容（子类必须实现）
   */
  abstract translateContent(request: NewsTranslationRequest): Promise<AIServiceResponse<string>>

  /**
   * 生成播报脚本（子类必须实现）
   */
  abstract generatePodcastScript(request: PodcastScriptRequest): Promise<AIServiceResponse<string>>

  /**
   * 评估新闻重要性（子类必须实现）
   */
  abstract evaluateImportance(title: string, content: string): Promise<AIServiceResponse<number>>

  /**
   * 健康检查（子类必须实现）
   */
  abstract healthCheck(): Promise<boolean>

  /**
   * 获取新闻摘要提示词
   */
  protected getSummaryPrompt(request: NewsSummaryRequest): string {
    return `请为以下新闻生成一个简洁的摘要（100字以内）：

标题：${request.title}
内容：${request.content}

摘要：`
  }

  /**
   * 获取翻译提示词
   */
  protected getTranslationPrompt(request: NewsTranslationRequest): string {
    return `请将以下新闻内容翻译为${request.targetLanguage}：

${request.content}

翻译：`
  }

  /**
   * 获取播报脚本提示词
   */
  protected getPodcastScriptPrompt(request: PodcastScriptRequest): string {
    const domesticNews = request.domesticNews.map(n => `- ${n.title}: ${n.summary}`).join('\n')
    const internationalNews = request.internationalNews.map(n => `- ${n.title}: ${n.summary}`).join('\n')

    return `请生成一个轻松有趣的播客风格新闻播报脚本，包含以下内容：

国内新闻：
${domesticNews}

国际新闻：
${internationalNews}

要求：
1. 使用轻松对话式的语言
2. 添加一些过渡语和转场词
3. 每条新闻控制在2-3句话
4. 开头要有吸引人的开场白
5. 结尾要有轻松的结束语

播报脚本：`
  }

  /**
   * 获取重要性评估提示词
   */
  protected getImportancePrompt(title: string, content: string): string {
    return `请评估以下新闻的重要性（1-5分）：

标题：${title}
内容：${content}

评分标准：
5分：非常重要，影响广泛
4分：重要新闻，影响较大
3分：一般新闻，影响适中
2分：次要新闻，影响较小
1分：普通新闻，影响很小

请只返回一个数字（1-5），不要其他内容：`
  }

  /**
   * 统一的错误处理
   */
  protected handleError(error: unknown, operation: string): AIServiceResponse<never> {
    let errorMessage = `${operation}失败`

    if (error instanceof Error) {
      errorMessage = error.message
      console.error(`${operation}错误:`, error.message)
      console.error(`${operation}堆栈:`, error.stack)
    } else {
      console.error(`${operation}未知错误:`, error)
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}