import { AlertTriangle, ShieldCheck } from 'lucide-react'

interface ComplianceBannerProps {
  variant?: 'inline' | 'page'
}

export function ComplianceBanner({ variant = 'inline' }: ComplianceBannerProps) {
  if (variant === 'page') {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-sm text-amber-100/90">
            <div className="font-semibold text-amber-200">医疗免责声明</div>
            <p className="mt-1 leading-relaxed">
              本产品为<strong>健康辅助工具</strong>，AI 生成的所有内容仅供参考，<strong>不构成医疗诊断、处方或治疗建议</strong>。
              如身体不适请及时就医，紧急情况请立即拨打 <strong>120</strong>。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-ink-800/60 px-3 py-1 text-[11px] text-slate-400">
      <ShieldCheck className="h-3 w-3 text-brand-400" />
      <span>内容仅供参考，不构成医疗诊断，不适请及时就医</span>
    </div>
  )
}
