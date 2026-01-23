/**
 * 智谱BigModel适配器
 * 使用智谱AI GLM-4.6 API提供AI服务
 */

import OpenAI from 'openai'
import { BaseAIAdapter } from './base'
import {
  NewsSummaryRequest,
  NewsTranslationRequest,
  PodcastScriptRequest,
  AIServiceResponse,
} from '../ai-service'
import { aiConfig, getExponentialBackoffDelay, sleep } from '../config'

// 扩展OpenAI的类型以支持智谱AI的reasoning_content字段
interface ZhipiChatCompletionMessage {
  role: string
  content?: string | null
  reasoning_content?: string
}

export interface ZhipiAdapterConfig extends Record<string, unknown> {
  apiKey?: string
  model?: string
  baseUrl?: string
}

export class ZhipuAdapter extends BaseAIAdapter<ZhipiAdapterConfig> {
  private client: OpenAI | null = null
  private model: string

  constructor(config: ZhipiAdapterConfig) {
    super(config)
    this.model = config.model || 'glm-4.6'

    if (!config.apiKey) {
      console.warn('智谱AI API密钥未配置，AI功能将不可用')
      return
    }

    try {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
      })
    } catch (error) {
      console.error('智谱AI客户端初始化失败:', error)
    }
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error('智谱AI客户端未初始化，请检查API密钥配置')
    }
    return this.client
  }

  /**
   * 执行API请求（带重试机制和超时控制）
   * 使用优化后的退避策略
   */
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= aiConfig.maxRetries; attempt++) {
      try {
        // 添加超时控制
        const timeoutPromise = new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${operationName}超时`)), aiConfig.requestTimeout)
        )

        const result = await Promise.race([requestFn(), timeoutPromise])
        return result as T
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 检查是否是速率限制错误
        const isRateLimitError = this.isRateLimitError(error)
        const isTimeoutError = lastError.message.includes('超时')

        if (isRateLimitError) {
          // 速率限制错误：使用更长的等待时间
          if (attempt < aiConfig.maxRetries) {
            const backoffDelay = getExponentialBackoffDelay(attempt)
            console.warn(`${operationName}遇到速率限制，${backoffDelay / 1000}秒后重试 (尝试 ${attempt + 1}/${aiConfig.maxRetries + 1})`)
            await sleep(backoffDelay)
            continue
          }
        } else if (isTimeoutError) {
          // 超时错误：使用渐进式退避
          if (attempt < aiConfig.maxRetries) {
            const backoffDelay = getExponentialBackoffDelay(attempt)
            console.warn(`${operationName}超时，${backoffDelay / 1000}秒后重试 (尝试 ${attempt + 1}/${aiConfig.maxRetries + 1})`)
            await sleep(backoffDelay)
            continue
          }
        } else {
          // 其他错误：使用较短的等待
          if (attempt < aiConfig.maxRetries) {
            const backoffDelay = getExponentialBackoffDelay(attempt)
            console.warn(`${operationName}失败，${backoffDelay / 1000}秒后重试 (尝试 ${attempt + 1}/${aiConfig.maxRetries + 1})`)
            await sleep(backoffDelay)
            continue
          }
        }

        // 如果已达到最大重试次数，直接抛出错误
        if (attempt === aiConfig.maxRetries) {
          console.error(`${operationName}在${attempt + 1}次尝试后失败:`, lastError.message)
          throw lastError
        }
      }
    }

    throw lastError || new Error(`${operationName}失败`)
  }

  /**
   * 检查是否是速率限制错误
   */
  private isRateLimitError(error: unknown): boolean {
    if (error === null || error === undefined) {
      return false
    }

    const err = error as Record<string, unknown>
    const message = String(err?.message ?? '')

    return (
      err?.status === 429 ||
      err?.code === '1302' ||
      message.includes('429') ||
      message.includes('并发数过高') ||
      message.includes('rate limit') ||
      message.includes('速率限制')
    )
  }

  async summarizeNews(request: NewsSummaryRequest): Promise<AIServiceResponse<string>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getSummaryPrompt(request)

      const response = await this.executeRequest(
        () => client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的新闻编辑，擅长提炼新闻摘要。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500, // 增加 token 限制，防止截断
          // @ts-ignore 智谱AI支持disable_thinking参数
          extra: {
            disable_thinking: true, // 禁用思考过程，加快响应
          },
        }),
        '新闻摘要'
      )

      const chatResponse = response as OpenAI.ChatCompletion
      const message = chatResponse.choices[0]?.message as ZhipiChatCompletionMessage

      // 智谱AI Vision 模型响应解析
      // 优先取 content，如果为空或包含思考过程指令，则尝试其他方式
      let summary = ''

      if (message?.content) {
        // 如果 content 是字符串
        if (typeof message.content === 'string') {
          // 排除思考过程（通常是 "请分析以下内容并生成摘要" 等指令）
          if (!message.content.includes('请分析用户请求') &&
              !message.content.includes('角色：') &&
              !message.content.includes('任务：') &&
              !message.content.includes('约束：')) {
            summary = message.content.trim()
          }
        }
        // 如果 content 是数组（多模态响应），取文本部分
        else if (Array.isArray(message.content)) {
          const textPart = (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === 'text')
          if (textPart?.text) {
            summary = textPart.text.trim()
          }
        }
      }

      // 如果 content 无效，尝试从 reasoning_content 获取
      if (!summary && message?.reasoning_content) {
        // reasoning_content 可能包含思考过程，需要过滤
        const reasoning = message.reasoning_content.trim()
        if (!reasoning.includes('请分析用户请求') &&
            !reasoning.includes('角色：') &&
            !reasoning.includes('任务：')) {
          summary = reasoning
        }
      }

      if (!summary) {
        console.error('智谱AI: 未收到有效的摘要响应')
        console.error('智谱AI: 响应详情', JSON.stringify(response, null, 2))
        throw new Error('未收到有效的摘要响应')
      }

      return {
        success: true,
        data: summary,
      }
    } catch (error: unknown) {
      return this.handleError(error, '新闻摘要')
    }
  }

  async translateContent(request: NewsTranslationRequest): Promise<AIServiceResponse<string>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getTranslationPrompt(request)

      console.log(`智谱AI: 开始翻译，目标语言=${request.targetLanguage}，内容长度=${request.content.length}`)

      const response = await this.executeRequest(
        () => client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的翻译，擅长新闻翻译，特别是中英互译。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000, // 增加 token 限制，防止截断
          // @ts-ignore 智谱AI支持disable_thinking参数
          extra: {
            disable_thinking: true, // 禁用思考过程，加快响应
          },
        }),
        '内容翻译'
      )

      const chatResponse = response as OpenAI.ChatCompletion
      const message = chatResponse.choices[0]?.message as ZhipiChatCompletionMessage

      // 智谱AI Vision 模型响应解析
      let translation = ''

      if (message?.content) {
        if (typeof message.content === 'string') {
          if (!message.content.includes('请分析用户请求') &&
              !message.content.includes('角色：') &&
              !message.content.includes('任务：') &&
              !message.content.includes('约束：')) {
            translation = message.content.trim()
          }
        } else if (Array.isArray(message.content)) {
          const textPart = (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === 'text')
          if (textPart?.text) {
            translation = textPart.text.trim()
          }
        }
      }

      if (!translation && message?.reasoning_content) {
        const reasoning = message.reasoning_content.trim()
        if (!reasoning.includes('请分析用户请求') &&
            !reasoning.includes('角色：') &&
            !reasoning.includes('任务：')) {
          translation = reasoning
        }
      }

      if (!translation) {
        console.error('智谱AI: 未收到有效的翻译响应')
        console.error('智谱AI: 响应详情', JSON.stringify(response, null, 2))
        throw new Error('未收到有效的翻译响应')
      }

      console.log(`智谱AI: 翻译成功，原文长度=${request.content.length}，译文长度=${translation.length}`)

      return {
        success: true,
        data: translation,
      }
    } catch (error: unknown) {
      console.error('智谱AI: 翻译失败', error)
      return this.handleError(error, '内容翻译')
    }
  }

  async generatePodcastScript(request: PodcastScriptRequest): Promise<AIServiceResponse<string>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getPodcastScriptPrompt(request)

      console.log(`智谱AI: 开始生成播报脚本，model=${this.model}`)

      const response = await this.executeRequest(
        () => client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的播客主持人，擅长用轻松有趣的方式播报新闻。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 4000, // 增加 token 限制，防止截断
          // @ts-ignore 智谱AI支持disable_thinking参数
          extra: {
            disable_thinking: true, // 禁用思考过程，加快响应
          },
        }),
        '播报脚本生成'
      )

      const chatResponse = response as OpenAI.ChatCompletion
      console.log(`智谱AI: 收到响应，choices=${chatResponse.choices?.length}`)

      const message = chatResponse.choices[0]?.message as ZhipiChatCompletionMessage

      // 智谱AI Vision 模型响应解析
      let script = ''

      if (message?.content) {
        if (typeof message.content === 'string') {
          if (!message.content.includes('请分析用户请求') &&
              !message.content.includes('角色：') &&
              !message.content.includes('任务：') &&
              !message.content.includes('约束：')) {
            script = message.content.trim()
          }
        } else if (Array.isArray(message.content)) {
          const textPart = (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === 'text')
          if (textPart?.text) {
            script = textPart.text.trim()
          }
        }
      }

      if (!script && message?.reasoning_content) {
        const reasoning = message.reasoning_content.trim()
        if (!reasoning.includes('请分析用户请求') &&
            !reasoning.includes('角色：') &&
            !reasoning.includes('任务：')) {
          script = reasoning
        }
      }

      if (!script) {
        console.error('智谱AI: 未收到有效的脚本响应')
        console.error('智谱AI: 响应详情', JSON.stringify(response, null, 2))
        throw new Error('未收到有效的脚本响应')
      }

      console.log(`智谱AI: 脚本生成成功，长度=${script.length} 字符`)

      return {
        success: true,
        data: script,
      }
    } catch (error: unknown) {
      console.error('智谱AI: 生成播报脚本失败', error)
      return this.handleError(error, '播报脚本生成')
    }
  }

  async evaluateImportance(title: string, content: string): Promise<AIServiceResponse<number>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getImportancePrompt(title, content)

      const response = await this.executeRequest(
        () => client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个新闻编辑，擅长评估新闻重要性。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 200, // 增加 token 限制，防止思考过程截断
          // @ts-ignore 智谱AI支持disable_thinking参数
          extra: {
            disable_thinking: true, // 禁用思考过程，加快响应
          },
        }),
        '重要性评估'
      )

      const chatResponse = response as OpenAI.ChatCompletion
      const message = chatResponse.choices[0]?.message as ZhipiChatCompletionMessage

      // 智谱AI Vision 模型响应解析
      let scoreText = ''

      if (message?.content) {
        if (typeof message.content === 'string') {
          if (!message.content.includes('请分析用户请求') &&
              !message.content.includes('角色：') &&
              !message.content.includes('任务：') &&
              !message.content.includes('约束：')) {
            scoreText = message.content.trim()
          }
        } else if (Array.isArray(message.content)) {
          const textPart = (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === 'text')
          if (textPart?.text) {
            scoreText = textPart.text.trim()
          }
        }
      }

      if (!scoreText && message?.reasoning_content) {
        const reasoning = message.reasoning_content.trim()
        if (!reasoning.includes('请分析用户请求') &&
            !reasoning.includes('角色：') &&
            !reasoning.includes('任务：')) {
          scoreText = reasoning
        }
      }

      if (!scoreText) {
        console.error('智谱AI: 未收到有效的评分响应')
        console.error('智谱AI: 响应详情', JSON.stringify(response, null, 2))
        throw new Error('未收到有效的评分响应')
      }

      // 从文本中提取数字
      const scoreMatch = scoreText.match(/\d+/)
      if (!scoreMatch) {
        throw new Error(`无法从响应中提取评分: ${scoreText}`)
      }

      const score = parseInt(scoreMatch[0], 10)

      if (isNaN(score) || score < 1 || score > 5) {
        throw new Error(`无效的评分: ${score}`)
      }

      return {
        success: true,
        data: score,
      }
    } catch (error: unknown) {
      return this.handleError(error, '重要性评估')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        console.warn('智谱AI客户端未初始化')
        return false
      }

      console.log(`智谱AI: 开始健康检查，model=${this.model}`)

      // 设置10秒超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个测试助手，请简短回复。',
          },
          {
            role: 'user',
            content: '请回复"OK"',
          },
        ],
        max_tokens: 50,
        // @ts-ignore 智谱AI支持disable_thinking参数
        extra: {
          disable_thinking: true, // 禁用思考过程，加快响应
        },
      }, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const success = !!response.choices?.[0]?.message
      const message = response.choices?.[0]?.message as ZhipiChatCompletionMessage

      // 健康检查只需验证连接，内容不重要
      let content = '(空)'
      if (message?.content) {
        if (typeof message.content === 'string') {
          content = message.content.substring(0, 20).replace(/\n/g, ' ')
        } else if (Array.isArray(message.content)) {
          const textPart = (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === 'text')
          content = textPart?.text?.substring(0, 20).replace(/\n/g, ' ') || '(空)'
        }
      }

      if (success) {
        console.log(`智谱AI健康检查通过，响应内容: "${content}"`)
      } else {
        console.warn('智谱AI健康检查失败：未收到有效响应')
      }
      return success
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('智谱AI健康检查超时')
        } else {
          console.warn(`智谱AI健康检查失败: ${error.message}`)
        }
      } else {
        console.error('智谱AI健康检查失败:', error)
      }
      return false
    }
  }
}