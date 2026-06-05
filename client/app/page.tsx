'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { MapView } from '@/components/MapView'
import { ItineraryStack } from '@/components/ItineraryStack'
import { VoiceButton } from '@/components/VoiceButton'
import { streamChat, fetchSessionState } from '@/lib/stream'
import { stripEmDashes } from '@/lib/text'
import { type ModelId } from '@/components/ModelSwitcher'
import type { ChatMessage, Place, Itinerary, Theme } from '@/lib/types'

function uid() { return Math.random().toString(36).slice(2) }

const USER_ID = typeof window !== 'undefined'
  ? (localStorage.getItem('hodari_uid') ?? (() => {
      const id = uid(); localStorage.setItem('hodari_uid', id); return id
    })())
  : 'anon'

function parseItinerary(raw: unknown): Itinerary | null {
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const clean = str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const it = JSON.parse(clean) as Itinerary
    // Drop duplicate stops — the same place repeated (e.g. a min-2-stops fallback
    // clone). Keep the first occurrence; identical place_ids never make sense as
    // separate stops with "0 min" travel between them.
    if (Array.isArray(it?.stops)) {
      const seen = new Set<string>()
      it.stops = it.stops.filter((s) => {
        if (!s.place_id) return true
        if (seen.has(s.place_id)) return false
        seen.add(s.place_id)
        return true
      })
    }
    // Strip em dashes from the user-facing prose fields.
    if (it?.voice_summary) it.voice_summary = stripEmDashes(it.voice_summary)
    it?.stops?.forEach((s) => { if (s.rationale) s.rationale = stripEmDashes(s.rationale) })
    return it
  } catch {
    return null
  }
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([])
  const [streamingStarted, setStreamingStarted] = useState(false)
  const streamingStartedRef = useRef(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [activeStop, setActiveStop] = useState<number | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.5-flash')
  const [theme, setTheme] = useState<Theme>('dark')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const sessionId = useRef(uid())

  useEffect(() => {
    const saved = localStorage.getItem('hodari_theme') as Theme | null
    if (saved === 'dark' || saved === 'light') setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('hodari_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 },
    )
  }, [])

  const handleSend = useCallback(async (text: string) => {
    const enriched = userLocation
      ? `${text}\n[User location: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}]`
      : text

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setThinkingSteps([])
    setStreamingStarted(false)
    streamingStartedRef.current = false

    let assistantText = ''
    const assistantId = uid()
    let earlyItinerarySet = false
    let streamDone = false
    // True once any sub-agent fires — i.e. the full Planner→Explorer→Itinerary
    // pipeline ran. Pure conversational follow-ups never trip this, so we skip
    // re-fetching session state for them (which would re-apply the OLD itinerary
    // and reset the user's selected stop mid-conversation).
    let pipelineRan = false

    // Polls session state every 3 s once the itinerary agent fires — renders
    // cards without waiting for the full Orchestrator response.
    const pollForItinerary = async () => {
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        if (streamDone || earlyItinerarySet) break
        try {
          const s = await fetchSessionState(USER_ID, sessionId.current)
          if (s.itinerary) {
            const parsed = parseItinerary(s.itinerary)
            if (parsed) {
              earlyItinerarySet = true
              setItinerary(parsed)
              setActiveStop(0)
              setMapOpen(true)
            }
          }
          if (!earlyItinerarySet && s.candidates) {
            try {
              const raw = typeof s.candidates === 'string' ? s.candidates : JSON.stringify(s.candidates)
              const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
              setPlaces(JSON.parse(clean))
              setMapOpen(true)
            } catch { /* skip */ }
          }
        } catch { /* non-critical */ }
      }
    }

    try {
      for await (const chunk of streamChat(enriched, USER_ID, sessionId.current)) {
        if (chunk.type === 'thinking') {
          pipelineRan = true
          setThinkingSteps((prev) => [...prev, chunk.label])
          if (chunk.agent === 'itinerary_agent' && !earlyItinerarySet) {
            pollForItinerary()
          }
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
        }
      }

      streamDone = true

      // Final fetch — picks up anything not caught by early polling.
      // Only when the pipeline actually ran; follow-up chat keeps existing state.
      if (pipelineRan && !earlyItinerarySet) {
        const state = await fetchSessionState(USER_ID, sessionId.current)
        if (state.candidates) {
          try {
            const raw = typeof state.candidates === 'string' ? state.candidates : JSON.stringify(state.candidates)
            const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
            setPlaces(JSON.parse(clean))
            setMapOpen(true)
          } catch { /* skip */ }
        }
        if (state.itinerary) {
          const parsed = parseItinerary(state.itinerary)
          if (parsed) {
            setItinerary(parsed)
            setActiveStop(0)
            setMapOpen(true)
          }
        }
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      streamDone = true
      setLoading(false)
      setStreamingStarted(false)
      streamingStartedRef.current = false
    }
  }, [userLocation])

  const handleFeedback = useCallback(async (stopIndex: number, action: 'liked' | 'disliked') => {
    if (!itinerary) return
    const stop = itinerary.stops[stopIndex]
    const city = (stop.address ?? '').split(',').slice(-2, -1)[0]?.trim() ?? ''
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, placeId: stop.place_id, placeName: stop.name, city, action }),
    }).catch(() => { /* non-critical */ })
  }, [itinerary])

  const handleSwap = useCallback((index: number) => {
    if (!itinerary) return
    const stop = itinerary.stops[index]
    handleSend(`Replace stop ${index + 1} (${stop.name}) with a different alternative, keeping the same budget and constraints.`)
  }, [itinerary, handleSend])

  // Contextual follow-up about a specific stop — surfaces the chat so the user
  // sees the streaming reply, then sends the scoped prompt.
  const handleAsk = useCallback((_stopIndex: number, prompt: string) => {
    setChatCollapsed(false)
    handleSend(prompt)
  }, [handleSend])

  const itineraryStops = itinerary?.stops ?? null
  const mapPlaces = itineraryStops
    ? itineraryStops.map((s) => ({ ...s, personalization_score: 0, categories: [] }))
    : places

  const chatPanel = (
    <ChatPanel
      messages={messages}
      loading={loading}
      thinkingSteps={thinkingSteps}
      streamingStarted={streamingStarted}
      onSend={handleSend}
      mapOpen={mapOpen}
      hasMapData={mapPlaces.length > 0}
      onToggleMap={() => setMapOpen((v) => !v)}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      theme={theme}
      onToggleTheme={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
      hasLocation={!!userLocation}
      onCollapse={mapOpen ? () => setChatCollapsed(true) : undefined}
    />
  )

  const voiceBar = (
    <div className="flex justify-center py-3 border-t border-border bg-bg/80 shrink-0">
      <VoiceButton onTranscript={handleSend} disabled={loading} />
    </div>
  )

  return (
    <div className="relative h-screen w-screen overflow-hidden">

      {/* ── No-map layout: centered chat over a full-screen atmosphere ── */}
      {!mapOpen && (
        <div className="absolute inset-0 flex justify-center overflow-hidden animate-fade-up">
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-[0.018] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgb(var(--color-text)) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Concentric gold rings, centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[560px] h-[560px] rounded-full border border-gold/[0.04]" />
            <div className="absolute w-[380px] h-[380px] rounded-full border border-gold/[0.05]" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-gold/[0.07]" />
          </div>

          {/* Centered chat column */}
          <div className="relative w-full max-w-2xl h-full flex flex-col">
            {chatPanel}
            {voiceBar}
          </div>
        </div>
      )}

      {/* ── Map layer: full viewport when open ── */}
      {mapOpen && (
        <div className="absolute inset-0">
          <MapView
            places={mapPlaces as Place[]}
            itinerary={itineraryStops}
            activeStopIndex={activeStop}
            onMarkerClick={setActiveStop}
            userLocation={userLocation}
            theme={theme}
          />
          {itineraryStops && itineraryStops.length > 0 && (
            <ItineraryStack
              stops={itineraryStops}
              activeIndex={activeStop}
              onSelect={setActiveStop}
              voiceSummary={itinerary?.voice_summary}
              onFeedback={handleFeedback}
              onSwap={handleSwap}
              onAsk={handleAsk}
              leftOffset={chatCollapsed ? 0 : 420}
            />
          )}
        </div>
      )}

      {/* ── Chat overlay: shown when map is open and not collapsed ── */}
      {mapOpen && !chatCollapsed && (
        <div className="absolute top-0 bottom-0 left-0 z-10 flex flex-col w-[420px] bg-bg/95 backdrop-blur-md border-r border-border animate-slide-in-right">
          {chatPanel}
          {voiceBar}
        </div>
      )}

      {/* ── Expand-chat button: shown when map is open and chat is collapsed ── */}
      {mapOpen && chatCollapsed && (
        <button
          onClick={() => setChatCollapsed(false)}
          title="Open chat"
          className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-bg/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-text2 hover:text-gold hover:border-gold/40 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="font-mono text-[10px] tracking-wider uppercase">Chat</span>
        </button>
      )}

      {/* ── Close map button ── */}
      {mapOpen && (
        <button
          onClick={() => { setMapOpen(false); setChatCollapsed(false) }}
          className="absolute top-4 right-4 z-20 bg-bg/90 backdrop-blur-sm border border-border rounded-xl p-2 text-text2 hover:text-text hover:border-gold/40 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      )}

    </div>
  )
}
