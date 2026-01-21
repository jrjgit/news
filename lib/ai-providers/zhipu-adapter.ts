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

// 扩展OpenAI的类型以支持智谱AI的reasoning_content字段
interface ZhipuChatCompletionMessage {
  role: string
  content?: string | null
  reasoning_content?: string
}

export interface ZhipuAdapterConfig extends Record<string, unknown> {
  apiKey?: string
  model?: string
  baseUrl?: string
}

export class ZhipuAdapter extends BaseAIAdapter<ZhipuAdapterConfig> {
  private client: OpenAI | null = null
  private model: string

  constructor(config: ZhipuAdapterConfig) {
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

  async summarizeNews(request: NewsSummaryRequest): Promise<AIServiceResponse<string>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getSummaryPrompt(request)

      const response = await client.chat.completions.create({
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
        max_tokens: 500, // 增加到500以避免截断
      })

      // 智谱AI可能把内容放在reasoning_content字段
      const message = response.choices[0]?.message as ZhipuChatCompletionMessage
      const summary = (message?.content || message?.reasoning_content)?.trim()

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

      const response = await client.chat.completions.create({
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
        max_tokens: 1000, // 增加到1000以避免截断
      })

      // 智谱AI可能把内容放在reasoning_content字段
      const message = response.choices[0]?.message as ZhipuChatCompletionMessage
      const translation = (message?.content || message?.reasoning_content)?.trim()

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

      const response = await client.chat.completions.create({
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
        max_tokens: 2000, // 增加到2000以避免截断
      })

      console.log(`智谱AI: 收到响应，choices=${response.choices?.length}`)

      // 智谱AI可能把内容放在reasoning_content字段
      const message = response.choices[0]?.message as ZhipuChatCompletionMessage
      const script = (message?.content || message?.reasoning_content)?.trim()

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

      const response = await client.chat.completions.create({
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
        max_tokens: 50, // 增加到50以避免截断
      })

      // 智谱AI可能把内容放在reasoning_content字段
      const message = response.choices[0]?.message as ZhipuChatCompletionMessage
      const scoreText = (message?.content || message?.reasoning_content)?.trim()

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
        max_tokens: 50, // 增加到50以避免截断
      }, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 检查响应是否存在（即使content为空，只要有response对象就认为成功）
      const success = !!response.choices?.[0]?.message
      const message = response.choices?.[0]?.message as ZhipuChatCompletionMessage
      const content = (message?.content || message?.reasoning_content) || '(空)'

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