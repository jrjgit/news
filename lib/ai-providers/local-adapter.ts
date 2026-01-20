/**
 * 本地模型适配器
 * 使用本地部署的开源模型（如Ollama）提供AI服务
 */

import OpenAI from 'openai'
import { BaseAIAdapter } from './base'
import {
  NewsSummaryRequest,
  NewsTranslationRequest,
  PodcastScriptRequest,
  AIServiceResponse,
} from '../ai-service'

export interface LocalModelAdapterConfig extends Record<string, unknown> {
  baseUrl?: string
  model?: string
}

export class LocalModelAdapter extends BaseAIAdapter<LocalModelAdapterConfig> {
  private client: OpenAI | null = null
  private model: string
  private baseUrl: string

  constructor(config: LocalModelAdapterConfig) {
    super(config)
    this.baseUrl = config.baseUrl || 'http://localhost:11434'
    this.model = config.model || 'llama2'

    try {
      this.client = new OpenAI({
        baseURL: `${this.baseUrl}/v1`,
        apiKey: 'ollama', // Ollama不需要真实的API密钥
      })
    } catch (error) {
      console.error('本地模型客户端初始化失败:', error)
    }
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error('本地模型客户端未初始化，请检查Ollama服务是否运行')
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
        max_tokens: 300,
      })

      const summary = response.choices[0]?.message?.content?.trim()

      if (!summary) {
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

      const response = await client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译，擅长新闻翻译。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const translation = response.choices[0]?.message?.content?.trim()

      if (!translation) {
        throw new Error('未收到有效的翻译响应')
      }

      return {
        success: true,
        data: translation,
      }
    } catch (error: unknown) {
      return this.handleError(error, '内容翻译')
    }
  }

  async generatePodcastScript(request: PodcastScriptRequest): Promise<AIServiceResponse<string>> {
    try {
      const client = this.ensureClient()
      const prompt = this.getPodcastScriptPrompt(request)

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
        max_tokens: 1500,
      })

      const script = response.choices[0]?.message?.content?.trim()

      if (!script) {
        throw new Error('未收到有效的脚本响应')
      }

      return {
        success: true,
        data: script,
      }
    } catch (error: unknown) {
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
        max_tokens: 10,
      })

      const scoreText = response.choices[0]?.message?.content?.trim()

      if (!scoreText) {
        throw new Error('未收到有效的评分响应')
      }

      const score = parseInt(scoreText, 10)

      if (isNaN(score) || score < 1 || score > 5) {
        throw new Error(`无效的评分: ${scoreText}`)
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
        return false
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 5,
      })

      return !!response.choices[0]?.message?.content
    } catch (error) {
      console.error('本地模型健康检查失败:', error)
      return false
    }
  }
}