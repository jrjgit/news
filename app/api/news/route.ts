// 极简新闻查询
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const category = searchParams.get('category') as 'DOMESTIC' | 'INTERNATIONAL' | null

  const news = await prisma.news.findMany({
    where: {
      date,
      ...(category && { category }),
    },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    select: {
      id: true,
      title: true,
      summary: true,
      source: true,
      category: true,
      importance: true,
      audioUrl: true,
      audioUrls: true,
    },
  })

  return Response.json({ news, date })
}
