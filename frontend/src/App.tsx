import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { ChatWindow } from './components/ChatWindow'
import { HealthPanel } from './components/HealthPanel'
import { RecipesPanel } from './components/RecipesPanel'
import { MedicalPanel } from './components/MedicalPanel'
import { VideosPanel } from './components/VideosPanel'
import { ConsentModal } from './components/ConsentModal'
import { SettingsModal } from './components/SettingsModal'
import { PrivacyModal } from './components/PrivacyModal'
import { ComplianceBanner } from './components/ComplianceBanner'
import { useSpeechSynthesis } from './hooks/useVoice'
import { streamChat, getAppConfig } from './api'
import {
  loadConversations,
  saveConversations,
  loadHealthProfile,
  saveHealthProfile,
  getConsent,
  setConsent,
  getActiveConversationId,
  setActiveConversationId,
} from './storage'
import { uid } from './utils'
import type { Conversation, FeatureTab, HealthProfile, Message } from './types'

const TAB_TITLES: Record<FeatureTab, string> = {
  chat: '智能问诊',
  health: '基础病健康建议',
  recipes: '健康食谱',
  medical: '就医指引',
  videos: '养生视频',
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FeatureTab>('chat')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [profile, setProfile] = useState<HealthProfile>({
    conditions: [],
    medications: [],
    allergies: [],
    updatedAt: 0,
  })
  const [llmEnabled, setLlmEnabled] = useState(false)
  const [chatModel, setChatModel] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const { speak, speaking, cancel } = useSpeechSynthesis()

  // Load persisted state
  useEffect(() => {
    const convs = loadConversations()
    setConversations(convs)
    const savedActive = getActiveConversationId()
    if (savedActive && convs.some((c) => c.id === savedActive)) {
      setActiveId(savedActive)
    }
    setProfile(loadHealthProfile())
    if (!getConsent()) setShowConsent(true)

    // Probe backend LLM status (non-blocking)
    getAppConfig()
      .then((cfg) => {
        setLlmEnabled(cfg.llm_enabled)
        setChatModel(cfg.chat_model)
      })
      .catch(() => {
        setLlmEnabled(false)
      })
  }, [])

  // Persist conversations
  useEffect(() => {
    if (conversations.length > 0 || loadConversations().length > 0) {
      saveConversations(conversations)
    }
  }, [conversations])

  useEffect(() => {
    setActiveConversationId(activeId)
  }, [activeId])

  const activeConv = conversations.find((c) => c.id === activeId) ?? null

  const updateConversation = useCallback((id: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)))
  }, [])

  const handleNewConversation = useCallback(() => {
    const conv: Conversation = {
      id: uid(),
      title: '新会话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setActiveTab('chat')
    setSidebarOpen(false)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id)
    setActiveTab('chat')
    setSidebarOpen(false)
  }, [])

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) {
        setActiveId(null)
      }
    },
    [activeId],
  )

  const generateTitle = (text: string): string => {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    return cleaned.length > 20 ? cleaned.slice(0, 20) + '…' : cleaned || '新会话'
  }

  const handleSend = useCallback(
    async (text: string, images: string[]) => {
      if (!text.trim() && images.length === 0) return
      if (!getConsent()) {
        setShowConsent(true)
        return
      }

      let convId = activeId
      let conv = activeConv

      if (!conv) {
        conv = {
          id: uid(),
          title: '新会话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        convId = conv.id
        setConversations((prev) => [conv!, ...prev])
        setActiveId(convId)
      }

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        images: images.length > 0 ? images : undefined,
      }
      const assistantId = uid()
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      updateConversation(convId!, (c) => ({
        ...c,
        title: c.messages.length === 0 ? generateTitle(text) : c.title,
        messages: [...c.messages, userMsg, assistantMsg],
        updatedAt: Date.now(),
      }))

      // Stream
      const controller = new AbortController()
      abortRef.current = controller
      setStreamingId(assistantId)

      const history = [...(conv?.messages ?? []), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      let acc = ''
      await streamChat(history, images, {
        signal: controller.signal,
        onToken: (token) => {
          acc += token
          updateConversation(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId ? { ...m, content: acc } : m,
            ),
          }))
        },
        onDone: () => {
          setStreamingId(null)
          abortRef.current = null
        },
        onError: (err) => {
          updateConversation(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: (m.content || '') + `\n\n⚠️ 出错了：${err.message}` }
                : m,
            ),
          }))
          setStreamingId(null)
          abortRef.current = null
        },
      })
    },
    [activeConv, activeId, updateConversation],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setStreamingId(null)
  }, [])

  const handleSpeak = useCallback(
    (text: string) => {
      speak(text)
    },
    [speak],
  )

  const handleSaveProfile = useCallback((p: HealthProfile) => {
    setProfile(p)
    saveHealthProfile(p)
  }, [])

  const handleAcceptConsent = useCallback(() => {
    setConsent(true)
    setShowConsent(false)
  }, [])

  const handleTabChange = useCallback((tab: FeatureTab) => {
    setActiveTab(tab)
    if (tab === 'chat' && !activeId) {
      handleNewConversation()
    }
  }, [activeId, handleNewConversation])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-950">
      {/* Sidebar - desktop */}
      <div className="hidden md:block">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onOpenSettings={() => setShowSettings(true)}
          onOpenPrivacy={() => setShowPrivacy(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Sidebar - mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
              onDelete={handleDeleteConversation}
              onOpenSettings={() => {
                setShowSettings(true)
                setSidebarOpen(false)
              }}
              onOpenPrivacy={() => {
                setShowPrivacy(true)
                setSidebarOpen(false)
              }}
              collapsed={false}
              onToggleCollapse={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onToggleSidebar={() => setSidebarOpen(true)}
          title={TAB_TITLES[activeTab]}
          llmEnabled={llmEnabled}
          chatModel={chatModel}
        />

        <main className="min-h-0 flex-1">
          {activeTab === 'chat' && (
            <ChatWindow
              messages={activeConv?.messages ?? []}
              streamingId={streamingId}
              onSend={handleSend}
              onStop={handleStop}
              onSpeak={handleSpeak}
              speaking={speaking}
              onStopSpeak={cancel}
              onQuickPrompt={(t) => handleSend(t, [])}
            />
          )}
          {activeTab === 'health' && <HealthPanel profile={profile} />}
          {activeTab === 'recipes' && <RecipesPanel profile={profile} />}
          {activeTab === 'medical' && <MedicalPanel />}
          {activeTab === 'videos' && <VideosPanel />}
        </main>
      </div>

      {/* Floating compliance banner (only on chat) */}
      {activeTab === 'chat' && activeConv && activeConv.messages.length > 0 && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 -translate-x-1/2">
          <ComplianceBanner />
        </div>
      )}

      {/* Modals */}
      {showConsent && <ConsentModal onAccept={handleAcceptConsent} />}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  )
}
