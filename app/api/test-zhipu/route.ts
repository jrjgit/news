import { NextRequest, NextResponse } from 'next/server'

/**
 * 智谱AI连接测试API
 * 用于在Vercel服务器环境测试智谱AI连接
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const results: any[] = []

  try {
    const apiKey = process.env.ZHIPU_API_KEY
    const model = process.env.ZHIPU_MODEL || 'glm-4.6'

    // 1. 检查环境变量
    results.push({
      step: 1,
      name: '检查环境变量',
      status: apiKey ? '✅ 通过' : '❌ 失败',
      details: {
        ZHIPU_API_KEY: apiKey ? `已配置 (长度: ${apiKey.length})` : '未配置',
        ZHIPU_MODEL: model,
      },
    })

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'ZHIPU_API_KEY 未配置',
        results,
        duration: Date.now() - startTime,
      }, { status: 400 })
    }

    // 2. 测试网络连接
    results.push({
      step: 2,
      name: '测试网络连接',
      status: '⏳ 进行中',
      details: {
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      },
    })

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(10000), // 10秒超时
      })

      const responseTime = Date.now() - startTime

      results[1].status = response.ok ? '✅ 通过' : '❌ 失败'
      results[1].details = {
        ...results[1].details,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        responseTime: `${responseTime}ms`,
      }

      if (response.ok) {
        const data = await response.json()
        results.push({
          step: 3,
          name: '解析响应',
          status: '✅ 通过',
          details: {
            model: data.model,
            response: data.choices?.[0]?.message?.content,
            usage: data.usage,
          },
        })

        return NextResponse.json({
          success: true,
          message: '智谱AI连接测试成功！',
          results,
          duration: Date.now() - startTime,
        })
      } else {
        const text = await response.text()
        let errorData
        try {
          errorData = JSON.parse(text)
        } catch (e) {
          errorData = { raw: text }
        }

        results.push({
          step: 3,
          name: '错误详情',
          status: '❌ 失败',
          details: errorData,
        })

        // 根据错误类型提供建议
        let suggestion = ''
        if (response.status === 401) {
          suggestion = 'API密钥无效或未授权，请检查: https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys'
        } else if (response.status === 403) {
          suggestion = 'API密钥权限不足或已禁用'
        } else if (response.status === 429) {
          suggestion = '超出API调用频率限制，请检查额度: https://open.bigmodel.cn/usercenter/billing'
        } else if (response.status >= 500) {
          suggestion = '智谱AI服务暂时不可用，请稍后重试'
        }

        return NextResponse.json({
          success: false,
          message: '智谱AI连接测试失败',
          results,
          suggestion,
          duration: Date.now() - startTime,
        }, { status: response.status })
      }
    } catch (error: any) {
      results[1].status = '❌ 失败'
      results[1].details = {
        error: error.message,
        name: error.name,
      }

      let suggestion = ''
      if (error.name === 'AbortError') {
        suggestion = '请求超时，可能是网络问题或服务响应慢'
      } else if (error.code === 'ENOTFOUND') {
        suggestion = 'DNS解析失败，无法访问 open.bigmodel.cn'
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        suggestion = '网络连接超时或被拒绝'
      }

      return NextResponse.json({
        success: false,
        message: '网络连接失败',
        results,
        suggestion,
        duration: Date.now() - startTime,
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '测试过程中发生错误',
      error: error.message,
      results,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}