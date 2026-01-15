# 每日热点新闻播报应用

一个自动聚合每日热点新闻并生成播客风格播报的Web应用。

## 功能特性

- 📰 **自动新闻聚合**: 每日自动抓取昨日热点新闻（国内7条、国际3条）
- 🎙️ **播客风格播报**: 将新闻内容转换为口语化的播报文案
- 🔊 **AI语音合成**: 使用Azure TTS生成磁性女声播报
- ⏰ **定时更新**: 每天凌晨2点自动执行更新任务
- 🎨 **美观界面**: 现代化深色主题UI设计，支持音频播放和原文阅读
- 📱 **响应式设计**: 完美支持桌面和移动设备
- 💾 **数据管理**: 自动保留最近3天的数据

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Vercel Postgres (PostgreSQL) + Prisma ORM
- **定时任务**: Vercel Cron Jobs
- **RSS解析**: rss-parser
- **语音合成**: Azure Cognitive Services Speech SDK
- **存储**: Vercel Blob

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
```env
POSTGRES_URL=postgresql://user:password@localhost:5432/news_db
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia
AZURE_VOICE_NAME=zh-CN-XiaoxiaoNeural
RSS_SOURCES_DOMESTIC=https://www.people.com.cn/rss/politics.xml,https://www.xinhuanet.com/rss/news.xml
RSS_SOURCES_INTERNATIONAL=https://www.bbc.com/rss/news
DATA_RETENTION_DAYS=3
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

### 4. 获取Azure TTS密钥

1. 访问 [Azure Portal](https://portal.azure.com)
2. 创建 **Speech Service** 资源
3. 复制密钥和区域到环境变量

### 5. 配置环境变量

在Vercel项目设置中添加以下环境变量:

```
POSTGRES_URL=postgresql://user:password@host:5432/dbname
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxx
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia
AZURE_VOICE_NAME=zh-CN-XiaoxiaoNeural
RSS_SOURCES_DOMESTIC=https://www.people.com.cn/rss/politics.xml,https://www.xinhuanet.com/rss/news.xml
RSS_SOURCES_INTERNATIONAL=https://www.bbc.com/rss/news
DATA_RETENTION_DAYS=3
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
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── AudioPlayer.tsx    # 音频播放器
│   ├── NewsCard.tsx       # 新闻卡片
│   └── Header.tsx         # 页面头部
├── lib/                   # 工具库
│   ├── db.ts             # 数据库连接
│   ├── rss-parser.ts     # RSS解析器
│   ├── news-generator.ts # 播报文案生成
│   └── tts.ts            # 语音合成
├── cron/                  # 定时任务
│   └── sync-news.ts      # 新闻同步任务
├── prisma/               # Prisma配置
│   └── schema.prisma     # 数据库模型
└── public/               # 静态资源
    └── audio/            # 音频文件存储
```

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| POSTGRES_URL | PostgreSQL连接字符串 | ✅ |
| BLOB_READ_WRITE_TOKEN | Vercel Blob存储Token | ✅ |
| AZURE_SPEECH_KEY | Azure Speech Service密钥 | ✅ |
| AZURE_SPEECH_REGION | Azure区域（如eastasia） | ✅ |
| AZURE_VOICE_NAME | TTS语音名称 | ❌ |
| RSS_SOURCES_DOMESTIC | 国内新闻RSS源 | ❌ |
| RSS_SOURCES_INTERNATIONAL | 国际新闻RSS源 | ❌ |
| DATA_RETENTION_DAYS | 数据保留天数 | ❌ |

## 免费额度

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| Vercel Postgres | 500MB存储 | 足够存储新闻数据 |
| Vercel Blob | 500GB存储 | 足够存储音频文件 |
| Azure TTS | 5小时/月免费 | 每天约10分钟播报 |
| Vercel Functions | 100GB带宽/月 | 足够个人使用 |

## 注意事项

1. **Azure TTS免费额度**: 每月5小时，如果超出会产生费用
2. **Cron Jobs**: Vercel Cron Jobs每天最多执行一次
3. **音频文件**: 使用Blob存储，自动清理3天前的文件
4. **数据库**: Vercel Postgres自动备份，无需手动管理

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 Issue 或联系作者。