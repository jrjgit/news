// 极简 TTS - 流式分块
import { put } from '@vercel/blob'

export async function generateAudio(text: string, date: string, onChunk?: (url: string, index: number) => void): Promise<string[]> {
  // 分块 - 每段200字以内，确保生成速度
  const chunks = splitText(text, 200)
  const urls: string[] = []

  console.log(`[TTS] 文本总长度: ${text.length}, 分块数: ${chunks.length}`)

  for (let i = 0; i < chunks.length; i++) {
    try {
      const url = await generateChunkWithTimeout(chunks[i], date, i)
      urls.push(url)
      onChunk?.(url, i)

      // 每段之间增加延迟，避免触发限制
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (error) {
      console.error(`[TTS] 第 ${i + 1} 段失败，跳过:`, error)
      // 继续下一段，不中断整个流程
    }
  }

  if (urls.length === 0) {
    throw new Error('所有音频片段生成失败')
  }

  console.log(`[TTS] 成功生成 ${urls.length}/${chunks.length} 段音频`)
  return urls
}

function splitText(text: string, maxLen: number): string[] {
  const chunks: string[] = []
  let current = ''
  const sentences = text.split(/([。！？.!?])/)

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = (sentences[i] || '') + (sentences[i + 1] || '')
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current) chunks.push(current.trim())
  return chunks.length ? chunks : [text.slice(0, maxLen)]
}

// 带超时的生成
async function generateChunkWithTimeout(text: string, date: string, index: number): Promise<string> {
  const timeout = 25000 // 25秒超时

  return Promise.race([
    generateChunk(text, date, index),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('TTS timeout')), timeout)
    )
  ])
}

async function generateChunk(text: string, date: string, index: number): Promise<string> {
  console.log(`[TTS] 生成第 ${index + 1} 段，长度 ${text.length}`)

  // 动态导入 edge-tts-universal
  const { EdgeTTS } = await import('edge-tts-universal')

  // 正确用法：构造函数传入文本和语音，然后调用 synthesize()
  const tts = new EdgeTTS(text, 'zh-CN-XiaoxiaoNeural')
  const result = await tts.synthesize()

  // result.audio 是 Blob，需要转换为 Buffer
  const arrayBuffer = await result.audio.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)

  console.log(`[TTS] 第 ${index + 1} 段 TTS 完成，音频大小: ${audioBuffer.length}`)

  const { url } = await put(`audio/${date}-${index}.mp3`, audioBuffer, {
    access: 'public',
    contentType: 'audio/mp3',
  })

  console.log(`[TTS] 第 ${index + 1} 段上传完成: ${url}`)
  return url
}
