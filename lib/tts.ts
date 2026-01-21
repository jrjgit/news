import { EdgeTTS as EdgeTTSClient } from 'edge-tts-universal'
import { put, del, list } from '@vercel/blob'

export class EdgeTTS {
  private voiceName: string
  private useBlob: boolean

  constructor() {
    this.voiceName = process.env.EDGE_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'
    this.useBlob = process.env.NODE_ENV === 'production' && !!process.env.BLOB_READ_WRITE_TOKEN
  }

  async generateAudio(text: string, filename: string): Promise<string> {
    const startTime = Date.now()
    console.log(`开始生成音频: ${filename}, 文本长度: ${text.length}`)

    try {
      // 检查是否已存在音频文件
      if (this.useBlob) {
        const { blobs } = await list({ prefix: `audio/${filename}` })
        if (blobs.length > 0) {
          console.log(`音频文件已存在于Blob: ${filename}, 耗时: ${Date.now() - startTime}ms`)
          return blobs[0].url
        }
      }

      // 使用 edge-tts 生成音频
      console.log(`开始调用TTS合成: ${filename}`)
      const audioBuffer = await this.synthesizeSpeech(text)
      console.log(`TTS合成完成: ${filename}, 音频大小: ${audioBuffer.length} bytes, 耗时: ${Date.now() - startTime}ms`)

      // 在生产环境上传到Blob
      if (this.useBlob) {
        console.log(`开始上传到Blob: ${filename}`)
        const blob = await put(`audio/${filename}`, audioBuffer, {
          access: 'public',
          contentType: 'audio/mpeg',
        })
        console.log(`音频已上传到Blob: ${filename}, 耗时: ${Date.now() - startTime}ms`)
        return blob.url
      }

      // 本地开发环境，返回相对路径
      const fs = await import('fs/promises')
      const path = await import('path')
      const audioDir = path.join(process.cwd(), 'public', 'audio')
      await fs.mkdir(audioDir, { recursive: true })
      const localPath = path.join(audioDir, filename)
      await fs.writeFile(localPath, audioBuffer)
      console.log(`音频已保存到本地: ${filename}, 耗时: ${Date.now() - startTime}ms`)
      return `/audio/${filename}`
    } catch (error) {
      console.error(`生成音频失败: ${filename}, 耗时: ${Date.now() - startTime}ms`, error)
      throw error
    }
  }

  private async synthesizeSpeech(text: string): Promise<Buffer> {
    const tts = new EdgeTTSClient(text, this.voiceName, {
      rate: '+0%',
      volume: '+0%',
      pitch: '+0Hz',
    })

    const result = await tts.synthesize()
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer())
    return audioBuffer
  }

  async generateDailyNewsAudio(script: string, date: string): Promise<string> {
    const filename = `daily-news-${date}.mp3`
    return await this.generateAudio(script, filename)
  }

  async generateIndividualNewsAudio(text: string, newsId: number | string): Promise<string> {
    const filename = `news-${newsId}.mp3`

    // 添加重试机制，最多重试2次
    const maxRetries = 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`音频生成重试 ${attempt}/${maxRetries}: ${filename}`)
        }
        return await this.generateAudio(text, filename)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`音频生成失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, lastError.message)

        // 如果不是最后一次尝试，等待2秒后重试
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    // 所有重试都失败，抛出最后的错误
    throw lastError || new Error('音频生成失败')
  }

  async cleanupOldAudio(retentionDays: number = 3): Promise<void> {
    try {
      const now = Date.now()
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000

      if (this.useBlob) {
        // 清理Blob中的旧音频
        const { blobs } = await list({ prefix: 'audio/' })
        for (const blob of blobs) {
          const uploadedAt = new Date(blob.uploadedAt).getTime()
          if (now - uploadedAt > retentionMs) {
            await del(blob.url)
            console.log(`删除过期音频文件(Blob): ${blob.pathname}`)
          }
        }
      }
    } catch (error) {
      console.error('清理音频文件失败:', error)
    }
  }
}

export const edgeTTS = new EdgeTTS()