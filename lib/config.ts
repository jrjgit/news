/**
 * 全局配置管理
 * 统一管理延迟、超时、批量数量等配置
 */

export interface AIConfig {
  // 请求延迟（毫秒）
  requestDelay: number

  // 请求超时（毫秒）
  requestTimeout: number

  // 批量处理数量
  batchSize: number

  // 重试配置
  maxRetries: number
  retryDelayBase: number // 初始重试延迟（毫秒）
  retryDelayMax: number // 最大重试延迟（毫秒）

  // 速率限制
  rateLimitRequestsPerMinute: number
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

// AI配置
export const aiConfig: AIConfig = {
  requestDelay: 5000, // 5秒延迟
  requestTimeout: 30000, // 30秒超时
  batchSize: 6, // 批量处理6条
  maxRetries: 3, // 最多重试3次
  retryDelayBase: 2000, // 初始2秒
  retryDelayMax: 16000, // 最大16秒
  rateLimitRequestsPerMinute: 12, // 每分钟12个请求
}

// 音频配置
export const audioConfig: AudioConfig = {
  generationTimeout: 120000, // 120秒超时
  generationDelay: 2000, // 2秒延迟
  maxTextLength: 200, // 最大200字
  maxRetries: 2, // 最多重试2次
  retryDelay: 2000, // 重试间隔2秒
}

// 同步配置
export const syncConfig: SyncConfig = {
  stepDelay: 5000, // 5秒延迟
}

/**
 * 获取指数退避延迟时间
 */
export function getExponentialBackoffDelay(
  attempt: number,
  baseDelay: number = aiConfig.retryDelayBase,
  maxDelay: number = aiConfig.retryDelayMax
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return delay
}

/**
 * 睡眠指定毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}