/**
 * 音频生成任务队列 - 支持 Vercel KV 或标准 Redis
 * 支持后台异步生成音频
 */

// 支持多种 Redis 连接方式
let kv: any
let useKV = false
let useIoredis = false

// 初始化 Redis 客户端
async function initRedis() {
  if (kv) return

  // 调试日志：打印所有可能的 Redis 环境变量
  console.log('[AudioQueue] 检查环境变量:')
  console.log('  KV_REST_API_URL:', process.env.KV_REST_API_URL ? '已配置' : '未配置')
  console.log('  KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '已配置' : '未配置')
  console.log('  REDIS_URL:', process.env.REDIS_URL ? '已配置' : '未配置')
  if (process.env.REDIS_URL) {
    console.log('  REDIS_URL 值前30字符:', process.env.REDIS_URL.substring(0, 30))
  }

  // 优先使用 Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const kvModule = await import('@vercel/kv')
      kv = kvModule.kv
      useKV = true
      console.log('[AudioQueue] 使用 Vercel KV')
      return
    } catch (e) {
      console.warn('[AudioQueue] Vercel KV 加载失败，尝试 REDIS_URL')
    }
  }

  // 使用标准 REDIS_URL（redis:// 或 rediss:// 协议）
  if (process.env.REDIS_URL && process.env.REDIS_URL !== 'null') {
    try {
      const url = process.env.REDIS_URL

      // 如果是 Upstash HTTP URL（https://）
      if (url.includes('upstash') && (url.startsWith('https://') || url.startsWith('http://'))) {
        const { Redis } = await import('@upstash/redis')
        // 解析 Upstash URL 格式: https://xxx.upstash.io 或带 token 的
        const urlObj = new URL(url)
        const token = urlObj.username || urlObj.password || ''
        kv = new Redis({
          url: urlObj.origin + urlObj.pathname,
          token: token,
        })
        useKV = false
        console.log('[AudioQueue] 使用 Upstash Redis')
        return
      }

      // 标准 Redis URL（redis:// 或 rediss://），使用 ioredis
      if (url.startsWith('redis://') || url.startsWith('rediss://')) {
        const Redis = (await import('ioredis')).default
        kv = new Redis(url)
        useIoredis = true
        console.log('[AudioQueue] 使用 ioredis (标准 Redis)')
        return
      }

      console.warn('[AudioQueue] 无法识别的 REDIS_URL 格式:', url.substring(0, 30))
    } catch (e) {
      console.warn('[AudioQueue] REDIS_URL 加载失败:', e)
    }
  }

  // 如果都没有，使用内存降级（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.warn('[AudioQueue] 无 Redis 配置，使用内存降级')
    kv = null
    return
  }

  throw new Error('未配置 Redis 环境变量 (KV_REST_API_URL 或 REDIS_URL)')
}

// 音频任务状态
export type AudioJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 音频任务数据
export interface AudioJob {
  id: string
  date: string // YYYY-MM-DD 格式
  script: string // 播报脚本内容
  status: AudioJobStatus
  progress: number // 0-100
  audioUrl?: string
  error?: string
  createdAt: string
  finishedAt?: string
}

// 存储键前缀
const AUDIO_JOB_PREFIX = 'news-audio:job:'
const AUDIO_QUEUE_PREFIX = 'news-audio:queue:'

/**
 * 创建音频生成任务
 */
export async function enqueueAudioJob(date: string, script: string): Promise<string> {
  await initRedis()

  const jobId = `audio-${date}-${Date.now()}`
  const now = new Date().toISOString()

  const jobData: AudioJob = {
    id: jobId,
    date,
    script,
    status: 'pending',
    progress: 0,
    createdAt: now,
  }

  if (useIoredis && kv) {
    // ioredis 使用 Promise 格式
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(jobData))
    await kv.zadd(`${AUDIO_QUEUE_PREFIX}pending`, Date.now(), jobId)
  } else if (useKV && kv) {
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(jobData))
    await kv.zadd(`${AUDIO_QUEUE_PREFIX}pending`, {
      score: Date.now(),
      member: jobId,
    })
  } else if (kv) {
    // @upstash/redis
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(jobData))
    await kv.zadd(`${AUDIO_QUEUE_PREFIX}pending`, { score: Date.now(), member: jobId })
  } else {
    // 内存降级
    console.warn('[AudioQueue] Redis 不可用，跳过任务入队')
  }

  console.log(`[AudioQueue] 任务已入队: ${jobId}`)
  return jobId
}

/**
 * 获取音频任务状态
 */
export async function getAudioJobStatus(jobId: string): Promise<AudioJob | null> {
  await initRedis()

  if (useKV && kv) {
    const data = await kv.get(`${AUDIO_JOB_PREFIX}${jobId}`)
    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      return parsed as AudioJob
    }
  } else if (kv) {
    const data = await kv.get(`${AUDIO_JOB_PREFIX}${jobId}`)
    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      return parsed as AudioJob
    }
  }

  return null
}

/**
 * 更新音频任务状态
 */
export async function updateAudioJobStatus(
  jobId: string,
  updates: Partial<AudioJob>
): Promise<void> {
  await initRedis()

  const current = await getAudioJobStatus(jobId)
  if (!current) return

  const updated = { ...current, ...updates }

  if (useIoredis && kv) {
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(updated))
  } else if (useKV && kv) {
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(updated))
  } else if (kv) {
    await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(updated))
  }
}

/**
 * 获取下一个待处理的音频任务
 */
export async function getNextAudioJob(): Promise<string | null> {
  await initRedis()

  if (useIoredis && kv) {
    const result = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, 0)
    return (result as string[])[0] || null
  } else if (useKV && kv) {
    const result = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, 0)
    return (result as string[])[0] || null
  } else if (kv) {
    const result = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, 0)
    return (result as string[])[0] || null
  }

  return null
}

/**
 * 获取某日期的最新音频任务
 */
export async function getLatestAudioJob(date: string): Promise<AudioJob | null> {
  await initRedis()

  if (useIoredis && kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      if (jobId.includes(date)) {
        const status = await getAudioJobStatus(jobId)
        if (status && (status.status === 'completed' || status.status === 'processing')) {
          return status
        }
      }
    }

    // 检查已完成的任务
    const pattern = `${AUDIO_JOB_PREFIX}${date}-*`
    const completedKeys = await kv.keys(pattern)
    for (const key of completedKeys as string[]) {
      const jobId = key.replace(`${AUDIO_JOB_PREFIX}`, '')
      const status = await getAudioJobStatus(jobId)
      if (status?.status === 'completed') {
        return status
      }
    }
  } else if (useKV && kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      if (jobId.includes(date)) {
        const status = await getAudioJobStatus(jobId)
        if (status && (status.status === 'completed' || status.status === 'processing')) {
          return status
        }
      }
    }

    // 检查已完成的任务
    const completedKeys = await kv.keys(`${AUDIO_JOB_PREFIX}${date}-*`)
    for (const key of completedKeys as string[]) {
      const jobId = key.replace(`${AUDIO_JOB_PREFIX}`, '')
      const status = await getAudioJobStatus(jobId)
      if (status?.status === 'completed') {
        return status
      }
    }
  } else if (kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      if (jobId.includes(date)) {
        const status = await getAudioJobStatus(jobId)
        if (status && (status.status === 'completed' || status.status === 'processing')) {
          return status
        }
      }
    }

    // 检查已完成的任务
    const pattern = `${AUDIO_JOB_PREFIX}${date}-*`
    const completedKeys = await kv.keys(pattern)
    for (const key of completedKeys as string[]) {
      const jobId = key.replace(`${AUDIO_JOB_PREFIX}`, '')
      const status = await getAudioJobStatus(jobId)
      if (status?.status === 'completed') {
        return status
      }
    }
  }

  return null
}

/**
 * 清理过期的音频任务
 */
export async function cleanupAudioJobs(retentionDays: number = 7): Promise<number> {
  await initRedis()

  const expireTime = retentionDays * 24 * 60 * 60 * 1000
  const now = Date.now()
  let cleaned = 0

  if (useIoredis && kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      const status = await getAudioJobStatus(jobId)
      if (status) {
        const createdTime = new Date(status.createdAt).getTime()
        if (now - createdTime > expireTime) {
          await kv.del(`${AUDIO_JOB_PREFIX}${jobId}`)
          await kv.zrem(`${AUDIO_QUEUE_PREFIX}pending`, jobId)
          cleaned++
        }
      }
    }
  } else if (useKV && kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      const status = await getAudioJobStatus(jobId)
      if (status) {
        const createdTime = new Date(status.createdAt).getTime()
        if (now - createdTime > expireTime) {
          await kv.del(`${AUDIO_JOB_PREFIX}${jobId}`)
          await kv.zrem(`${AUDIO_QUEUE_PREFIX}pending`, jobId)
          cleaned++
        }
      }
    }
  } else if (kv) {
    const allJobs = await kv.zrange(`${AUDIO_QUEUE_PREFIX}pending`, 0, -1)

    for (const jobId of allJobs as string[]) {
      const status = await getAudioJobStatus(jobId)
      if (status) {
        const createdTime = new Date(status.createdAt).getTime()
        if (now - createdTime > expireTime) {
          await kv.del(`${AUDIO_JOB_PREFIX}${jobId}`)
          await kv.zrem(`${AUDIO_QUEUE_PREFIX}pending`, jobId)
          cleaned++
        }
      }
    }
  }

  return cleaned
}