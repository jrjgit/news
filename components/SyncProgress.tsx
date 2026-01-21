import { useState } from 'react'

interface Step {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: string
  error?: string
}

export default function SyncProgress({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [steps, setSteps] = useState<Step[]>([
    { name: '获取新闻并生成摘要', status: 'pending' },
    { name: '翻译和评估重要性', status: 'pending' },
    { name: '生成播报脚本和音频', status: 'pending' },
    { name: '保存到数据库', status: 'pending' },
  ])
  const [currentStep, setCurrentStep] = useState(0)

  const runStep = async (stepIndex: number) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[stepIndex].status = 'running'
      return newSteps
    })

    const startTime = Date.now()

    try {
      const response = await fetch(`/api/sync/step${stepIndex + 1}`, {
        method: 'POST',
      })

      const data = await response.json()
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      setSteps(prev => {
        const newSteps = [...prev]
        newSteps[stepIndex].status = data.success ? 'completed' : 'failed'
        newSteps[stepIndex].duration = `${duration}秒`
        if (!data.success) {
          newSteps[stepIndex].error = data.error || data.message
        }
        return newSteps
      })

      if (data.success) {
        // 如果步骤1已完成，说明今日已同步
        if (data.completed) {
          onComplete()
          return
        }

        // 继续执行下一步
        if (stepIndex < steps.length - 1) {
          setCurrentStep(stepIndex + 1)
          setTimeout(() => runStep(stepIndex + 1), 1000)
        } else {
          onComplete()
        }
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      setSteps(prev => {
        const newSteps = [...prev]
        newSteps[stepIndex].status = 'failed'
        newSteps[stepIndex].duration = `${duration}秒`
        newSteps[stepIndex].error = error instanceof Error ? error.message : '未知错误'
        return newSteps
      })
    }
  }

  const startSync = () => {
    setCurrentStep(0)
    runStep(0)
  }

  const retryStep = (stepIndex: number) => {
    runStep(stepIndex)
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
          <h2 className="text-xl font-bold text-white">新闻同步进度</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={steps.some(s => s.status === 'running')}
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
              </div>
              {step.status === 'failed' && (
                <button
                  onClick={() => retryStep(index)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  重试
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          {!allCompleted && !hasFailed && currentStep === 0 && steps[0].status === 'pending' && (
            <button
              onClick={startSync}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              开始同步
            </button>
          )}
          {hasFailed && (
            <button
              onClick={() => {
                setSteps(steps.map(s => ({ ...s, status: 'pending' as const, duration: undefined, error: undefined })))
                setCurrentStep(0)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              重新开始
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