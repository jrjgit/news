import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的新闻ID',
        },
        { status: 400 }
      )
    }

    const news = await prisma.news.findUnique({
      where: { id },
    })

    if (!news) {
      return NextResponse.json(
        {
          success: false,
          error: '新闻不存在',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: news,
    })
  } catch (error) {
    console.error('获取新闻详情失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取新闻详情失败',
      },
      { status: 500 }
    )
  }
}