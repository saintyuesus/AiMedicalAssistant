import { Plus, MessageSquare, Trash2, Settings, ShieldCheck, X } from 'lucide-react'
import type { Conversation } from '../types'
import { formatDate } from '../utils'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
  onOpenPrivacy: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenSettings,
  onOpenPrivacy,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Group conversations by date bucket
  const groups = new Map<string, Conversation[]>()
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  for (const c of sorted) {
    const label = formatDate(c.updatedAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(c)
  }

  return (
    <aside
      className={`flex h-full flex-col border-r border-white/5 bg-ink-900 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">康医助手</div>
            <div className="truncate text-[11px] text-slate-400">AI 医疗健康助手</div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          title={collapsed ? '展开' : '收起'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button
          onClick={onNew}
          className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-ink-750 hover:border-brand-500/40 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Plus className="h-4 w-4 shrink-0 text-brand-400" />
          {!collapsed && <span>新建会话</span>}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && !collapsed && (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            暂无历史会话
            <br />
            点击上方按钮开始问诊
          </div>
        )}
        {Array.from(groups.entries()).map(([label, items]) => (
          <div key={label} className="mb-3">
            {!collapsed && (
              <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {label}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    c.id === activeId
                      ? 'bg-brand-500/15 text-white ring-1 ring-brand-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={c.title}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-brand-400" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{c.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(c.id)
                        }}
                        className="opacity-0 transition group-hover:opacity-100"
                        title="删除会话"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="border-t border-white/5 p-2">
        <button
          onClick={onOpenSettings}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 ${
            collapsed ? 'justify-center' : ''
          }`}
          title="健康档案"
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-500" />
          {!collapsed && <span>健康档案</span>}
        </button>
        <button
          onClick={onOpenPrivacy}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 ${
            collapsed ? 'justify-center' : ''
          }`}
          title="隐私与合规"
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />
          {!collapsed && <span>隐私与合规</span>}
        </button>
      </div>
    </aside>
  )
}
