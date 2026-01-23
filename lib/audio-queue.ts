/**
 * 音频生成任务队列 - 使用 Vercel KV 实现
 * 支持后台异步生成音频
 */

import { kv } from '@vercel/kv'

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
  const jobId = `audio-${date}-${Date.now()}`

  const jobData: AudioJob = {
    id: jobId,
    date,
    script,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
  }

  // 保存任务数据
  await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(jobData))

  // 添加到队列
  const queueKey = `${AUDIO_QUEUE_PREFIX}pending`
  await kv.zadd(queueKey, {
    score: Date.now(),
    member: jobId,
  })

  console.log(`[AudioQueue] 创建任务: ${jobId}`)
  return jobId
}

/**
 * 获取音频任务状态
 */
export async function getAudioJobStatus(jobId: string): Promise<AudioJob | null> {
  const jobDataStr = await kv.get<string>(`${AUDIO_JOB_PREFIX}${jobId}`)

  if (!jobDataStr) {
    return null
  }

  return JSON.parse(jobDataStr) as AudioJob
}

/**
 * 获取某日期的最新音频任务
 */
export async function getLatestAudioJob(date: string): Promise<AudioJob | null> {
  const queueKey = `${AUDIO_QUEUE_PREFIX}pending`
  
  // 获取该日期相关的所有任务
  const allJobs = (await kv.zrange(queueKey, 0, -1)) as string[]
  
  for (const jobId of allJobs) {
    if (typeof jobId === 'string' && jobId.includes(date)) {
      const status = await getAudioJobStatus(jobId)
      if (status && (status.status === 'completed' || status.status === 'processing')) {
        return status
      }
    }
  }

  // 检查已完成的任务（可能已从队列移除）
  const completedKeys = await kv.keys(`${AUDIO_JOB_PREFIX}${date}-*`)
  const completedJobs = completedKeys as string[]
  
  for (const key of completedJobs) {
    const jobId = key.replace(AUDIO_JOB_PREFIX, '')
    const status = await getAudioJobStatus(jobId)
    if (status?.status === 'completed' && status.audioUrl) {
      return status
    }
  }

  return null
}

/**
 * 更新音频任务状态
 */
export async function updateAudioJobStatus(
  jobId: string,
  updates: Partial<{
    status: AudioJobStatus
    progress: number
    audioUrl: string
    error: string
    finishedAt: string
  }>
): Promise<void> {
  const jobDataStr = await kv.get<string>(`${AUDIO_JOB_PREFIX}${jobId}`)
  
  if (!jobDataStr) {
    throw new Error(`音频任务 ${jobId} 不存在`)
  }

  const jobData = JSON.parse(jobDataStr) as AudioJob
  const updatedData = { ...jobData, ...updates }

  // 如果任务完成，从队列移除
  if (updates.status === 'completed' || updates.status === 'failed') {
    const queueKey = `${AUDIO_QUEUE_PREFIX}pending`
    await kv.zrem(queueKey, jobId)
    updatedData.finishedAt = new Date().toISOString()
  }

  await kv.set(`${AUDIO_JOB_PREFIX}${jobId}`, JSON.stringify(updatedData))
}

/**
 * 获取队列中待处理的音频任务
 */
export async function getNextAudioJob(): Promise<string | null> {
  const queueKey = `${AUDIO_QUEUE_PREFIX}pending`

  const result = (await kv.zrange(queueKey, 0, 0)) as string[]

  if (!result || result.length === 0) {
    return null
  }

  return result[0] || null
}

/**
 * 取消音频任务
 */
export async function cancelAudioJob(jobId: string): Promise<boolean> {
  const jobDataStr = await kv.get<string>(`${AUDIO_JOB_PREFIX}${jobId}`)
  
  if (!jobDataStr) {
    return false
  }

  const queueKey = `${AUDIO_QUEUE_PREFIX}pending`
  await kv.zrem(queueKey, jobId)
  await kv.del(`${AUDIO_JOB_PREFIX}${jobId}`)
  
  return true
}

/**
 * 获取音频队列统计
 */
export async function getAudioQueueStats(): Promise<{
  pending: number
  processing: number
  completed: number
}> {
  const queueKey = `${AUDIO_QUEUE_PREFIX}pending`
  const pending = await kv.zcard(queueKey)
  
  return { pending, processing: 0, completed: 0 }
}
