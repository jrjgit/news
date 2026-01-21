/**
 * 全局速率限制器
 * 使用令牌桶算法控制AI请求速率
 */

import { aiConfig, sleep } from './config'

class RateLimiter {
  private tokens: number
  private lastRefillTime: number
  private readonly maxTokens: number
  private readonly refillRate: number // 每毫秒补充的令牌数

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute
    this.tokens = requestsPerMinute
    this.lastRefillTime = Date.now()
    this.refillRate = requestsPerMinute / 60000 // 每毫秒补充的令牌数
  }

  /**
   * 补充令牌
   */
  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefillTime
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefillTime = now
  }

  /**
   * 等待直到有足够的令牌
   */
  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens < 1) {
      // 计算需要等待的时间
      const tokensNeeded = 1 - this.tokens
      const waitTime = tokensNeeded / this.refillRate

      console.log(`速率限制：等待 ${Math.ceil(waitTime / 1000)} 秒后继续`)
      await sleep(waitTime)

      this.refill()
    }

    this.tokens -= 1
  }

  /**
   * 尝试获取令牌，不等待
   */
  tryAcquire(): boolean {
    this.refill()

    if (this.tokens < 1) {
      return false
    }

    this.tokens -= 1
    return true
  }

  /**
   * 重置速率限制器
   */
  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefillTime = Date.now()
  }
}

// 全局速率限制器实例
export const rateLimiter = new RateLimiter(aiConfig.rateLimitRequestsPerMinute)

/**
 * 等待速率限制器允许请求
 */
export async function waitForRateLimit(): Promise<void> {
  await rateLimiter.acquire()
}

/**
 * 尝试获取速率限制许可
 */
export function tryAcquireRateLimit(): boolean {
  return rateLimiter.tryAcquire()
}