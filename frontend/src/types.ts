export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  images?: string[] // base64 data URLs
  attachments?: { name: string; size: number; type: string }[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface HealthProfile {
  age?: number
  gender?: 'male' | 'female' | 'other'
  height?: number
  weight?: number
  conditions: string[]
  medications: string[]
  allergies: string[]
  updatedAt: number
}

export type FeatureTab = 'chat' | 'health' | 'recipes' | 'medical' | 'videos'

export interface Recipe {
  name: string
  meal: '早餐' | '午餐' | '晚餐' | '加餐'
  calories: number
  tags: string[]
  ingredients: string[]
  steps: string[]
  suitable: string[]
}

export interface SimpleChatMessage {
  role: string
  content: string
}
