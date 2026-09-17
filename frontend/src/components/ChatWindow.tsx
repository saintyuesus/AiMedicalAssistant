import { useEffect, useRef } from 'react'
import { Sparkles, Stethoscope, HeartPulse, Utensils, Hospital, FileImage } from 'lucide-react'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ComplianceBanner } from './ComplianceBanner'

interface ChatWindowProps {
  messages: Message[]
  streamingId: string | null
  onSend: (text: string, images: string[]) => void
  onStop: () => void
  onSpeak: (text: string) => void
  speaking: boolean
  onStopSpeak: () => void
  onQuickPrompt: (text: string) => void
}

const QUICK_PROMPTS = [
  { icon: Stethoscope, label: '我最近头痛，可能是什么原因？', color: 'text-brand-400' },
  { icon: HeartPulse, label: '高血压患者日常应该注意什么？', color: 'text-rose-400' },
  { icon: Utensils, label: '给我推荐一份控糖食谱', color: 'text-amber-400' },
  { icon: Hospital, label: '咳嗽两周了，该挂什么科？', color: 'text-sky-400' },
]

export function ChatWindow({
  messages,
  streamingId,
  onSend,
  onStop,
  onSpeak,
  speaking,
  onStopSpeak,
  onQuickPrompt,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <WelcomeScreen onQuickPrompt={onQuickPrompt} />
        ) : (
          <div className="mx-auto max-w-3xl py-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={streamingId === m.id}
                onSpeak={onSpeak}
                speaking={speaking}
                onStopSpeak={onStopSpeak}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} onStop={onStop} streaming={!!streamingId} />
    </div>
  )
}

function WelcomeScreen({ onQuickPrompt }: { onQuickPrompt: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-white">
        您好，我是<span className="text-brand-400">康医助手</span>
      </h1>
      <p className="mb-1 text-center text-sm text-slate-400">
        您的个人 AI 医疗健康助手
      </p>
      <p className="mb-6 max-w-md text-center text-xs text-slate-500">
        我可以帮您初步识别症状、提供健康建议、推荐食谱与就医指引。
      </p>

      <div className="mb-6">
        <ComplianceBanner />
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onQuickPrompt(p.label)}
            className="group flex items-start gap-3 rounded-xl border border-white/5 bg-ink-800/60 p-3.5 text-left transition hover:border-brand-500/30 hover:bg-ink-800"
          >
            <p.icon className={`mt-0.5 h-5 w-5 shrink-0 ${p.color}`} />
            <span className="text-sm text-slate-300 group-hover:text-white">{p.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-600">
        <FileImage className="h-3.5 w-3.5" />
        <span>支持文字 · 语音 · 图片上传</span>
      </div>
    </div>
  )
}
