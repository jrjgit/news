import { useState } from 'react'

interface Step {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: string
  error?: string
}

export default function SyncProgress({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [steps, setSteps] = useState<Step[]>([
    { name: '同步新闻数据', status: 'pending' },
  ])
  const [currentStep, setCurrentStep] = useState(0)
  const [syncResult, setSyncResult] = useState<{ newsGenerated: number; duration: string } | null>(null)

  const runSync = async () => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[0].status = 'running'
      return newSteps
    })

    const startTime = Date.now()

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
      })

      const data = await response.json()
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      setSteps(prev => {
        const newSteps = [...prev]
        if (response.ok && data.success) {
          newSteps[0].status = 'completed'
          newSteps[0].duration = `${duration}秒`
          setSyncResult({ newsGenerated: data.newsGenerated || 0, duration: `${duration}秒` })
        } else {
          newSteps[0].status = 'failed'
          newSteps[0].duration = `${duration}秒`
          newSteps[0].error = data.error || data.message || '同步失败'
        }
        return newSteps
      })

      if (response.ok && data.success) {
        setTimeout(() => {
          onComplete()
        }, 1500)
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      setSteps(prev => {
        const newSteps = [...prev]
        newSteps[0].status = 'failed'
        newSteps[0].duration = `${duration}秒`
        newSteps[0].error = error instanceof Error ? error.message : '未知错误'
        return newSteps
      })
    }
  }

  const getStatusIcon = (status: Step['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
      case 'running':
        return (
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        )
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'failed':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
    }
  }

  const allCompleted = steps.every(step => step.status === 'completed')
  const hasFailed = steps.some(step => step.status === 'failed')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">新闻同步</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={steps[0].status === 'running'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              {getStatusIcon(step.status)}
              <div className="flex-1">
                <div className="text-white font-medium">{step.name}</div>
                {step.duration && (
                  <div className="text-gray-400 text-sm">耗时: {step.duration}</div>
                )}
                {step.error && (
                  <div className="text-red-400 text-sm">{step.error}</div>
                )}
                {syncResult && (
                  <div className="text-green-400 text-sm">生成 {syncResult.newsGenerated} 条新闻</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          {!allCompleted && !hasFailed && steps[0].status === 'pending' && (
            <button
              onClick={runSync}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              开始同步
            </button>
          )}
          {hasFailed && (
            <button
              onClick={() => {
                setSteps(steps.map(s => ({ ...s, status: 'pending' as const, duration: undefined, error: undefined })))
                setSyncResult(null)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              重试
            </button>
          )}
          {allCompleted && (
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
