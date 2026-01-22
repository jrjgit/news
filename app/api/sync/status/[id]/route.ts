/**
 * 查询同步任务状态API
 * GET /api/sync/status/[id]
 * 
 * 响应:
 * {
 *   success: boolean,
 *   id: string,
 *   status: 'pending' | 'active' | 'succeeded' | 'failed',
 *   progress: {
 *     stage: string,
 *     progress: number,
 *     message?: string,
 *     details?: any
 *   },
 *   createdAt: string,
 *   finishedAt?: string,
 *   result?: {
 *     success: boolean,
 *     newsGenerated?: number,
 *     error?: string
 *   }
 * }
 */

import { NextResponse } from 'next/server'
import { getJobStatus, type JobStatus } from '@/lib/job-queue'

// 响应接口
interface JobStatusResponse {
  success: boolean
  id: string
  status: JobStatus['status']
  progress: JobStatus['progress']
  createdAt: string
  finishedAt?: string
  result?: JobStatus['result']
  statusDescription: string
  retryUrl?: string
  retryMethod?: string
  retryBody?: { forceRefresh: boolean; newsCount: number }
  refreshAdvice?: string
}

// 禁用缓存
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 验证任务ID格式
    if (!id || id.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '缺少任务ID',
        },
        { status: 400 }
      )
    }

    console.log(`[API] 查询任务状态: ${id}`)

    // 获取任务状态
    const status = await getJobStatus(id)

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: '任务不存在',
          jobId: id,
          possibleReasons: [
            '任务ID错误',
            '任务已过期（保留24小时）',
            'Redis连接问题',
          ],
        },
        { status: 404 }
      )
    }

    // 构建响应
    const statusDescriptions: Record<string, string> = {
      pending: '任务等待处理中',
      active: '任务正在处理中',
      succeeded: '任务已成功完成',
      failed: '任务已失败',
    }

    const response: JobStatusResponse = {
      success: true,
      id: status.id,
      status: status.status,
      progress: status.progress,
      createdAt: status.createdAt,
      statusDescription: statusDescriptions[status.status] || '未知状态',
    }

    if (status.finishedAt) {
      response.finishedAt = status.finishedAt
    }

    if (status.result) {
      response.result = status.result
    }

    // 如果任务失败，提供重试建议
    if (status.status === 'failed' && status.result?.error) {
      response.retryUrl = '/api/sync/trigger'
      response.retryMethod = 'POST'
      response.retryBody = {
        forceRefresh: true, // 强制刷新重新执行
        newsCount: 10,
      }
    }

    // 如果任务仍在进行中，提供刷新建议
    if (status.status === 'pending' || status.status === 'active') {
      response.refreshAdvice = '请稍后重新查询状态'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] 查询任务状态失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    )
  }
}
