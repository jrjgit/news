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

// AI配置 - glm-4v 并发10个
export const aiConfig: AIConfig = {
  requestDelay: 2000, // 2秒延迟（并发10个 = 每2秒1个请求，更快）
  requestTimeout: 60000, // 60秒超时（更长）
  batchSize: 8, // 每次批量处理8条（充分利用并发）
  maxRetries: 4, // 最多重试4次
  // 渐进式退避：2s → 6s → 12s → 24s（更短）
  retryDelays: [2000, 6000, 12000, 24000],
  rateLimitBackoff: 30000, // 遇到速率限制时等待30秒（更短）
  rateLimitRequestsPerMinute: 10, // glm-4v 并发10个
  // 熔断器配置
  circuitBreaker: {
    failureThreshold: 3, // 连续3次失败开启熔断
    timeout: 120000, // 2分钟后尝试恢复
    halfOpenRequests: 2, // 半开状态下允许2个测试请求
  },
  // 任务队列配置
  jobQueue: {
    maxAttempts: 3, // 任务最多尝试3次
    retryDelay: 60000, // 1分钟后重试任务
    timeout: 600000, // 任务超时10分钟
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