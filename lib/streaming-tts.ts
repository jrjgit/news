/**
 * 流式 TTS 实现
 * 支持将长文本分块处理，并行生成音频
 */

import { EdgeTTS as EdgeTTSClient } from 'edge-tts-universal'
import { put } from '@vercel/blob'
import { Semaphore, withSemaphore } from './semaphore'

export interface AudioChunk {
  index: number
  url: string
  size: number
  duration?: number
}

export interface StreamingAudioResult {
  urls: string[]
  totalSize: number
  chunkCount: number
}

export interface ProgressCallback {
  (progress: number, currentChunk: number, totalChunks: number): void
}

export class StreamingEdgeTTS {
  private voiceName: string
  private chunkSize: number // 每个分块的最大字符数
  private maxConcurrency: number // 最大并发数
  private semaphore: Semaphore
  private useBlob: boolean

  constructor() {
    this.voiceName = process.env.EDGE_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'
    this.chunkSize = 200 // 每个分块最多 200 字
    this.maxConcurrency = 3 // 最多 3 个并发
    this.semaphore = new Semaphore(this.maxConcurrency)
    this.useBlob = process.env.NODE_ENV === 'production' && !!process.env.BLOB_READ_WRITE_TOKEN
  }

  /**
   * 分割文本为多个分块
   * 按句子分割，确保每个分块不超过最大字符数
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = []
    
    // 按句子分割（中文和英文标点）
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]*/g) || []
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if (!trimmedSentence) continue
      
      // 如果当前分块加上新句子超过最大长度，则保存当前分块
      if (currentChunk.length + trimmedSentence.length > this.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = trimmedSentence
      } else {
        currentChunk += trimmedSentence
      }
    }
    
    // 添加最后一个分块
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    // 如果没有句子分割，则按字符分割
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += this.chunkSize) {
        chunks.push(text.substring(i, i + this.chunkSize))
      }
    }
    
    console.log(`文本分割完成: ${text.length} 字 -> ${chunks.length} 个分块`)
    return chunks
  }

  /**
   * 生成单个分块的音频
   */
  private async generateChunkAudio(
    chunk: string,
    chunkIndex: number,
    taskId: string
  ): Promise<AudioChunk> {
    const startTime = Date.now()
    
    try {
      // 创建 TTS 客户端
      const tts = new EdgeTTSClient(chunk, this.voiceName, {
        rate: '+0%',
        volume: '+0%',
        pitch: '+0Hz',
      })
      
      // 合成音频
      const result = await tts.synthesize()
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer())
      
      // 上传到 Blob
      const filename = `audio/streaming/${taskId}/chunk-${chunkIndex}.mp3`
      let url: string
      
      if (this.useBlob) {
        const blob = await put(filename, audioBuffer, {
          access: 'public',
          contentType: 'audio/mpeg',
        })
        url = blob.url
      } else {
        // 本地开发环境
        const fs = await import('fs/promises')
        const path = await import('path')
        const audioDir = path.join(process.cwd(), 'public', 'audio', 'streaming', taskId)
        await fs.mkdir(audioDir, { recursive: true })
        const localPath = path.join(audioDir, `chunk-${chunkIndex}.mp3`)
        await fs.writeFile(localPath, audioBuffer)
        url = `/audio/streaming/${taskId}/chunk-${chunkIndex}.mp3`
      }
      
      const duration = Date.now() - startTime
      console.log(`分块 ${chunkIndex} 生成完成: ${audioBuffer.length} bytes, 耗时: ${duration}ms`)
      
      return {
        index: chunkIndex,
        url,
        size: audioBuffer.length,
        duration
      }
    } catch (error) {
      console.error(`分块 ${chunkIndex} 生成失败:`, error)
      throw error
    }
  }

  /**
   * 流式生成音频（并行处理分块）
   */
  async generateStreamingAudio(
    text: string,
    taskId: string,
    onProgress?: ProgressCallback
  ): Promise<StreamingAudioResult> {
    const startTime = Date.now()
    
    try {
      // 分割文本
      const chunks = this.splitIntoChunks(text)
      const totalChunks = chunks.length
      
      if (totalChunks === 0) {
        throw new Error('文本为空，无法生成音频')
      }
      
      console.log(`开始流式生成音频: ${text.length} 字 -> ${totalChunks} 个分块`)
      
      // 并行生成所有分块
      const results: AudioChunk[] = []
      let completedCount = 0
      
      const promises = chunks.map(async (chunk, index) => {
        return withSemaphore(this.semaphore, async () => {
          try {
            const result = await this.generateChunkAudio(chunk, index, taskId)
            results.push(result)
            completedCount++
            
            // 报告进度
            const progress = Math.round((completedCount / totalChunks) * 100)
            onProgress?.(progress, completedCount, totalChunks)
            
            return result
          } catch (error) {
            console.error(`分块 ${index} 生成失败:`, error)
            throw error
          }
        })
      })
      
      // 等待所有分块完成
      await Promise.all(promises)
      
      // 按索引排序
      results.sort((a, b) => a.index - b.index)
      
      const urls = results.map(r => r.url)
      const totalSize = results.reduce((sum, r) => sum + r.size, 0)
      const duration = Date.now() - startTime
      
      console.log(`流式音频生成完成: ${totalChunks} 个分块, ${totalSize} bytes, 总耗时: ${duration}ms`)
      
      return {
        urls,
        totalSize,
        chunkCount: totalChunks
      }
    } catch (error) {
      console.error('流式音频生成失败:', error)
      throw error
    }
  }

  /**
   * 生成单个音频文件（兼容旧接口）
   */
  async generateSingleAudio(text: string, filename: string): Promise<string> {
    const startTime = Date.now()
    
    try {
      // 检查是否已存在音频文件
      if (this.useBlob) {
        const { list } = await import('@vercel/blob')
        const { blobs } = await list({ prefix: `audio/${filename}` })
        if (blobs.length > 0) {
          console.log(`音频文件已存在: ${filename}, 耗时: ${Date.now() - startTime}ms`)
          return blobs[0].url
        }
      }
      
      // 生成音频
      const tts = new EdgeTTSClient(text, this.voiceName, {
        rate: '+0%',
        volume: '+0%',
        pitch: '+0Hz',
      })
      
      const result = await tts.synthesize()
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer())
      
      // 上传到 Blob
      if (this.useBlob) {
        const blob = await put(`audio/${filename}`, audioBuffer, {
          access: 'public',
          contentType: 'audio/mpeg',
        })
        console.log(`音频已上传: ${filename}, 耗时: ${Date.now() - startTime}ms`)
        return blob.url
      }
      
      // 本地开发环境
      const fs = await import('fs/promises')
      const path = await import('path')
      const audioDir = path.join(process.cwd(), 'public', 'audio')
      await fs.mkdir(audioDir, { recursive: true })
      const localPath = path.join(audioDir, filename)
      await fs.writeFile(localPath, audioBuffer)
      console.log(`音频已保存: ${filename}, 耗时: ${Date.now() - startTime}ms`)
      return `/audio/${filename}`
    } catch (error) {
      console.error(`生成音频失败: ${filename}`, error)
      throw error
    }
  }
}

export const streamingTTS = new StreamingEdgeTTS()