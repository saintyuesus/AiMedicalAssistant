import type { HealthProfile, SimpleChatMessage, Recipe } from './types'

const API_BASE = 'http://localhost:8000/api'

export interface AppConfig {
  llm_enabled: boolean
  chat_model: string | null
  vision_model: string | null
  mode: 'cloud-llm' | 'local-fallback'
}

export async function getAppConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`)
  if (!res.ok) throw new Error('配置获取失败')
  return res.json()
}

export interface StreamHandlers {
  onToken: (token: string) => void
  onDone: () => void
  onError: (err: Error) => void
  signal?: AbortSignal
}

/**
 * Stream a chat completion via SSE (Server-Sent Events).
 * The backend sends `data: {token}` chunks followed by `data: [DONE]`.
 */
export async function streamChat(
  messages: SimpleChatMessage[],
  images: string[],
  handlers: StreamHandlers,
) {
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, images }),
      signal: handlers.signal,
    })

    if (!res.ok || !res.body) {
      throw new Error(`请求失败 (${res.status})`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const lines = part.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') {
              handlers.onDone()
              return
            }
            try {
              const obj = JSON.parse(payload)
              if (obj.token) handlers.onToken(obj.token)
            } catch {
              // raw text token fallback
              if (payload) handlers.onToken(payload)
            }
          }
        }
      }
    }
    handlers.onDone()
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      handlers.onDone()
    } else {
      handlers.onError(e as Error)
    }
  }
}

export interface ImageAnalysisResult {
  description: string
  warnings: string[]
  disclaimer: string
}

export async function analyzeImage(file: File): Promise<ImageAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/image/analyze`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`图片分析失败 (${res.status})`)
  return res.json()
}

export interface VideoItem {
  id: string
  title: string
  author: string
  cover: string
  url: string
  duration: string
  views: string
  tags: string[]
}

export async function recommendVideos(symptom?: string): Promise<VideoItem[]> {
  const url = symptom
    ? `${API_BASE}/videos/recommend?symptom=${encodeURIComponent(symptom)}`
    : `${API_BASE}/videos/daily`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`视频推荐失败 (${res.status})`)
  return res.json()
}

export interface Doctor {
  name: string
  title: string
  dept: string
  hospital: string
  specialty: string
  rating: number
  avatar: string
}

export interface Hospital {
  name: string
  level: string
  distance: string
  address: string
  depts: string[]
}

export async function getMedicalGuidance(symptom: string): Promise<{
  departments: string[]
  hospitals: Hospital[]
  doctors: Doctor[]
  preparation: string[]
}> {
  const res = await fetch(`${API_BASE}/medical/guidance?symptom=${encodeURIComponent(symptom)}`)
  if (!res.ok) throw new Error(`就医指引失败 (${res.status})`)
  return res.json()
}

export async function getHealthAdvice(profile: HealthProfile): Promise<string> {
  const res = await fetch(`${API_BASE}/health/advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) throw new Error(`健康建议失败 (${res.status})`)
  const data = await res.json()
  return data.advice
}

export async function getRecipes(profile: HealthProfile): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE}/recipes/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) throw new Error(`食谱推荐失败 (${res.status})`)
  return res.json()
}
