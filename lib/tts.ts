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
    try {
      // 检查是否已存在音频文件
      if (this.useBlob) {
        const { blobs } = await list({ prefix: `audio/${filename}` })
        if (blobs.length > 0) {
          console.log(`音频文件已存在于Blob: ${filename}`)
          return blobs[0].url
        }
      }

      // 使用 edge-tts 生成音频
      const audioBuffer = await this.synthesizeSpeech(text)

      console.log(`音频生成成功: ${filename}`)

      // 在生产环境上传到Blob
      if (this.useBlob) {
        const blob = await put(`audio/${filename}`, audioBuffer, {
          access: 'public',
          contentType: 'audio/mpeg',
        })
        console.log(`音频已上传到Blob: ${filename}`)
        return blob.url
      }

      // 本地开发环境，返回相对路径
      const fs = await import('fs/promises')
      const path = await import('path')
      const audioDir = path.join(process.cwd(), 'public', 'audio')
      await fs.mkdir(audioDir, { recursive: true })
      const localPath = path.join(audioDir, filename)
      await fs.writeFile(localPath, audioBuffer)
      return `/audio/${filename}`
    } catch (error) {
      console.error('生成音频失败:', error)
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

  async generateIndividualNewsAudio(text: string, newsId: number): Promise<string> {
    const filename = `news-${newsId}.mp3`
    return await this.generateAudio(text, filename)
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