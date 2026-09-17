import { useRef, useState } from 'react'
import { Mic, MicOff, Image, Send, Square, X, Loader2 } from 'lucide-react'
import { fileToDataURL } from '../utils'

interface MessageInputProps {
  onSend: (text: string, images: string[]) => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
}

export function MessageInput({ onSend, onStop, streaming, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recogRef = useRef<SpeechRecognition | null>(null)
  const SpeechRecognitionCtor =
    (typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
    null

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }

  const handleSend = () => {
    const content = (text + interim).trim()
    if (!content && images.length === 0) return
    onSend(content, images)
    setText('')
    setInterim('')
    setImages([])
    setTimeout(autoResize, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming) handleSend()
    }
  }

  const toggleVoice = () => {
    if (!SpeechRecognitionCtor) {
      alert('当前浏览器不支持语音识别，请使用 Chrome / Edge')
      return
    }
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }
    const recog = new SpeechRecognitionCtor()
    recog.lang = 'zh-CN'
    recog.continuous = true
    recog.interimResults = true
    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interimText += t
      }
      if (finalText) {
        setText((prev) => prev + finalText)
        setInterim('')
      } else {
        setInterim(interimText)
      }
    }
    recog.onerror = () => setListening(false)
    recog.onend = () => setListening(false)
    recogRef.current = recog
    recog.start()
    setListening(true)
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    setAnalyzing(true)
    try {
      const dataUrls = await Promise.all(Array.from(files).map(fileToDataURL))
      setImages((prev) => [...prev, ...dataUrls])
    } finally {
      setAnalyzing(false)
    }
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="border-t border-white/5 bg-ink-900/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="" className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-700 text-slate-300 ring-1 ring-white/20 hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {analyzing && (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-ink-800">
                <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-800 p-2 transition focus-within:border-brand-500/40 focus-within:ring-1 focus-within:ring-brand-500/20">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-brand-400 disabled:opacity-40"
            title="上传图片"
          >
            <Image className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={text + (listening ? interim : '')}
              onChange={(e) => {
                setText(e.target.value)
                setInterim('')
                autoResize()
              }}
              onKeyDown={handleKeyDown}
              placeholder={listening ? '正在聆听…' : '描述您的症状或健康问题…（Enter 发送，Shift+Enter 换行）'}
              disabled={disabled}
              rows={1}
              className="max-h-44 w-full resize-none bg-transparent py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            onClick={toggleVoice}
            disabled={disabled}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40 ${
              listening
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-brand-400'
            }`}
            title={listening ? '停止录音' : '语音输入'}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {streaming ? (
            <button
              onClick={onStop}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm text-white transition hover:bg-white/15"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && !interim && images.length === 0)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
              title="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[11px] text-slate-600">
          康医助手可能出错，所有内容仅供参考，不能替代专业医疗建议。
        </p>
      </div>
    </div>
  )
}
