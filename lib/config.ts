/**
 * 全局配置管理
 * 统一管理延迟、超时、批量数量等配置
 */

export interface AIConfig {
  // 请求延迟（毫秒）- 两次AI请求之间的间隔
  requestDelay: number

  // 请求超时（毫秒）
  requestTimeout: number

  // 批量处理数量
  batchSize: number

  // 重试配置 - 新的渐进式退避策略
  maxRetries: number
  retryDelays: number[] // 重试延迟数组（更激进的退避）
  rateLimitBackoff: number // 遇到速率限制时的额外等待时间

  // 速率限制
  rateLimitRequestsPerMinute: number

  // 熔断器配置
  circuitBreaker: {
    failureThreshold: number // 连续失败次数阈值
    timeout: number // 熔断超时时间（毫秒）
    halfOpenRequests: number // 半开状态允许的测试请求数
  }

  // 任务队列配置
  jobQueue: {
    // 任务最大尝试次数
    maxAttempts: number
    // 任务重试延迟（毫秒）
    retryDelay: number
    // 任务超时时间（毫秒）
    timeout: number
  }
}

export interface AudioConfig {
  // 音频生成超时（毫秒）
  generationTimeout: number

  // 音频生成延迟（毫秒）
  generationDelay: number

  // 最大文本长度（字符）
  maxTextLength: number

  // 重试配置
  maxRetries: number
  retryDelay: number
}

export interface SyncConfig {
  // 步骤间延迟（毫秒）
  stepDelay: number
}

// AI配置 - 优化超时和批量大小以避免 Vercel 限制
export const aiConfig: AIConfig = {
  requestDelay: 1500, // 1.5秒延迟，更激进
  requestTimeout: 30000, // 30秒超时，快速失败
  batchSize: 5, // 减少批量大小，降低单次请求压力
  maxRetries: 2, // 减少重试次数，快速失败
  // 渐进式退避：1s → 3s（更短更激进）
  retryDelays: [1000, 3000],
  rateLimitBackoff: 15000, // 遇到速率限制时等待15秒
  rateLimitRequestsPerMinute: 10, // glm-4v 并发10个
  // 熔断器配置
  circuitBreaker: {
    failureThreshold: 3, // 连续3次失败开启熔断
    timeout: 60000, // 1分钟后尝试恢复（更快恢复）
    halfOpenRequests: 2, // 半开状态下允许2个测试请求
  },
  // 任务队列配置
  jobQueue: {
    maxAttempts: 3, // 任务最多尝试3次
    retryDelay: 30000, // 30秒后重试任务
    timeout: 300000, // 任务超时5分钟
  },
}

// 音频配置
export const audioConfig: AudioConfig = {
  generationTimeout: 300000, // 300秒超时
  generationDelay: 1000, // 1秒延迟
  maxTextLength: 200, // 最大200字
  maxRetries: 3, // 最多重试3次
  retryDelay: 5000, // 重试间隔5秒
}

// 同步配置 - 后台任务模式
export const syncConfig: SyncConfig = {
  stepDelay: 2000, // 步骤间2秒延迟（更短）
}

/**
 * 获取指数退避延迟时间
 * 使用预定义的延迟数组，更可控的退避策略
 */
export function getExponentialBackoffDelay(attempt: number): number {
  if (attempt < aiConfig.retryDelays.length) {
    return aiConfig.retryDelays[attempt]
  }
  return aiConfig.retryDelays[aiConfig.retryDelays.length - 1]
}

/**
 * 获取速率限制退避时间
 * 遇到429错误时使用更长的等待
 */
export function getRateLimitBackoff(): number {
  return aiConfig.rateLimitBackoff
}

/**
 * 检查是否应该跳过重试（永久性错误）
 */
export function isNonRetryableError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false
  }

  const err = error as Record<string, unknown>
  // 认证错误、权限错误等不应重试
  const nonRetryableCodes = [401, 403, 400]
  if (nonRetryableCodes.includes(err?.status as number)) {
    return true
  }
  return false
}

/**
 * 睡眠指定毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}