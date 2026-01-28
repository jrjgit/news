// 极简配置 - 专为 Serverless 优化
export const config = {
  // 新闻数量限制（控制总体时间）
  newsCount: {
    domestic: parseInt(process.env.NEWS_COUNT_DOMESTIC || '5'),
    international: parseInt(process.env.NEWS_COUNT_INTERNATIONAL || '3'),
  },

  // AI 配置（快速失败）
  ai: {
    timeout: 20000,      // 20s 超时
    maxRetries: 1,       // 只重试1次
    batchSize: 3,        // 小批量
    delay: 1000,         // 1s 间隔
  },

  // RSS 配置
  rss: {
    timeout: 8000,       // 8s 超时
    maxSources: 5,       // 最多5个源
  },

  // TTS 配置
  tts: {
    chunkSize: 300,      // 每段300字
    maxChunks: 10,       // 最多10段
  },

  // 数据保留
  retention: {
    days: parseInt(process.env.DATA_RETENTION_DAYS || '3'),
  },
}

// 快速睡眠
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
