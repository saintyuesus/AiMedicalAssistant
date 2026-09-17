import { useState } from 'react'
import { ShieldCheck, Check, X } from 'lucide-react'

interface ConsentModalProps {
  onAccept: () => void
}

export function ConsentModal({ onAccept }: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-2xl animate-fade-in">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">隐私与数据使用告知</h2>
            <p className="text-xs text-slate-400">请在使用前仔细阅读以下条款</p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            本产品为<strong className="text-slate-100">健康辅助工具</strong>，所有 AI 生成内容仅供参考，
            <strong className="text-amber-300">不构成医疗诊断</strong>，请遵医嘱。
          </p>
          <div className="rounded-lg border border-white/5 bg-ink-900/60 p-3 space-y-1.5">
            <div className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>您的健康数据（症状、档案、对话）仅用于本次会话，<strong>本地存储</strong>于您的浏览器。</span>
            </div>
            <div className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>语音识别使用浏览器内置能力，<strong>音频不会上传</strong>到服务器。</span>
            </div>
            <div className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>上传的图片仅用于本次分析，<strong>不会被保存</strong>用于其他用途。</span>
            </div>
            <div className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>遵循<strong>最小化收集</strong>原则，您可随时导出或删除全部数据。</span>
            </div>
            <div className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>符合《个人信息保护法》《数据安全法》相关要求。</span>
            </div>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span className="text-sm text-slate-300">
            我已阅读并同意上述隐私条款，确认自愿使用本辅助工具，理解其不构成医疗诊断。
          </span>
        </label>

        <div className="mt-5 flex gap-3">
          <button
            disabled={!agreed}
            onClick={onAccept}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            同意并开始使用
          </button>
          <button
            onClick={() => window.close()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-white/5"
          >
            <X className="h-4 w-4" />
            拒绝
          </button>
        </div>
      </div>
    </div>
  )
}
