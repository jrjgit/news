# 项目上下文文档

## 项目概述

这是一个**每日热点新闻播报应用**，使用 Next.js 构建，能够自动聚合每日热点新闻并生成播客风格的语音播报。

### 核心功能
- 📰 **智能新闻聚合**: 每日自动抓取昨日热点新闻（国内15条、国际10条）
- 🎙️ **AI播报脚本**: 使用大语言模型生成轻松有趣的播客风格文案
- 🔊 **AI语音合成**: 使用 Microsoft Edge TTS 生成高质量语音播报
- ⏰ **定时更新**: 每天凌晨2点自动执行更新任务
- 💾 **数据管理**: 自动保留最近3天的数据

### AI增强功能
- 🤖 **智能摘要**: AI自动生成新闻摘要（100字以内）
- 🌐 **自动翻译**: 国际新闻自动翻译为中文
- ⭐ **重要性评估**: AI智能评估新闻重要性（1-5星）
- 🎯 **多AI支持**: 支持 OpenAI、DeepSeek、智谱AI、本地模型

### 用户体验
- 🔍 **智能搜索**: 支持标题、内容、摘要全文搜索
- 🎚️ **多维筛选**: 按分类、重要性、时间筛选排序
- ❤️ **收藏功能**: 本地持久化收藏新闻
- 📱 **响应式设计**: 完美支持桌面和移动设备
- 🎨 **美观界面**: 现代化深色主题，玻璃态设计，流畅动画

## 技术栈

### 前端
- **框架**: Next.js 16.1.2 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **UI**: React 19.2.3

### 后端
- **API**: Next.js API Routes
- **数据库**: Vercel Postgres (PostgreSQL) + Prisma ORM 7.2.0
- **定时任务**: Vercel Cron Jobs
- **RSS解析**: rss-parser 3.13.0

### AI服务
- **OpenAI**: GPT-4 / GPT-3.5
- **DeepSeek**: DeepSeek-Chat
- **智谱AI**: GLM-4.6
- **本地模型**: Ollama (可选)

### 语音合成
- **TTS**: Microsoft Edge TTS (edge-tts-universal)
- **SDK**: Microsoft Cognitive Services Speech SDK

### 存储
- **数据库**: Vercel Postgres
- **文件存储**: Vercel Blob
- **本地存储**: localStorage (收藏功能)

## 项目结构

```
news/
├── app/                    # Next.js应用目录
│   ├── api/               # API路由
│   │   ├── news/          # 新闻API
│   │   │   ├── route.ts   # 获取新闻列表
│   │   │   └── [id]/      # 获取新闻详情
│   │   ├── sync/          # 同步API
│   │   │   ├── route.ts   # 手动触发同步
│   │   │   ├── all/       # 同步所有新闻
│   │   │   ├── cleanup/   # 清理旧数据
│   │   │   ├── cron/      # Cron任务入口
│   │   │   ├── status/    # 同步状态
│   │   │   └── trigger/   # 触发任务
│   │   ├── audio/         # 音频API
│   │   │   ├── process/   # 处理音频生成
│   │   │   └── status/    # 音频状态查询
│   │   ├── test/          # 测试API
│   │   ├── debug/         # 调试API
│   │   └── migrate/       # 数据库迁移
│   ├── news/              # 新闻详情页
│   │   └── [id]/page.tsx
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── AudioPlayer.tsx    # 音频播放器
│   ├── NewsCard.tsx       # 新闻卡片
│   ├── Header.tsx         # 页面头部
│   ├── SearchBar.tsx      # 搜索栏
│   ├── FilterPanel.tsx    # 筛选面板
│   └── SyncProgress.tsx   # 同步进度
├── lib/                   # 工具库
│   ├── ai-service.ts      # AI服务抽象层
│   ├── ai-providers/      # AI适配器
│   │   ├── base.ts        # 基础适配器接口
│   │   ├── openai-adapter.ts
│   │   ├── deepseek-adapter.ts
│   │   ├── zhipu-adapter.ts
│   │   └── local-adapter.ts
│   ├── db.ts              # 数据库连接
│   ├── rss-parser.ts      # RSS解析器
│   ├── news-generator.ts  # 新闻生成器
│   ├── tts.ts             # 语音合成
│   ├── config.ts          # 全局配置
│   ├── circuit-breaker.ts # 熔断器
│   ├── rate-limiter.ts    # 速率限制器
│   ├── job-queue.ts       # 任务队列
│   └── audio-queue.ts     # 音频任务队列
├── cron/                  # 定时任务
│   └── sync-news.ts       # 新闻同步任务
├── prisma/               # Prisma配置
│   ├── schema.prisma     # 数据库模型
│   └── migrations/       # 数据库迁移
├── public/               # 静态资源
├── worker.ts             # Worker进程入口
└── package.json          # 项目配置
```

## 构建和运行

### 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:generate
npm run db:push

# 启动开发服务器
npm run dev
```

### 构建生产版本

```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
```

### 数据库操作

```bash
# 生成Prisma客户端
npm run db:generate

# 推送数据库架构
npm run db:push

# 创建数据库迁移
npm run db:migrate

# 打开Prisma Studio
npm run db:studio
```

### 其他命令

```bash
# 手动执行新闻同步
npm run sync

# 测试智谱AI连接
npm run test-zhipu

# 启动Worker进程
npm run worker
```

### Vercel Cron 任务

项目配置了 Vercel Cron Jobs，每天凌晨2点（UTC时间）自动执行新闻同步任务。

Cron 表达式：`0 2 * * *`（每天凌晨2点）

## 开发规范

### 代码风格
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规范（配置文件：`eslint.config.mjs`）
- 使用函数组件和 React Hooks
- 遵循 Next.js App Router 最佳实践

### 目录结构规范
- **app/**: Next.js 应用目录，包含页面和API路由
- **components/**: 可复用的React组件
- **lib/**: 工具库和业务逻辑
- **cron/**: 定时任务脚本
- **prisma/**: 数据库相关配置

### API路由规范
- RESTful API设计
- 统一响应格式：`{ success: boolean, data?: any, error?: string }`
- 使用 Prisma 进行数据库操作
- 错误处理和日志记录

### 数据库规范
- 使用 Prisma ORM
- 数据库模型定义在 `prisma/schema.prisma`
- 使用迁移管理数据库变更
- 主要数据表：
  - `News`: 新闻数据（标题、内容、摘要、翻译、重要性等）
  - `SyncLog`: 同步日志（同步日期、状态、新闻数量等）

### AI服务规范
- 使用抽象层 `AIService` 统一接口
- 支持多种AI提供商（OpenAI、DeepSeek、智谱AI、本地模型）
- 实现熔断器模式防止级联失败
- 实现速率限制器防止API限流
- 批量处理时控制并发数（默认5个并发）

### 配置管理
- 环境变量配置在 `.env` 文件
- 全局配置在 `lib/config.ts`
- AI配置：
  - 请求延迟：2000ms
  - 请求超时：60000ms
  - 批量数量：8
  - 最大重试：4次
  - 速率限制：10请求/分钟（glm-4v并发10个）

### 错误处理
- 使用 try-catch 捕获异常
- 记录详细的错误日志
- 提供友好的错误提示
- 实现重试机制和熔断器

### 测试规范
- 使用 Vercel Postgres 进行数据库测试
- 使用测试API验证功能
- 测试智谱AI连接：`npm run test-zhipu`

## 环境变量

### 必需配置

```env
# 数据库
POSTGRES_URL=postgresql://user:password@host:5432/dbname

# Blob存储
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxx

# RSS源
RSS_SOURCES_DOMESTIC=https://www.36kr.com/feed,https://www.cnbeta.com/backend.php,https://www.zhihu.com/rss
RSS_SOURCES_INTERNATIONAL=https://feeds.bbci.co.uk/news/world/rss.xml,https://feeds.npr.org/1001/rss.xml,https://www.theguardian.com/world/rss

# 新闻数量
NEWS_COUNT_DOMESTIC=15
NEWS_COUNT_INTERNATIONAL=10

# TTS配置
EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 数据保留
DATA_RETENTION_DAYS=3
```

### AI服务配置（选择一个）

```env
# AI服务提供商（openai | deepseek | zhipu | local）
AI_SERVICE_PROVIDER=zhipu

# 智谱AI配置
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_MODEL=glm-4.6

# OpenAI配置（如果使用OpenAI）
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# DeepSeek配置（如果使用DeepSeek）
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat

# 本地模型配置（如果使用Ollama）
LOCAL_MODEL_BASE_URL=http://localhost:11434
LOCAL_MODEL_MODEL=llama2
```

### AI功能开关

```env
AI_ENABLE_SUMMARY=true
AI_ENABLE_TRANSLATION=true
AI_ENABLE_IMPORTANCE=true
```

## 关键API端点

### 新闻API
- `GET /api/news` - 获取新闻列表
  - 参数：`date`, `sortBy`, `order`, `category`
- `GET /api/news/[id]` - 获取新闻详情

### 同步API
- `POST /api/sync` - 手动触发同步
- `GET /api/sync/status` - 获取同步状态
- `GET /api/sync/status/[id]` - 获取特定任务状态
- `POST /api/sync/cron` - Cron任务入口
- `POST /api/sync/trigger` - 触发任务
- `POST /api/sync/all` - 同步所有新闻
- `POST /api/sync/cleanup` - 清理旧数据

### 音频API
- `GET /api/audio/status` - 获取音频状态
- `POST /api/audio/status` - 触发音频生成
- `POST /api/audio/process` - 处理音频生成

### 测试API
- `POST /api/test/ai` - 测试AI服务
- `POST /api/test-zhipu` - 测试智谱AI连接

### 调试API
- `GET /api/diagnostic` - 诊断信息
- `POST /api/debug/sync-data` - 调试同步数据
- `GET /api/debug/translations` - 调试翻译

## 数据库模型

### News 表
```prisma
model News {
  id                Int      @id @default(autoincrement())
  title             String
  content           String
  summary           String?  @db.Text
  translatedContent String?  @map("translated_content") @db.Text
  originalLink      String?  @map("original_link")
  source            String
  category          Category
  importance        Int?     @default(3)
  newsDate          DateTime @map("news_date")
  audioUrl          String?  @map("audio_url")
  script            String?
  createdAt         DateTime @default(now()) @map("created_at")

  @@index([newsDate])
  @@index([category])
  @@index([importance])
  @@map("news")
}
```

### SyncLog 表
```prisma
model SyncLog {
  id           Int      @id @default(autoincrement())
  syncDate     DateTime @unique @map("sync_date")
  status       Status
  newsCount    Int      @default(0) @map("news_count")
  errorMessage String?  @map("error_message")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("sync_logs")
}
```

### 枚举类型
```prisma
enum Category {
  DOMESTIC
  INTERNATIONAL
}

enum Status {
  SUCCESS
  FAILED
  PARTIAL
  IN_PROGRESS
}
```

## 重要提示

### Edge TTS
- 使用 Microsoft Edge 在线 TTS 服务，无需配置密钥
- 音频文件存储在 Vercel Blob
- 自动清理3天前的音频文件

### Cron Jobs
- Vercel Cron Jobs每天最多执行一次
- 配置在 `vercel.json` 文件中
- 执行时间：每天凌晨2点（UTC）

### AI服务
- 需要配置AI服务提供商和API密钥才能使用AI功能
- 实现了熔断器和速率限制器
- 支持批量处理，控制并发数
- 失败时自动回退到模板模式

### 新闻去重
- 使用Levenshtein距离算法自动去重相似新闻
- 去重阈值：相似度大于80%

### 收藏功能
- 收藏数据保存在浏览器localStorage中
- 使用 `news-favorites` 键存储

### Worker进程
- 支持轮询模式和单次处理模式
- 使用 Vercel KV 作为任务队列
- 优先处理音频任务
- 支持优雅关闭

## 常见问题

### 如何切换AI服务提供商？
修改 `.env` 文件中的 `AI_SERVICE_PROVIDER` 环境变量，并配置对应的API密钥。

### 如何调整新闻数量？
修改 `.env` 文件中的 `NEWS_COUNT_DOMESTIC` 和 `NEWS_COUNT_INTERNATIONAL` 环境变量。

### 如何手动触发同步？
在首页点击"手动同步"按钮，或调用 `POST /api/sync` API。

### 如何查看同步日志？
使用 Prisma Studio：`npm run db:studio`，查看 `SyncLog` 表。

### 如何调试AI服务？
调用测试API：`POST /api/test/ai`，或使用 `npm run test-zhipu` 测试智谱AI连接。

### 如何部署到Vercel？
1. 推送代码到GitHub
2. 在Vercel创建项目并连接GitHub仓库
3. 配置环境变量
4. 部署项目

## 免费额度

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| Vercel Postgres | 500MB存储 | 足够存储新闻数据 |
| Vercel Blob | 500GB存储 | 足够存储音频文件 |
| Edge TTS | 完全免费 | 使用 Microsoft Edge 在线服务 |
| Vercel Functions | 100GB带宽/月 | 足够个人使用 |
| 智谱AI | 查看官网 | 新用户有免费额度 |
| DeepSeek | 查看官网 | 价格实惠 |
| 本地模型 | 完全免费 | 需要本地部署Ollama |

## 许可证

MIT License