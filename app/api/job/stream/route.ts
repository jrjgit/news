// SSE 流式进度推送
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  
  if (!date) {
    return new Response('date required', { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastProgress = -1
      let attempts = 0
      const maxAttempts = 180 // 3分钟

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      while (attempts < maxAttempts) {
        try {
          const job = await prisma.syncJob.findUnique({ where: { date } })
          
          if (!job) {
            send({ status: 'waiting', progress: 0, message: '等待开始...' })
          } else {
            // 只在进度变化时发送
            if (job.progress !== lastProgress) {
              send({
                status: job.status.toLowerCase(),
                progress: job.progress,
                message: job.message,
                count: job.newsCount,
              })
              lastProgress = job.progress
            }

            if (job.status === 'COMPLETED' || job.status === 'FAILED') {
              send({ status: 'done', progress: job.progress, message: job.message })
              controller.close()
              return
            }
          }
        } catch (e) {
          send({ status: 'error', message: '查询失败' })
        }

        attempts++
        await new Promise(r => setTimeout(r, 1000))
      }

      send({ status: 'timeout', message: '监听超时' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
