# 每日热点新闻播报应用

一个自动聚合每日热点新闻并生成播客风格播报的Web应用。

## 功能特性

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

## 快速开始

### 本地开发

1. 克隆仓库:
```bash
git clone https://github.com/jrjgit/news.git
cd news
```

2. 安装依赖:
```bash
npm install
```

3. 配置环境变量:
创建 `.env` 文件并添加以下内容:

**必需配置:**
```env
# 数据库
POSTGRES_URL=postgresql://user:password@localhost:5432/news_db

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

**AI服务配置（选择一个）:**
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

4. 初始化数据库:
```bash
npm run db:generate
npm run db:push
```

5. 启动开发服务器:
```bash
npm run dev
```

6. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 部署到Vercel

### 1. 准备工作

- 将代码推送到GitHub仓库
- 创建Vercel账号（使用GitHub登录）

### 2. 创建Vercel Postgres数据库

1. 在Vercel项目中，进入 **Storage** 标签
2. 点击 **Create Database** → 选择 **Postgres**
3. 创建后复制 `POSTGRES_URL` 到环境变量

### 3. 创建Vercel Blob存储

1. 在 **Storage** 标签，点击 **Create Database** → 选择 **Blob**
2. 创建后复制 `BLOB_READ_WRITE_TOKEN` 到环境变量

### 4. 配置环境变量

在Vercel项目设置中添加以下环境变量:

**必需配置:**
```
POSTGRES_URL=postgresql://user:password@host:5432/dbname
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxx
EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural
RSS_SOURCES_DOMESTIC=https://www.36kr.com/feed,https://www.cnbeta.com/backend.php,https://www.zhihu.com/rss
RSS_SOURCES_INTERNATIONAL=https://feeds.bbci.co.uk/news/world/rss.xml,https://feeds.npr.org/1001/rss.xml,https://www.theguardian.com/world/rss
NEWS_COUNT_DOMESTIC=15
NEWS_COUNT_INTERNATIONAL=10
DATA_RETENTION_DAYS=3
```

**AI服务配置（选择一个）:**
```
AI_SERVICE_PROVIDER=zhipu
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_MODEL=glm-4.6
```

### 6. 部署

Vercel会自动检测Next.js项目并配置部署。点击 **Deploy** 按钮即可。

## 可用脚本

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 生成Prisma客户端
npm run db:generate

# 推送数据库架构
npm run db:push

# 创建数据库迁移
npm run db:migrate

# 打开Prisma Studio
npm run db:studio

# 手动执行新闻同步
npm run sync
```

## 项目结构

```
news/
├── app/                    # Next.js应用目录
│   ├── api/               # API路由
│   │   ├── news/          # 新闻API
│   │   └── sync/          # 同步API
│   ├── news/              # 新闻详情页
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── AudioPlayer.tsx    # 音频播放器
│   ├── NewsCard.tsx       # 新闻卡片
│   ├── Header.tsx         # 页面头部
│   ├── SearchBar.tsx      # 搜索栏
│   └── FilterPanel.tsx    # 筛选面板
├── lib/                   # 工具库
│   ├── ai-service.ts      # AI服务抽象层
│   ├── ai-providers/      # AI适配器
│   │   ├── base.ts        # 基础适配器
│   │   ├── openai-adapter.ts
│   │   ├── deepseek-adapter.ts
│   │   ├── zhipu-adapter.ts
│   │   └── local-adapter.ts
│   ├── db.ts              # 数据库连接
│   ├── rss-parser.ts      # RSS解析器
│   ├── news-generator.ts  # 新闻生成器
│   └── tts.ts             # 语音合成
├── cron/                  # 定时任务
│   └── sync-news.ts       # 新闻同步任务
├── prisma/               # Prisma配置
│   └── schema.prisma     # 数据库模型
└── public/               # 静态资源
    └── audio/            # 音频文件存储
```

## 环境变量说明

### 基础配置
| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| POSTGRES_URL | PostgreSQL连接字符串 | ✅ | - |
| BLOB_READ_WRITE_TOKEN | Vercel Blob存储Token | ✅ | - |
| EDGE_TTS_VOICE | Edge TTS语音名称 | ❌ | zh-CN-XiaoxiaoNeural |
| RSS_SOURCES_DOMESTIC | 国内新闻RSS源（逗号分隔） | ❌ | 36kr,cnbeta,zhihu |
| RSS_SOURCES_INTERNATIONAL | 国际新闻RSS源（逗号分隔） | ❌ | bbc,npr,guardian |
| NEWS_COUNT_DOMESTIC | 国内新闻数量 | ❌ | 15 |
| NEWS_COUNT_INTERNATIONAL | 国际新闻数量 | ❌ | 10 |
| DATA_RETENTION_DAYS | 数据保留天数 | ❌ | 3 |

### AI服务配置
| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| AI_SERVICE_PROVIDER | AI服务提供商 | ❌ | openai |
| ZHIPU_API_KEY | 智谱AI API密钥 | ❌ | - |
| ZHIPU_MODEL | 智谱AI模型名称 | ❌ | glm-4.6 |
| OPENAI_API_KEY | OpenAI API密钥 | ❌ | - |
| OPENAI_MODEL | OpenAI模型名称 | ❌ | gpt-4 |
| DEEPSEEK_API_KEY | DeepSeek API密钥 | ❌ | - |
| DEEPSEEK_MODEL | DeepSeek模型名称 | ❌ | deepseek-chat |
| LOCAL_MODEL_BASE_URL | 本地模型API地址 | ❌ | http://localhost:11434 |
| LOCAL_MODEL_MODEL | 本地模型名称 | ❌ | llama2 |

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

## 注意事项

1. **Edge TTS**: 使用 Microsoft Edge 在线 TTS 服务，无需配置密钥
2. **Cron Jobs**: Vercel Cron Jobs每天最多执行一次
3. **音频文件**: 使用Blob存储，自动清理3天前的文件
4. **数据库**: Vercel Postgres自动备份，无需手动管理
5. **AI服务**: 需要配置AI服务提供商和API密钥才能使用AI功能（摘要、翻译、重要性评估）
6. **新闻去重**: 使用Levenshtein距离算法自动去重相似新闻
7. **收藏功能**: 收藏数据保存在浏览器localStorage中

## 使用说明

### 前端使用

1. **浏览新闻**:
   - 访问首页查看今日新闻
   - 使用日期选择器查看历史新闻
   - 点击新闻卡片查看详情

2. **搜索新闻**:
   - 在搜索框输入关键词
   - 支持搜索标题、内容、摘要

3. **筛选新闻**:
   - 按分类筛选（全部/国内/国际）
   - 按重要性排序（1-5星）
   - 按时间排序（创建时间/新闻日期）

4. **收藏新闻**:
   - 点击新闻卡片的收藏按钮
   - 点击顶部收藏按钮查看收藏列表
   - 收藏数据保存在本地

5. **手动同步**:
   - 点击顶部的"手动同步"按钮
   - 等待同步完成（约5-10秒）
   - 新闻列表自动更新

### API使用

```bash
# 获取新闻列表
GET /api/news?date=2026-01-20&sortBy=importance&order=desc

# 获取新闻详情
GET /api/news/1

# 手动同步
POST /api/sync
```

## AI服务提供商

本项目支持多种AI服务提供商，可根据需求选择：

### 1. 智谱AI (推荐)
- **模型**: GLM-4.6
- **优点**: 中文理解能力强，价格实惠，国内访问稳定
- **获取API密钥**: https://open.bigmodel.cn/
- **配置**: `AI_SERVICE_PROVIDER=zhipu`

### 2. DeepSeek
- **模型**: DeepSeek-Chat
- **优点**: 性价比高，支持长文本
- **获取API密钥**: https://platform.deepseek.com/
- **配置**: `AI_SERVICE_PROVIDER=deepseek`

### 3. OpenAI
- **模型**: GPT-4 / GPT-3.5
- **优点**: 能力最强，生态完善
- **获取API密钥**: https://platform.openai.com/
- **配置**: `AI_SERVICE_PROVIDER=openai`

### 4. 本地模型 (Ollama)
- **模型**: Llama2 / 其他开源模型
- **优点**: 完全免费，数据隐私
- **部署**: 需要本地安装Ollama
- **配置**: `AI_SERVICE_PROVIDER=local`

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 Issue 或联系作者。