import { useState } from 'react'
import { HeartPulse, Loader2, RefreshCw } from 'lucide-react'
import type { HealthProfile } from '../types'
import { getHealthAdvice } from '../api'
import { marked } from 'marked'

interface HealthPanelProps {
  profile: HealthProfile
}

export function HealthPanel({ profile }: HealthPanelProps) {
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAdvice = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getHealthAdvice(profile)
      setAdvice(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const hasProfile = profile.conditions.length > 0 || profile.medications.length > 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
            <HeartPulse className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">基础病健康建议</h2>
            <p className="text-xs text-slate-500">基于您的健康档案生成个性化管理建议</p>
          </div>
        </div>

        {!hasProfile && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
            您还未完善健康档案。请先在「健康档案」中填写基础疾病、用药和过敏史，以获得更精准的建议。
          </div>
        )}

        {profile.conditions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {profile.conditions.map((c) => (
              <span key={c} className="rounded-full bg-ink-700 px-3 py-1 text-xs text-slate-300">
                {c}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={fetchAdvice}
          disabled={loading}
          className="mb-5 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {advice ? '重新生成建议' : '生成健康建议'}
        </button>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {advice && (
          <div
            className="prose-medical rounded-xl border border-white/5 bg-ink-800/50 p-5 text-slate-300"
            dangerouslySetInnerHTML={{ __html: marked.parse(advice) as string }}
          />
        )}

        {!advice && !loading && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            点击上方按钮，获取针对您基础病的生活方式、监测与用药建议
          </div>
        )}
      </div>
    </div>
  )
}
