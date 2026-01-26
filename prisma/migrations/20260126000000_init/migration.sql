-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "translated_content" TEXT,
    "original_link" TEXT,
    "source" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "importance" INTEGER DEFAULT 3,
    "news_date" TIMESTAMP(3) NOT NULL,
    "audio_url" TEXT,
    "script" TEXT,
    "audioGenerated" BOOLEAN NOT NULL DEFAULT false,
    "audioTaskId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "sync_date" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL,
    "news_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_tasks" (
    "id" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "audioUrl" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "currentChunk" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_chunks" (
    "id" TEXT NOT NULL,
    "audioTaskId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_news_date_idx" ON "news"("news_date");

-- CreateIndex
CREATE INDEX "news_category_idx" ON "news"("category");

-- CreateIndex
CREATE INDEX "news_importance_idx" ON "news"("importance");

-- CreateIndex
CREATE INDEX "news_audioTaskId_idx" ON "news"("audioTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_logs_sync_date_key" ON "sync_logs"("sync_date");

-- CreateIndex
CREATE INDEX "audio_tasks_status_idx" ON "audio_tasks"("status");

-- CreateIndex
CREATE INDEX "audio_tasks_date_idx" ON "audio_tasks"("date");

-- CreateIndex
CREATE INDEX "audio_tasks_createdAt_idx" ON "audio_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "audio_chunks_audioTaskId_idx" ON "audio_chunks"("audioTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "audio_chunks_audioTaskId_chunkIndex_key" ON "audio_chunks"("audioTaskId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "audio_chunks" ADD CONSTRAINT "audio_chunks_audioTaskId_fkey" FOREIGN KEY ("audioTaskId") REFERENCES "audio_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;