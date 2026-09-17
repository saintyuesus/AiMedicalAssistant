import type { Conversation, HealthProfile } from './types'

const CONV_KEY = 'aima.conversations'
const PROFILE_KEY = 'aima.healthProfile'
const CONSENT_KEY = 'aima.consent'
const ACTIVE_KEY = 'aima.activeConversation'

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONV_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Conversation[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveConversations(conversations: Conversation[]) {
  // Data minimization: persist only what's needed
  localStorage.setItem(CONV_KEY, JSON.stringify(conversations))
}

export function loadHealthProfile(): HealthProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { conditions: [], medications: [], allergies: [], updatedAt: 0 }
    return JSON.parse(raw) as HealthProfile
  } catch {
    return { conditions: [], medications: [], allergies: [], updatedAt: 0 }
  }
}

export function saveHealthProfile(profile: HealthProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: Date.now() }))
}

export function getConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === '1'
}

export function setConsent(value: boolean) {
  if (value) localStorage.setItem(CONSENT_KEY, '1')
  else localStorage.removeItem(CONSENT_KEY)
}

export function getActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveConversationId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

/** Export all user data (for GDPR-style right to portability) */
export function exportUserData() {
  return JSON.stringify(
    {
      conversations: loadConversations(),
      healthProfile: loadHealthProfile(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )
}

/** Wipe all user data (right to erasure) */
export function wipeAllData() {
  localStorage.removeItem(CONV_KEY)
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(ACTIVE_KEY)
  localStorage.removeItem(CONSENT_KEY)
}
