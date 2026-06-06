'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { MapView } from '@/components/MapView'
import { ItineraryStack } from '@/components/ItineraryStack'
import { VoiceButton } from '@/components/VoiceButton'
import { VoiceOrb } from '@/components/VoiceOrb'
import { CollapsedReply } from '@/components/CollapsedReply'
import { PlaceDetailsPanel } from '@/components/PlaceDetailsPanel'
import { streamChat, fetchSessionState } from '@/lib/stream'
import { stripEmDashes } from '@/lib/text'
import { speak, cancelSpeech, isSpeechOutputSupported } from '@/lib/voice'
import { type ModelId } from '@/components/ModelSwitcher'
import type { ChatMessage, Place, Itinerary, ItineraryStop, Theme } from '@/lib/types'

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
  // Width of the map-open chat overlay. User-resizable via the drag handle.
  // Kept compact by default so the map stays the focus; drag to widen.
  const [chatWidth, setChatWidth] = useState(380)
  const resizingRef = useRef(false)
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.5-flash')
  const [theme, setTheme] = useState<Theme>('dark')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [detailsStop, setDetailsStop] = useState<ItineraryStop | null>(null)
  // Speak Hodari's replies aloud when the user spoke their message (speech-to-speech).
  const [speakReplies, setSpeakReplies] = useState(true)
  const [speechOutSupported, setSpeechOutSupported] = useState(false)
  const speakRepliesRef = useRef(true)
  const sessionId = useRef(uid())

  useEffect(() => { speakRepliesRef.current = speakReplies }, [speakReplies])

  useEffect(() => {
    setSpeechOutSupported(isSpeechOutputSupported())
    const savedVoice = localStorage.getItem('hodari_speak')
    if (savedVoice === '0') setSpeakReplies(false)
  }, [])

  useEffect(() => {
    localStorage.setItem('hodari_speak', speakReplies ? '1' : '0')
  }, [speakReplies])

  useEffect(() => {
    // Only honor a width the user explicitly set by dragging (new key, so the
    // old auto-persisted default is ignored and the compact default applies).
    const saved = Number(localStorage.getItem('hodari_chatw'))
    if (saved >= 300 && saved <= 760) setChatWidth(saved)
  }, [])

  // Drag the chat panel's right edge to resize it. Width === pointer X since the
  // panel is anchored to the left edge. Persisted only on release (not on every
  // render) so the compact default isn't overwritten.
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    let latest = 380
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const max = Math.min(760, window.innerWidth - 260)
      latest = Math.max(320, Math.min(ev.clientX, max))
      setChatWidth(latest)
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      localStorage.setItem('hodari_chatw', String(latest))
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

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

  const handleSend = useCallback(async (text: string, opts?: { speak?: boolean }) => {
    cancelSpeech() // stop any in-flight reply the moment a new turn begins
    const wantSpeak = !!opts?.speak

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

    // Polls session state every 3 s once the pipeline fires — renders cards as
    // soon as the pipeline commits its result, well before the Orchestrator
    // finishes presenting (and saving preferences). The loop exits early on
    // streamDone/earlyItinerarySet, so the high cap just covers slow pipelines
    // (live Maps + multi-step reasoning can take a couple of minutes).
    const pollForItinerary = async () => {
      for (let i = 0; i < 120; i++) {
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
          // Start polling session state as soon as planning begins (profile load or
          // pipeline), so map/cards can appear before the orchestrator finishes.
          const planningSignal =
            chunk.agent === 'hodari_pipeline' ||
            chunk.agent === 'load_user_profile' ||
            chunk.agent.startsWith('pipeline_') ||
            chunk.agent === 'itinerary_agent'
          if (planningSignal && !earlyItinerarySet) {
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

      // Speech-to-speech: if the user spoke their message, speak the reply back.
      if (wantSpeak && speakRepliesRef.current && assistantText.trim()) {
        speak(stripEmDashes(assistantText))
      }

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

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant') ?? null
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
    <div className="flex justify-center items-center gap-3 py-3 border-t border-border bg-bg/80 shrink-0">
      <VoiceButton onTranscript={(t) => handleSend(t, { speak: true })} disabled={loading} />
      {speechOutSupported && (
        <button
          onClick={() => setSpeakReplies((v) => { const nv = !v; if (!nv) cancelSpeech(); return nv })}
          title={speakReplies ? 'Mute spoken replies' : 'Speak replies aloud'}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors border ${
            speakReplies ? 'border-gold/50 text-gold bg-gold/10' : 'border-border text-text3 hover:text-text2'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            {speakReplies ? (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12zM14 3.23v2.06a7 7 0 010 13.42v2.06a9 9 0 000-17.54z" />
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm16.59 3L22 9.41 20.59 8 18 10.59 15.41 8 14 9.41 16.59 12 14 14.59 15.41 16 18 13.41 20.59 16 22 14.59 19.41 12z" />
            )}
          </svg>
        </button>
      )}
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
              onShowDetails={setDetailsStop}
              leftOffset={chatCollapsed ? 0 : chatWidth}
            />
          )}
        </div>
      )}

      {/* ── Chat overlay: shown when map is open and not collapsed ── */}
      {mapOpen && !chatCollapsed && (
        <div
          className="absolute top-0 bottom-0 left-0 z-10 flex flex-col bg-bg/95 backdrop-blur-md border-r border-border animate-slide-in-right"
          style={{ width: chatWidth }}
        >
          {chatPanel}
          {voiceBar}
          {/* Drag handle — resize the panel */}
          <div
            onMouseDown={startResize}
            title="Drag to resize"
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize group z-20"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-1 rounded-full bg-border group-hover:bg-gold/70 transition-colors" />
          </div>
        </div>
      )}

      {/* ── Collapsed chat: live response window + voice ── */}
      {mapOpen && chatCollapsed && (
        <CollapsedReply
          content={lastAssistant?.content ?? null}
          loading={loading}
          streaming={loading && streamingStarted}
          onOpen={() => setChatCollapsed(false)}
        />
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

      {/* ── Audio-reactive voice bubble (self-hides when idle) ── */}
      <VoiceOrb />

      {/* ── In-app place details (Places API) ── */}
      {detailsStop?.place_id && (
        <PlaceDetailsPanel
          placeId={detailsStop.place_id}
          fallbackName={detailsStop.name}
          fallbackMapsUrl={`https://www.google.com/maps/search/?api=1&query=${detailsStop.coordinates.lat},${detailsStop.coordinates.lng}&query_place_id=${encodeURIComponent(detailsStop.place_id)}`}
          onClose={() => setDetailsStop(null)}
        />
      )}

    </div>
  )
}
