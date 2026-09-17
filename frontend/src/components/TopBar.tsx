import { MessageSquare, HeartPulse, Utensils, Hospital, Video, Menu, Cloud, CloudOff } from 'lucide-react'
import type { FeatureTab } from '../types'

interface TopBarProps {
  activeTab: FeatureTab
  onTabChange: (tab: FeatureTab) => void
  onToggleSidebar: () => void
  title: string
  llmEnabled: boolean
  chatModel: string | null
}

const TABS: { id: FeatureTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: '智能问诊', icon: MessageSquare },
  { id: 'health', label: '健康建议', icon: HeartPulse },
  { id: 'recipes', label: '健康食谱', icon: Utensils },
  { id: 'medical', label: '就医指引', icon: Hospital },
  { id: 'videos', label: '养生视频', icon: Video },
]

export function TopBar({ activeTab, onTabChange, onToggleSidebar, title, llmEnabled, chatModel }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-ink-900/80 px-3 backdrop-blur">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="mr-4 text-sm font-semibold text-white">{title}</h1>

      <nav className="flex items-center gap-1">
        {TABS.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </nav>

      <div
        className="ml-auto flex items-center gap-1.5 rounded-full border border-white/5 bg-ink-800/60 px-2.5 py-1 text-[11px]"
        title={llmEnabled ? `云端大模型已连接：${chatModel}` : '离线模式：使用内置知识库'}
      >
        {llmEnabled ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <Cloud className="h-3.5 w-3.5 text-brand-400" />
            <span className="hidden text-slate-300 md:inline">{chatModel}</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <CloudOff className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden text-slate-500 md:inline">离线模式</span>
          </>
        )}
      </div>
    </header>
  )
}
