import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // 验证是否在生产环境或允许的环境
    if (process.env.NODE_ENV === 'production') {
      // 在生产环境中，你可能需要添加额外的安全检查
      // 例如：验证请求头中的 API 密钥
    }

    console.log('开始运行数据库迁移...')

    // 运行 Prisma 迁移
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')

    if (stderr) {
      console.error('迁移错误:', stderr)
    }

    console.log('迁移输出:', stdout)

    return NextResponse.json({
      success: true,
      message: '数据库迁移成功',
      output: stdout,
    })
  } catch (error) {
    console.error('迁移失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '数据库迁移失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}