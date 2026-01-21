/**
 * 智谱AI连接测试脚本
 * 用于诊断API连接问题
 */

const { ZHIPU_API_KEY, ZHIPU_MODEL } = process.env

console.log('=== 智谱AI连接测试 ===\n')

// 1. 检查环境变量
console.log('1. 检查环境变量:')
console.log(`   ZHIPU_API_KEY: ${ZHIPU_API_KEY ? '✅ 已配置 (长度: ' + ZHIPU_API_KEY.length + ')' : '❌ 未配置'}`)
console.log(`   ZHIPU_MODEL: ${ZHIPU_MODEL || '❌ 未配置 (将使用默认值 glm-4.6)'}\n`)

if (!ZHIPU_API_KEY) {
  console.log('❌ 错误: ZHIPU_API_KEY 未配置')
  console.log('请在环境变量中设置: ZHIPU_API_KEY=你的智谱API密钥')
  process.exit(1)
}

// 2. 测试网络连接
console.log('2. 测试网络连接...')
// Node.js 18+ 内置 fetch，无需额外安装

async function testConnection() {
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL || 'glm-4.6',
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

    console.log(`   HTTP状态码: ${response.status}`)

    const contentType = response.headers.get('content-type')
    console.log(`   Content-Type: ${contentType}`)

    const text = await response.text()
    console.log(`   响应内容: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`)

    if (response.ok) {
      const data = JSON.parse(text)
      console.log('✅ 连接成功!')
      console.log(`   模型: ${data.model}`)
      console.log(`   响应: ${data.choices?.[0]?.message?.content}`)
    } else {
      console.log('❌ 连接失败!')
      try {
        const errorData = JSON.parse(text)
        console.log(`   错误代码: ${errorData.error?.code}`)
        console.log(`   错误信息: ${errorData.error?.message}`)
      } catch (e) {
        console.log(`   错误详情: ${text}`)
      }

      // 根据错误类型提供建议
      if (response.status === 401) {
        console.log('\n💡 建议: API密钥无效或未授权')
        console.log('   请检查: https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys')
      } else if (response.status === 403) {
        console.log('\n💡 建议: API密钥权限不足或已禁用')
      } else if (response.status === 429) {
        console.log('\n💡 建议: 超出API调用频率限制')
        console.log('   请检查免费额度: https://open.bigmodel.cn/usercenter/billing')
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        console.log('\n💡 建议: 智谱AI服务暂时不可用，请稍后重试')
      }
    }
  } catch (error) {
    console.log('❌ 连接失败!')
    console.log(`   错误: ${error.message}`)

    if (error.name === 'AbortError') {
      console.log('\n💡 建议: 请求超时，可能是网络问题或服务响应慢')
      console.log('   请检查网络连接或稍后重试')
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 建议: DNS解析失败，无法访问 open.bigmodel.cn')
      console.log('   请检查网络连接或DNS设置')
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 建议: 网络连接超时或被拒绝')
      console.log('   请检查防火墙设置或网络连接')
    }
  }
}

testConnection()
  .then(() => {
    console.log('\n=== 测试完成 ===')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n=== 测试失败 ===')
    console.error(error)
    process.exit(1)
  })