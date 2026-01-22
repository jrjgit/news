/**
 * 熔断器模式实现
 * 保护系统免受连续失败的API调用影响
 */

type CircuitBreakerState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerConfig {
  // 连续失败次数阈值
  failureThreshold: number
  // 熔断超时时间（毫秒）
  timeout: number
  // 半开状态下允许的测试请求数
  halfOpenRequests: number
  // 监控的成功率阈值（0-1）
  successThreshold: number
}

interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailure: number | null
  lastSuccess: number | null
  nextAttempt: number
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig
  private state: CircuitBreakerState = 'closed'
  private failures: number = 0
  private successes: number = 0
  private lastFailure: number = 0
  private lastSuccess: number = 0
  private halfOpenSuccesses: number = 0
  private nextAttempt: number = 0

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      timeout: config?.timeout ?? 60000, // 默认60秒
      halfOpenRequests: config?.halfOpenRequests ?? 3,
      successThreshold: config?.successThreshold ?? 0.5,
    }
  }

  /**
   * 获取当前熔断器状态
   */
  getState(): CircuitBreakerState {
    if (this.state === 'open' && Date.now() >= this.nextAttempt) {
      this.state = 'half-open'
    }
    return this.state
  }

  /**
   * 获取熔断器指标
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure || null,
      lastSuccess: this.lastSuccess || null,
      nextAttempt: this.nextAttempt,
    }
  }

  /**
   * 执行受保护的函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState()

    if (state === 'open') {
      throw new CircuitBreakerError('熔断器已开启，请稍后重试', this.nextAttempt - Date.now())
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.successes++
    this.lastSuccess = Date.now()

    if (this.state === 'half-open') {
      this.halfOpenSuccesses++
      
      // 如果半开状态下的测试请求都成功，关闭熔断器
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.reset()
      }
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failures++
    this.lastFailure = Date.now()

    if (this.state === 'half-open') {
      // 半开状态下任何失败都重新开启熔断器
      this.open()
    } else if (this.failures >= this.config.failureThreshold) {
      this.open()
    }
  }

  /**
   * 开启熔断器
   */
  private open(): void {
    this.state = 'open'
    this.nextAttempt = Date.now() + this.config.timeout
    console.warn(`[CircuitBreaker] 熔断器开启，${this.config.timeout / 1000}秒后尝试恢复`)
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.successes = 0
    this.halfOpenSuccesses = 0
    this.lastFailure = 0
    this.lastSuccess = 0
    this.nextAttempt = 0
    console.info('[CircuitBreaker] 熔断器已重置')
  }

  /**
   * 手动强制开启熔断器
   */
  forceOpen(): void {
    this.open()
  }
}

/**
 * 熔断器错误
 */
export class CircuitBreakerError extends Error {
  public retryAfter: number

  constructor(message: string, retryAfter: number) {
    super(message)
    this.name = 'CircuitBreakerError'
    this.retryAfter = retryAfter
  }
}

/**
 * 为AI服务创建专用的熔断器实例
 */
export const aiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // 连续3次失败开启熔断
  timeout: 120000, // 2分钟后尝试恢复
  halfOpenRequests: 2,
  successThreshold: 0.5,
})

/**
 * 检查是否为速率限制错误
 */
export function isRateLimitError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false
  }

  const err = error as Record<string, unknown>
  const message = String(err?.message ?? '')

  return (
    err?.status === 429 ||
    err?.code === '1302' ||
    message.includes('429') ||
    message.includes('并发数过高') ||
    message.includes('rate limit') ||
    message.includes('速率限制')
  )
}

/**
 * 检查是否为超时错误
 */
export function isTimeoutError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false
  }

  const err = error as Record<string, unknown>
  const message = String(err?.message ?? '')
  const name = String(err?.name ?? '')

  return (
    message.includes('超时') ||
    message.includes('timeout') ||
    name === 'TimeoutError'
  )
}
