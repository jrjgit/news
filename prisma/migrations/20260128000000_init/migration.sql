-- 极简初始化
CREATE TABLE IF NOT EXISTS "news" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK ("category" IN ('DOMESTIC', 'INTERNATIONAL')),
    "importance" INTEGER NOT NULL DEFAULT 3,
    "date" TEXT NOT NULL,
    "audioUrl" TEXT,
    "originalUrl" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sync_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "date" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'RUNNING' CHECK ("status" IN ('RUNNING', 'COMPLETED', 'FAILED')),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "newsCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "news_date_idx" ON "news"("date");
CREATE INDEX IF NOT EXISTS "news_category_idx" ON "news"("category");
