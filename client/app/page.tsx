'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChatPanel } from '@/components/ChatPanel'
import { MapView } from '@/components/MapView'
import { streamChat, transcribeVoice } from '@/lib/stream'
import { stripEmDashes } from '@/lib/text'
import { type ModelId } from '@/components/ModelSwitcher'
import type { ChatMessage, ItineraryStop, Place, Theme } from '@/lib/types'

function uid() { return Math.random().toString(36).slice(2) }
const INITIAL_CONVERSATION_ID = 'initial-conversation'
const DEFAULT_WORLD_CUP_STADIUM = { lat: 40.8136, lng: -74.0745 }

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

function SidebarIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d={collapsed ? 'M15 4v16' : 'M9 4v16'} />
    </svg>
  )
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

export default function HomePage() {
  const initialConversationId = useRef(INITIAL_CONVERSATION_ID)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId.current)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([])
  const [streamingStarted, setStreamingStarted] = useState(false)
  const streamingStartedRef = useRef(false)
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.5-flash')
  const [theme, setTheme] = useState<Theme>('light')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locatingLocation, setLocatingLocation] = useState(true)
  const [locationFallbackUsed, setLocationFallbackUsed] = useState(false)
  const [userId, setUserId] = useState('anon')
  const [hydrated, setHydrated] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [itineraryStops, setItineraryStops] = useState<ItineraryStop[]>([])
  const [mapOpen, setMapOpen] = useState(false)
  const [voiceSummary, setVoiceSummary] = useState('')
  const [totalCostEstimate, setTotalCostEstimate] = useState<number | undefined>(undefined)
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null)
  const sessionId = useRef(initialConversationId.current)
  const activeConversationIdRef = useRef(activeConversationId)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    const storedUserId = localStorage.getItem('hodari_uid') ?? uid()
    localStorage.setItem('hodari_uid', storedUserId)
    setUserId(storedUserId)

    try {
      const saved = localStorage.getItem('hodari_conversations')
      const savedConversations = saved ? JSON.parse(saved) as Conversation[] : []
      setConversations(savedConversations)
      if (savedConversations.length > 0) {
        const [latest] = [...savedConversations].sort((a, b) => b.updatedAt - a.updatedAt)
        setActiveConversationId(latest.id)
        setMessages(latest.messages)
        sessionId.current = latest.id
      }
    } catch {
      setConversations([])
    }

    const saved = localStorage.getItem('hodari_theme') as Theme | null
    setTheme(saved === 'dark' ? 'dark' : 'light')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('hodari_conversations', JSON.stringify(conversations.slice(0, 30)))
  }, [conversations, hydrated])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('hodari_theme', theme)
  }, [theme, hydrated])

  const requestUserLocation = useCallback(() => {
    setLocatingLocation(true)

    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_WORLD_CUP_STADIUM)
      setLocationFallbackUsed(true)
      setLocatingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationFallbackUsed(false)
        setLocatingLocation(false)
      },
      () => {
        setUserLocation(DEFAULT_WORLD_CUP_STADIUM)
        setLocationFallbackUsed(true)
        setLocatingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    requestUserLocation()
  }, [requestUserLocation])

  const handleSend = useCallback(async (
    text: string,
    options?: { feedback?: 'liked' | 'disliked' | 'category_reject'; placeId?: string | null; silentUserMessage?: boolean },
  ) => {
    const chipText = text.toLowerCase()
    const hasCurrentMapResults = places.length > 0 || itineraryStops.length > 0
    const isMapFollowUp = hasCurrentMapResults && (
      chipText.includes('show on map')
      || chipText.includes('walking directions')
      || chipText.includes('get directions')
    )

    if (isMapFollowUp) {
      setMapOpen(true)
    }

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    if (!options?.silentUserMessage) {
      setMessages((prev) => [...prev, userMsg])
    }
    const conversationId = activeConversationIdRef.current
    const title = text.replace(/\s+/g, ' ').trim()
    if (!options?.silentUserMessage) {
      setConversations((prev) => {
        const existing = prev.find((conversation) => conversation.id === conversationId)
        if (existing) {
          return prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title: conversation.title || title,
                  messages: [...conversation.messages, userMsg],
                  updatedAt: Date.now(),
                }
              : conversation,
          )
        }

        return [
          {
            id: conversationId,
            title,
            messages: [userMsg],
            updatedAt: Date.now(),
          },
          ...prev,
        ]
      })
    }
    setLoading(true)
    setThinkingSteps([])
    setStreamingStarted(false)
    streamingStartedRef.current = false
    if (!options?.feedback && !isMapFollowUp) {
      setPlaces([])
      setItineraryStops([])
      setMapOpen(false)
      setVoiceSummary('')
      setTotalCostEstimate(undefined)
      setActiveStopIndex(null)
    }

    let assistantText = ''
    const assistantId = uid()

    try {
      for await (const chunk of streamChat(text, userId, sessionId.current, userLocation, options)) {
        if (chunk.type === 'thinking') {
          setThinkingSteps((prev) => [...prev, chunk.label])
        } else if (chunk.type === 'place') {
          setMapOpen(true)
          setPlaces((prev) => {
            const exists = prev.some((place) => place.place_id === chunk.place.place_id)
            return exists ? prev : [...prev, chunk.place]
          })
        } else if (chunk.type === 'itinerary') {
          setMapOpen(true)
          setItineraryStops(chunk.itinerary.stops)
          setVoiceSummary(chunk.itinerary.voice_summary)
          setTotalCostEstimate(chunk.itinerary.total_cost_estimate)
          setActiveStopIndex((prev) => prev ?? (chunk.itinerary.stops.length ? 0 : null))
        } else {
          if (!streamingStartedRef.current) {
            streamingStartedRef.current = true
            setStreamingStarted(true)
          }
          assistantText += chunk.text
          // Re-strip the full accumulated text each chunk so em dashes that
          // straddle a chunk boundary (" — " split across two events) are caught.
          const clean = stripEmDashes(assistantText)
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId)
            if (existing) return prev.map((m) => m.id === assistantId ? { ...m, content: clean } : m)
            return [...prev, { id: assistantId, role: 'assistant', content: clean }]
          })
          setConversations((prev) =>
            prev.map((conversation) => {
              if (conversation.id !== conversationId) return conversation

              const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: clean }
              const existing = conversation.messages.find((message) => message.id === assistantId)
              return {
                ...conversation,
                messages: existing
                  ? conversation.messages.map((message) => message.id === assistantId ? assistantMessage : message)
                  : [...conversation.messages, assistantMessage],
                updatedAt: Date.now(),
              }
            }),
          )
        }
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
      setStreamingStarted(false)
      streamingStartedRef.current = false
    }
  }, [itineraryStops.length, places.length, userLocation, userId])

  const handleFeedback = useCallback((stopIndex: number, action: 'liked' | 'disliked') => {
    const stop = itineraryStops[stopIndex]
    if (!stop) return
    void handleSend(
      action === 'liked'
        ? `I liked ${stop.name}. Remember that for my future plans.`
        : `Swap ${stop.name}. It is not for me.`,
      { feedback: action, placeId: stop.place_id, silentUserMessage: action === 'liked' },
    )
  }, [handleSend, itineraryStops])

  const handleSwap = useCallback((stopIndex: number) => {
    const stop = itineraryStops[stopIndex]
    if (!stop) return
    void handleSend(`Swap ${stop.name} for a better alternative that still fits the route.`, {
      feedback: 'disliked',
      placeId: stop.place_id,
    })
  }, [handleSend, itineraryStops])

  const handleAskAboutStop = useCallback((_stopIndex: number, prompt: string) => {
    void handleSend(prompt)
  }, [handleSend])

  const handleVoiceTranscribe = useCallback(async (audio: Blob) => {
    const result = await transcribeVoice(audio)
    return result.transcription
  }, [])

  const handleNewChat = useCallback(() => {
    const id = uid()
    setActiveConversationId(id)
    setMessages([])
    setThinkingSteps([])
    setStreamingStarted(false)
    setLoading(false)
    setPlaces([])
    setItineraryStops([])
    setMapOpen(false)
    setVoiceSummary('')
    setTotalCostEstimate(undefined)
    setActiveStopIndex(null)
    streamingStartedRef.current = false
    sessionId.current = uid()
  }, [])

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversationId(conversation.id)
    setMessages(conversation.messages)
    setThinkingSteps([])
    setStreamingStarted(false)
    setLoading(false)
    setPlaces([])
    setItineraryStops([])
    setMapOpen(false)
    setVoiceSummary('')
    setTotalCostEstimate(undefined)
    setActiveStopIndex(null)
    streamingStartedRef.current = false
    sessionId.current = conversation.id
  }, [])

  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const visibleConversations = searchQuery.trim()
    ? sortedConversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
        || conversation.messages.some((message) => message.content.toLowerCase().includes(searchQuery.trim().toLowerCase())),
      )
    : sortedConversations
  const shouldShowMap = mapOpen && (places.length > 0 || itineraryStops.length > 0)

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-bg text-text">
      <motion.aside
        className="fixed inset-y-0 left-0 z-30 hidden border-r border-[#E5E5E5] bg-white text-text md:flex"
        animate={{ width: sidebarCollapsed ? 56 : 260 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="flex h-full w-full flex-col overflow-hidden p-2">
          <div className={`flex gap-2 px-1 py-1.5 ${sidebarCollapsed ? 'flex-col items-center' : 'items-center'}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-text">
              H
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Hodari</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text2 transition hover:bg-[#FEF3C7] hover:text-text"
                title="Search chats"
              >
                <SearchIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text2 transition hover:bg-[#FEF3C7] hover:text-text"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <SidebarIcon collapsed={sidebarCollapsed} />
            </button>
          </div>

          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(false)
                requestAnimationFrame(() => searchInputRef.current?.focus())
              }}
              className="mt-2 flex h-9 w-full items-center justify-center rounded-lg text-text2 transition hover:bg-[#FEF3C7] hover:text-text"
              title="Search chats"
            >
              <SearchIcon />
            </button>
          )}

          <motion.button
            type="button"
            onClick={handleNewChat}
            className={`group mt-2 flex h-9 items-center gap-2 rounded-lg border-l-2 border-transparent px-2 text-sm text-text2 transition hover:border-gold hover:bg-[#FEF3C7]/60 hover:text-text ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="New chat"
            whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-lg leading-none">+</span>
            {!sidebarCollapsed && <span>New chat</span>}
          </motion.button>

          {!sidebarCollapsed && (
            <>
              <div className="mt-3 px-1">
                <label className="flex h-9 items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 text-text2 shadow-sm transition focus-within:border-gold focus-within:text-text focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    type="search"
                    placeholder="Search chats"
                    className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text3"
                  />
                </label>
              </div>
              <p className="mt-5 px-2 text-xs text-text3">Recents</p>
              <div className="mt-1 flex-1 overflow-y-auto">
                {visibleConversations.length === 0 ? (
                  <p className="px-2 py-2 text-xs leading-5 text-text3">
                    {searchQuery.trim() ? 'No chats found.' : 'Your chats will appear here.'}
                  </p>
                ) : (
                  visibleConversations.map((conversation) => {
                    const active = conversation.id === activeConversationId
                    const preview = conversation.messages[0]?.content ?? conversation.title
                    return (
                      <motion.button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation)}
                        className={`relative block w-full overflow-hidden rounded-lg px-2 py-2 text-left text-sm transition ${
                          active ? 'bg-[#FEF3C7] text-text' : 'text-text2 hover:text-text'
                        }`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        whileHover={{ x: 2, backgroundColor: '#FEF3C7' }}
                        title={conversation.title}
                      >
                        <span className="relative z-10 block truncate">{conversation.title}</span>
                        <span className="relative z-10 mt-0.5 block truncate text-[11px] text-text3">{preview}</span>
                      </motion.button>
                    )
                  })
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 border-t border-[#E5E5E5] px-2 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text text-xs font-medium text-bg">
                  Y
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">You</p>
                  <span className="inline-flex rounded-full bg-white px-1.5 py-0.5 text-[11px] text-text3 ring-1 ring-border">
                    Free
                  </span>
                </div>
              </div>
            </>
          )}

          {sidebarCollapsed && (
            <div className="mt-auto flex justify-center pb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-text text-xs font-medium text-bg" title="You · Free">
                Y
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      <div className={`fixed inset-y-0 right-0 z-10 flex ${sidebarCollapsed ? 'md:left-[56px]' : 'md:left-[260px]'} left-0`}>
        <motion.main
          className={`relative z-10 flex min-h-screen w-full flex-col px-4 transition-[width] duration-300 ease-out ${
            shouldShowMap ? 'md:w-[320px] md:shrink-0' : 'md:flex-1 md:px-8'
          }`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <ChatPanel
            messages={messages}
            loading={loading}
            thinkingSteps={thinkingSteps}
            streamingStarted={streamingStarted}
            onSend={handleSend}
            onVoiceTranscribe={handleVoiceTranscribe}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            theme={theme}
            onToggleTheme={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
          />
        </motion.main>

        <AnimatePresence>
          {shouldShowMap && (
            <motion.section
              key="map-panel"
              className="hidden min-w-0 flex-1 p-4 pl-0 md:block"
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="h-full">
                <MapView
                  places={places}
                  itinerary={itineraryStops.length ? itineraryStops : null}
                  activeStopIndex={activeStopIndex}
                  onMarkerClick={setActiveStopIndex}
                  userLocation={userLocation}
                  locating={locatingLocation}
                  locationFallbackUsed={locationFallbackUsed}
                  onLocateMe={requestUserLocation}
                  onClose={() => setMapOpen(false)}
                  onFeedback={handleFeedback}
                  onSwap={handleSwap}
                  totalCostEstimate={totalCostEstimate}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
