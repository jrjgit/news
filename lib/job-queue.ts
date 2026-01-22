/**
 * 任务队列服务 - 使用 Vercel KV 实现
 * 适合 Vercel Serverless 环境
 */

import { kv } from '@vercel/kv'

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

  // 保存任务数据
  await kv.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(jobData))

  // 添加到队列（按创建时间排序）
  const queueKey = `${QUEUE_PREFIX}pending`
  await kv.zadd(queueKey, {
    score: Date.now(),
    member: jobId,
  })

  return jobId
}

/**
 * 获取任务状态
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const jobDataStr = await kv.get<string>(`${JOB_PREFIX}${jobId}`)

  if (!jobDataStr) {
    return null
  }

  const jobData = JSON.parse(jobDataStr)

  return {
    id: jobData.id,
    status: jobData.status,
    progress: jobData.progress,
    createdAt: jobData.createdAt,
    finishedAt: jobData.finishedAt,
    result: jobData.result,
    data: jobData.data,
  }
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
  const jobDataStr = await kv.get<string>(`${JOB_PREFIX}${jobId}`)
  
  if (!jobDataStr) {
    throw new Error(`任务 ${jobId} 不存在`)
  }

  const jobData = JSON.parse(jobDataStr)
  const updatedData = { ...jobData, ...updates }

  // 如果任务完成，从队列中移除
  if (updates.status === 'succeeded' || updates.status === 'failed') {
    const queueKey = `${QUEUE_PREFIX}pending`
    await kv.zrem(queueKey, jobId)
    updatedData.finishedAt = new Date().toISOString()
  }

  await kv.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(updatedData))
}

/**
 * 获取队列中待处理的任务
 */
export async function getNextPendingJob(): Promise<string | null> {
  const queueKey = `${QUEUE_PREFIX}pending`

  // 获取最早的任务
  const result = (await kv.zrange(queueKey, 0, 0)) as string[]

  if (!result || result.length === 0) {
    return null
  }

  return result[0] || null
}

/**
 * 取消任务
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const jobDataStr = await kv.get<string>(`${JOB_PREFIX}${jobId}`)
  
  if (!jobDataStr) {
    return false
  }

  const jobData = JSON.parse(jobDataStr)
  
  // 从队列中移除
  const queueKey = `${QUEUE_PREFIX}pending`
  await kv.zrem(queueKey, jobId)
  
  // 删除任务数据
  await kv.del(`${JOB_PREFIX}${jobId}`)
  
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
  const queueKey = `${QUEUE_PREFIX}pending`
  const pending = await kv.zcard(queueKey)
  
  return { pending, active: 0, succeeded: 0, failed: 0 }
}

/**
 * 清理过期任务（保留24小时）
 */
export async function cleanupExpiredJobs(): Promise<number> {
  const queueKey = `${QUEUE_PREFIX}pending`
  const now = Date.now()
  const expireTime = 24 * 60 * 60 * 1000 // 24小时

  // 获取所有过期任务
  const allJobs = await kv.zrange(queueKey, 0, -1)
  let cleaned = 0

  for (const jobId of allJobs) {
    const jobDataStr = await kv.get<string>(`${JOB_PREFIX}${jobId}`)
    if (jobDataStr) {
      const jobData = JSON.parse(jobDataStr)
      const jobTime = new Date(jobData.createdAt).getTime()
      
      if (now - jobTime > expireTime) {
        await kv.del(`${JOB_PREFIX}${jobId}`)
        await kv.zrem(queueKey, jobId)
        cleaned++
      }
    }
  }

  return cleaned
}
