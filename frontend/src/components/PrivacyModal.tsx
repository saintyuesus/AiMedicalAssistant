import { useState } from 'react'
import { X, ShieldCheck, Download, Trash2, Lock, Database, Eye } from 'lucide-react'
import { exportUserData, wipeAllData } from '../storage'

interface PrivacyModalProps {
  onClose: () => void
}

export function PrivacyModal({ onClose }: PrivacyModalProps) {
  const [wiped, setWiped] = useState(false)

  const handleExport = () => {
    const data = exportUserData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleWipe = () => {
    if (!confirm('确定要删除所有本地数据吗？此操作不可恢复。')) return
    wipeAllData()
    setWiped(true)
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-2xl animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">隐私与合规</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-medium text-slate-200">数据存储说明</h3>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-slate-400">
              <li>• 健康档案与对话历史<strong className="text-slate-200">仅保存在您的浏览器本地</strong>（localStorage）</li>
              <li>• 语音识别使用浏览器内置能力，<strong className="text-slate-200">音频不上传</strong></li>
              <li>• 上传的图片仅用于本次分析，<strong className="text-slate-200">不做持久化存储</strong></li>
              <li>• 遵循<strong className="text-slate-200">数据最小化</strong>原则，仅收集功能必需信息</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-medium text-slate-200">您的数据权利</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-slate-200 transition hover:border-brand-500/30"
              >
                <Download className="h-4 w-4 text-brand-400" />
                导出我的数据
              </button>
              <button
                onClick={handleWipe}
                disabled={wiped}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {wiped ? '已删除' : '删除全部数据'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="text-xs leading-relaxed text-amber-100/90">
                <strong className="text-amber-200">合规依据：</strong>
                本产品遵循《个人信息保护法》《数据安全法》《互联网诊疗管理办法》相关规定。
                所有 AI 内容均带医疗免责声明，不构成诊断。
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          我已了解
        </button>
      </div>
    </div>
  )
}
