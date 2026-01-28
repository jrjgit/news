// 极简 TTS - 流式分块
import { put } from '@vercel/blob'

export async function generateAudio(text: string, date: string, onChunk?: (url: string, index: number) => void): Promise<string[]> {
  // 分块
  const chunks = splitText(text, 300)
  const urls: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const url = await generateChunk(chunks[i], date, i)
    urls.push(url)
    onChunk?.(url, i)
    await new Promise(r => setTimeout(r, 300))
  }

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

async function generateChunk(text: string, date: string, index: number): Promise<string> {
  try {
    console.log(`[TTS] 生成第 ${index + 1} 段，长度 ${text.length}`)

    // 动态导入 edge-tts-universal
    const edgeTTS = await import('edge-tts-universal')
    const tts = new edgeTTS.EdgeTTS()

    // 使用 tts() 方法，不是 ttsPromise()
    const audio = await tts.tts(text, 'zh-CN-XiaoxiaoNeural')
    console.log(`[TTS] 第 ${index + 1} 段 TTS 完成，音频大小: ${audio?.length || 0}`)

    const { url } = await put(`audio/${date}-${index}.mp3`, Buffer.from(audio), {
      access: 'public',
      contentType: 'audio/mp3',
    })

    console.log(`[TTS] 第 ${index + 1} 段上传完成: ${url}`)
    return url
  } catch (error) {
    console.error(`[TTS] 第 ${index + 1} 段生成失败:`, error)
    throw error
  }
}
