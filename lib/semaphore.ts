/**
 * 信号量实现
 * 用于控制并发访问数量
 */

export class Semaphore {
  private permits: number
  private queue: Array<() => void> = []

  constructor(permits: number) {
    if (permits <= 0) {
      throw new Error('Permits must be greater than 0')
    }
    this.permits = permits
  }

  /**
   * 获取许可
   * 如果没有可用许可，则等待
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve)
    })
  }

  /**
   * 释放许可
   * 如果有等待的任务，则唤醒下一个
   */
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    } else {
      this.permits++
    }
  }

  /**
   * 获取当前可用许可数
   */
  availablePermits(): number {
    return this.permits
  }

  /**
   * 获取等待队列长度
   */
  queueLength(): number {
    return this.queue.length
  }
}

/**
 * 使用信号量执行异步函数
 * 自动获取和释放许可
 */
export async function withSemaphore<T>(
  semaphore: Semaphore,
  fn: () => Promise<T>
): Promise<T> {
  await semaphore.acquire()
  try {
    return await fn()
  } finally {
    semaphore.release()
  }
}