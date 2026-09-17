import { useState } from 'react'
import { marked } from 'marked'
import { Copy, Check, Volume2, VolumeX, User, Sparkles } from 'lucide-react'
import type { Message } from '../types'
import { copyToClipboard, formatTime } from '../utils'

marked.setOptions({ breaks: true, gfm: true })

interface MessageBubbleProps {
  message: Message
  streaming?: boolean
  onSpeak?: (text: string) => void
  speaking?: boolean
  onStopSpeak?: () => void
}

export function MessageBubble({ message, streaming, onSpeak, speaking, onStopSpeak }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleSpeak = () => {
    if (speaking && onStopSpeak) {
      onStopSpeak()
    } else if (onSpeak) {
      onSpeak(message.content)
    }
  }

  return (
    <div className={`flex gap-3 px-4 py-5 animate-fade-in ${isUser ? '' : ''}`}>
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-700 text-slate-300">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">
            {isUser ? '我' : '康医助手'}
          </span>
          <span className="text-[11px] text-slate-500">{formatTime(message.timestamp)}</span>
        </div>

        {/* Image attachments (user messages) */}
        {message.images && message.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="上传图片"
                className="h-32 w-auto rounded-lg border border-white/10 object-cover"
              />
            ))}
          </div>
        )}

        <div
          className={`prose-medical max-w-none ${
            isUser ? 'text-slate-100' : 'text-slate-300'
          } ${streaming ? 'streaming-cursor' : ''}`}
          dangerouslySetInnerHTML={{
            __html: isUser ? escapeHtml(message.content) : marked.parse(message.content) as string,
          }}
        />

        {!streaming && message.content && (
          <div className="mt-2 flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
              title="复制"
            >
              {copied ? <Check className="h-3 w-3 text-brand-400" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
            {!isUser && onSpeak && (
              <button
                onClick={handleSpeak}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                title={speaking ? '停止朗读' : '朗读'}
              >
                {speaking ? <VolumeX className="h-3 w-3 text-brand-400" /> : <Volume2 className="h-3 w-3" />}
                {speaking ? '停止' : '朗读'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
