'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { MapView } from '@/components/MapView'
import { ItineraryStack } from '@/components/ItineraryStack'
import { VoiceButton } from '@/components/VoiceButton'
import { streamChat, fetchSessionState } from '@/lib/stream'
import { type ModelId } from '@/components/ModelSwitcher'
import type { ChatMessage, Place, Itinerary, Theme } from '@/lib/types'

function uid() { return Math.random().toString(36).slice(2) }

const USER_ID = typeof window !== 'undefined'
  ? (localStorage.getItem('hodari_uid') ?? (() => {
      const id = uid(); localStorage.setItem('hodari_uid', id); return id
    })())
  : 'anon'

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
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.5-flash')
  const [theme, setTheme] = useState<Theme>('dark')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const sessionId = useRef(uid())

  // Restore saved theme
  useEffect(() => {
    const saved = localStorage.getItem('hodari_theme') as Theme | null
    if (saved === 'dark' || saved === 'light') setTheme(saved)
  }, [])

  // Apply theme class + persist
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('hodari_theme', theme)
  }, [theme])

  // Request geolocation once on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  const handleSend = useCallback(async (text: string) => {
    // Silently enrich with location context for the backend
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

    try {
      for await (const chunk of streamChat(enriched, USER_ID, sessionId.current)) {
        if (chunk.type === 'thinking') {
          setThinkingSteps((prev) => [...prev, chunk.label])
        } else {
          if (!streamingStartedRef.current) {
            streamingStartedRef.current = true
            setStreamingStarted(true)
          }
          assistantText += chunk.text
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId)
            if (existing) return prev.map((m) => m.id === assistantId ? { ...m, content: assistantText } : m)
            return [...prev, { id: assistantId, role: 'assistant', content: assistantText }]
          })
        }
      }

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
        try {
          const raw = typeof state.itinerary === 'string' ? state.itinerary : JSON.stringify(state.itinerary)
          const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
          const parsed: Itinerary = JSON.parse(clean)
          setItinerary(parsed)
          setActiveStop(0)
          setMapOpen(true)
        } catch { /* skip */ }
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
      setStreamingStarted(false)
      streamingStartedRef.current = false
    }
  }, [userLocation])

  const itineraryStops = itinerary?.stops ?? null
  const mapPlaces = itineraryStops
    ? itineraryStops.map((s) => ({ ...s, personalization_score: 0, categories: [] }))
    : places

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* ── Chat column ──────────────────────────── */}
      <div
        className={`flex flex-col shrink-0 border-r border-border transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          bg-bg/[0.92] backdrop-blur-sm
          ${mapOpen ? 'w-[440px]' : 'w-[65%]'}`}
      >
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
        />
        <div className="flex justify-center py-3 border-t border-border bg-bg/80 shrink-0">
          <VoiceButton onTranscript={handleSend} disabled={loading} />
        </div>
      </div>

      {/* ── Right side — map or gradient fill ─────────── */}
      <div className="flex-1 relative">
        {mapOpen ? (
          <div className="w-full h-full animate-slide-in-right">
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
              />
            )}

            {/* Close map */}
            <button
              onClick={() => setMapOpen(false)}
              className="absolute top-4 left-4 z-10 bg-bg/90 backdrop-blur-sm border border-border rounded-xl p-2 text-text2 hover:text-text hover:border-gold/40 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ) : (
          /* Gradient shows through — decorative panel */
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {/* Subtle dot grid */}
            <div
              className="absolute inset-0 opacity-[0.018]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgb(var(--color-text)) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {/* Concentric rings around watermark */}
            <div className="absolute w-[380px] h-[380px] rounded-full border border-gold/[0.04]" />
            <div className="absolute w-[260px] h-[260px] rounded-full border border-gold/[0.06]" />
            <div className="absolute w-[150px] h-[150px] rounded-full border border-gold/[0.08]" />
            {/* H watermark */}
            <div className="relative text-center select-none">
              <p className="font-display italic text-[130px] font-bold leading-none text-text opacity-[0.04]">H</p>
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-text opacity-[0.06] mt-2">
                Hodari
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
