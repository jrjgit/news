/**
 * 任务队列服务 - 支持 Vercel KV 或标准 Redis
 * 适合 Vercel Serverless 环境
 */

// 支持多种 Redis 连接方式
let kv: any
let useKV = false
let useIoredis = false

// 初始化 Redis 客户端
async function initRedis() {
  if (kv) return

  // 调试日志
  console.log('[JobQueue] 检查环境变量:')
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
      console.log('[JobQueue] 使用 Vercel KV')
      return
    } catch (e) {
      console.warn('[JobQueue] Vercel KV 加载失败，尝试 REDIS_URL')
    }
  }

  // 使用标准 REDIS_URL
  if (process.env.REDIS_URL && process.env.REDIS_URL !== 'null') {
    try {
      const url = process.env.REDIS_URL

      // 如果是 Upstash HTTP URL（https://）
      if (url.includes('upstash') && (url.startsWith('https://') || url.startsWith('http://'))) {
        const { Redis } = await import('@upstash/redis')
        const urlObj = new URL(url)
        const token = urlObj.username || urlObj.password || ''
        kv = new Redis({
          url: urlObj.origin + urlObj.pathname,
          token: token,
        })
        console.log('[JobQueue] 使用 Upstash Redis')
        return
      }

      // 标准 Redis URL（redis:// 或 rediss://），使用 ioredis
      if (url.startsWith('redis://') || url.startsWith('rediss://')) {
        const Redis = (await import('ioredis')).default
        kv = new Redis(url)
        useIoredis = true
        console.log('[JobQueue] 使用 ioredis (标准 Redis)')
        return
      }

      console.warn('[JobQueue] 无法识别的 REDIS_URL 格式:', url.substring(0, 30))
    } catch (e) {
      console.warn('[JobQueue] REDIS_URL 加载失败:', e)
    }
  }

  // 如果都没有，使用内存降级（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.warn('[JobQueue] 无 Redis 配置，使用内存降级')
    kv = null
    return
  }

  throw new Error('未配置 Redis 环境变量 (KV_REST_API_URL 或 REDIS_URL)')
}

// 任务进度接口
export interface SyncProgress {
  stage: string
  progress: number
  message?: string
  details?: {
    current?: number
    total?: number
    failed?: string[]
  }
}

// 任务数据接口
export interface SyncJobData {
  forceRefresh?: boolean
  newsCount?: number
  createdAt?: string
}

// 任务结果接口
export interface SyncJobResult {
  success: boolean
  newsGenerated?: number
  error?: string
}

// 任务状态
export interface JobStatus {
  id: string
  status: 'pending' | 'active' | 'succeeded' | 'failed'
  progress: SyncProgress
  createdAt: string
  finishedAt?: string
  result?: SyncJobResult
  data: SyncJobData  // 任务参数数据
}

// 任务存储键前缀
const JOB_PREFIX = 'news-sync:job:'
const QUEUE_PREFIX = 'news-sync:queue:'

/**
 * 创建同步任务
 */
export async function enqueueSyncTask(options: SyncJobData): Promise<string> {
  await initRedis()

  const jobId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const jobData = {
    id: jobId,
    status: 'pending',
    progress: { stage: 'pending', progress: 0, message: '任务等待处理中' },
    data: {
      ...options,
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    finishedAt: null,
    result: null,
  }

  const jobDataStr = JSON.stringify(jobData)

  if (useIoredis && kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, jobDataStr)
    await kv.zadd(`${QUEUE_PREFIX}pending`, Date.now(), jobId)
  } else if (useKV && kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, jobDataStr)
    await kv.zadd(`${QUEUE_PREFIX}pending`, {
      score: Date.now(),
      member: jobId,
    })
  } else if (kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, jobDataStr)
    await kv.zadd(`${QUEUE_PREFIX}pending`, { score: Date.now(), member: jobId })
  } else {
    console.warn('[JobQueue] Redis 不可用，跳过任务入队')
  }

  return jobId
}

/**
 * 获取任务状态
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  await initRedis()

  if (useIoredis && kv) {
    const jobDataStr = await kv.get(`${JOB_PREFIX}${jobId}`)
    if (!jobDataStr) return null
    const jobData = typeof jobDataStr === 'string' ? JSON.parse(jobDataStr) : jobDataStr
    return {
      id: jobData.id,
      status: jobData.status,
      progress: jobData.progress,
      createdAt: jobData.createdAt,
      finishedAt: jobData.finishedAt,
      result: jobData.result,
      data: jobData.data,
    }
  } else if (useKV && kv) {
    const jobDataStr = await kv.get(`${JOB_PREFIX}${jobId}`)
    if (!jobDataStr) return null
    const jobData = typeof jobDataStr === 'string' ? JSON.parse(jobDataStr) : jobDataStr
    return {
      id: jobData.id,
      status: jobData.status,
      progress: jobData.progress,
      createdAt: jobData.createdAt,
      finishedAt: jobData.finishedAt,
      result: jobData.result,
      data: jobData.data,
    }
  } else if (kv) {
    const jobData = await kv.get(`${JOB_PREFIX}${jobId}`)
    if (!jobData) return null
    const parsed = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
    return {
      id: parsed.id,
      status: parsed.status,
      progress: parsed.progress,
      createdAt: parsed.createdAt,
      finishedAt: parsed.finishedAt,
      result: parsed.result,
      data: parsed.data,
    }
  }

  return null
}

/**
 * 更新任务状态
 */
export async function updateJobStatus(
  jobId: string,
  updates: Partial<{
    status: JobStatus['status']
    progress: SyncProgress
    result: SyncJobResult
    finishedAt: string
  }>
): Promise<void> {
  await initRedis()

  const current = await getJobStatus(jobId)
  if (!current) {
    throw new Error(`任务 ${jobId} 不存在`)
  }

  const updatedData = { ...current, ...updates }

  // 如果任务完成，从队列中移除
  if (updates.status === 'succeeded' || updates.status === 'failed') {
    const queueKey = `${QUEUE_PREFIX}pending`
    if (useIoredis && kv) {
      await kv.zrem(queueKey, jobId)
    } else if (useKV && kv) {
      await kv.zrem(queueKey, jobId)
    } else if (kv) {
      await kv.zrem(queueKey, jobId)
    }
    updatedData.finishedAt = new Date().toISOString()
  }

  const updatedStr = JSON.stringify(updatedData)

  if (useIoredis && kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, updatedStr)
  } else if (useKV && kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, updatedStr)
  } else if (kv) {
    await kv.set(`${JOB_PREFIX}${jobId}`, updatedStr)
  }
}

/**
 * 获取队列中待处理的任务
 */
export async function getNextPendingJob(): Promise<string | null> {
  await initRedis()

  const queueKey = `${QUEUE_PREFIX}pending`

  if (useIoredis && kv) {
    const result = await kv.zrange(queueKey, 0, 0)
    return (result as string[])[0] || null
  } else if (useKV && kv) {
    const result = await kv.zrange(queueKey, 0, 0)
    return (result as string[])[0] || null
  } else if (kv) {
    const result = await kv.zrange(queueKey, 0, 0)
    return (result as string[])[0] || null
  }

  return null
}

/**
 * 取消任务
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  await initRedis()

  const current = await getJobStatus(jobId)
  if (!current) return false

  const queueKey = `${QUEUE_PREFIX}pending`

  if (useIoredis && kv) {
    await kv.zrem(queueKey, jobId)
    await kv.del(`${JOB_PREFIX}${jobId}`)
  } else if (useKV && kv) {
    await kv.zrem(queueKey, jobId)
    await kv.del(`${JOB_PREFIX}${jobId}`)
  } else if (kv) {
    await kv.zrem(queueKey, jobId)
    await kv.del(`${JOB_PREFIX}${jobId}`)
  }

  return true
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(): Promise<{
  pending: number
  active: number
  succeeded: number
  failed: number
}> {
  await initRedis()

  const queueKey = `${QUEUE_PREFIX}pending`
  let pending = 0

  if (useIoredis && kv) {
    pending = await kv.zcard(queueKey)
  } else if (useKV && kv) {
    pending = await kv.zcard(queueKey)
  } else if (kv) {
    pending = await kv.zcard(queueKey)
  }

  return { pending, active: 0, succeeded: 0, failed: 0 }
}

/**
 * 清理过期任务（保留24小时）
 */
export async function cleanupExpiredJobs(): Promise<number> {
  await initRedis()

  const queueKey = `${QUEUE_PREFIX}pending`
  const now = Date.now()
  const expireTime = 24 * 60 * 60 * 1000 // 24小时
  let cleaned = 0

  if (useIoredis && kv) {
    const allJobs = await kv.zrange(queueKey, 0, -1)
    for (const jobId of allJobs as string[]) {
      const status = await getJobStatus(jobId)
      if (status) {
        const jobTime = new Date(status.createdAt).getTime()
        if (now - jobTime > expireTime) {
          await kv.del(`${JOB_PREFIX}${jobId}`)
          await kv.zrem(queueKey, jobId)
          cleaned++
        }
      }
    }
  } else if (useKV && kv) {
    const allJobs = await kv.zrange(queueKey, 0, -1)
    for (const jobId of allJobs as string[]) {
      const status = await getJobStatus(jobId)
      if (status) {
        const jobTime = new Date(status.createdAt).getTime()
        if (now - jobTime > expireTime) {
          await kv.del(`${JOB_PREFIX}${jobId}`)
          await kv.zrem(queueKey, jobId)
          cleaned++
        }
      }
    }
  } else if (kv) {
    const allJobs = await kv.zrange(queueKey, 0, -1)
    for (const jobId of allJobs as string[]) {
      const status = await getJobStatus(jobId)
      if (status) {
        const jobTime = new Date(status.createdAt).getTime()
        if (now - jobTime > expireTime) {
          await kv.del(`${JOB_PREFIX}${jobId}`)
          await kv.zrem(queueKey, jobId)
          cleaned++
        }
      }
    }
  }

  return cleaned
}