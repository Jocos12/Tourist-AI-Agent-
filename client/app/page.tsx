'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { MapView, type RouteInfo } from '@/components/MapView'
import { ItineraryStack } from '@/components/ItineraryStack'
import { PlaceStack } from '@/components/PlaceStack'
import { VoiceButton } from '@/components/VoiceButton'
import { VoiceOrb } from '@/components/VoiceOrb'
import { CollapsedReply } from '@/components/CollapsedReply'
import { PlaceDetailsPanel } from '@/components/PlaceDetailsPanel'
import { streamChat, fetchSessionState } from '@/lib/stream'
import { pinsFarFromUser, requestUserLocation } from '@/lib/geo'
import {
  applyMapActions,
  parseMapActions,
  shouldAttachGps,
  type CustomRouteConfig,
  type MapActionEffects,
  type TravelMode,
} from '@/lib/mapActions'
import {
  findPlaceIndexInText,
  isKeepOnlyRequest,
  isNamedKeepOnlyRequest,
  isListPickRequest,
  isNewSearchRequest,
  isZoomFocusRequest,
  resolvePlaceIndex,
} from '@/lib/mapIntents'
import { stripEmDashes } from '@/lib/text'
import { speak, cancelSpeech, isSpeechOutputSupported } from '@/lib/voice'
import { type ModelId } from '@/components/ModelSwitcher'
import type { ChatMessage, Place, Itinerary, ItineraryStop, Theme } from '@/lib/types'

function uid() { return Math.random().toString(36).slice(2) }

/** User wants to see existing recommendations on the in-app map (not a new search). */
function isMapShowRequest(text: string): boolean {
  const t = text.toLowerCase()
  if (/\b(on (the |this )?map|on your map|in the map)\b/.test(t)) return true
  if (/\b(show|see|view|put|pin|display)\b/.test(t) && /\b(map|pins?|them|these|places)\b/.test(t)) return true
  if (/\bwhere (are|is) (they|them|it)\b/.test(t)) return true
  if (/\b(can't you|can you|could you).*\b(map|pins?)\b/.test(t)) return true
  return false
}

function isHideLocationRequest(text: string): boolean {
  const t = text.toLowerCase()
  return /\b(hide|don't show|do not show|remove)\b.{0,30}\b(my )?(location|gps|position)\b/.test(t)
}

function wantsRouteFromUser(text: string): boolean {
  const t = text.toLowerCase()
  if (/\b(do not|don't|not)\b.{0,25}\b(route|from me|from my)\b/.test(t)) return false
  if (/\b(without|ignore)\b.{0,15}\b(my (location|gps)|routing from me)\b/.test(t)) return false
  return (
    /\b(route|directions|how (do|to) (i )?get|how to go|plan my (route|way)|navigate)\b/.test(t)
    || /\b(from my (location|actual location)|using my location|from where i am)\b/.test(t)
    || /\b(go there|get there|show me how)\b/.test(t)
    || /\bdistance\b/.test(t)
    || /\broute from me\b/.test(t)
  )
}

function parseCandidates(raw: unknown): Place[] | null {
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const clean = str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    if (!clean || clean === '[]' || clean === '""') return null
    const parsed = JSON.parse(clean) as Place[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

const USER_ID = typeof window !== 'undefined'
  ? (localStorage.getItem('hodari_uid') ?? (() => {
      const id = uid(); localStorage.setItem('hodari_uid', id); return id
    })())
  : 'anon'

function parseItinerary(raw: unknown): Itinerary | null {
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const clean = str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    if (!clean || clean === '""' || clean === '{}' || clean === '{"stops":[]}') return null
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
  const [routeFromUser, setRouteFromUser] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [mapZoomFocus, setMapZoomFocus] = useState(false)
  const [showUserOnMap, setShowUserOnMap] = useState(true)
  const [suppressGpsContext, setSuppressGpsContext] = useState(false)
  const [customRoute, setCustomRoute] = useState<CustomRouteConfig | null>(null)
  const [routeMode, setRouteMode] = useState<TravelMode>('WALK')
  const [detailsPlace, setDetailsPlace] = useState<Place | null>(null)
  // Speak Hodari's replies aloud when the user spoke their message (speech-to-speech).
  const [speakReplies, setSpeakReplies] = useState(true)
  const [speechOutSupported, setSpeechOutSupported] = useState(false)
  const speakRepliesRef = useRef(true)
  const sessionId = useRef(uid())
  /** User filtered to a single pin locally — don't let session poll restore the full list. */
  const soloPlaceModeRef = useRef(false)
  const appliedMapActionsRef = useRef('')
  const placesRef = useRef(places)
  const itineraryRef = useRef(itinerary)
  const activeStopRef = useRef(activeStop)

  useEffect(() => { placesRef.current = places }, [places])
  useEffect(() => { itineraryRef.current = itinerary }, [itinerary])
  useEffect(() => { activeStopRef.current = activeStop }, [activeStop])

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
    const apply = (pos: GeolocationPosition) =>
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    navigator.geolocation.getCurrentPosition(apply, () => {}, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 120_000,
    })
    const watchId = navigator.geolocation.watchPosition(apply, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
    })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const applyMapEffects = useCallback((effects: MapActionEffects) => {
    if (effects.showUserOnMap !== undefined) setShowUserOnMap(effects.showUserOnMap)
    if (effects.suppressGpsContext !== undefined) setSuppressGpsContext(effects.suppressGpsContext)
    if (effects.mapOpen !== undefined) setMapOpen(effects.mapOpen)
    if (effects.mapZoomFocus !== undefined) setMapZoomFocus(effects.mapZoomFocus)
    if (effects.activeStop !== undefined) setActiveStop(effects.activeStop)
    if (effects.places !== undefined) setPlaces(effects.places)
    if (effects.clearItinerary) setItinerary(null)
    if (effects.soloPlaceMode) soloPlaceModeRef.current = true
    if (effects.routeFromUser !== undefined) setRouteFromUser(effects.routeFromUser)
    if (effects.customRoute !== undefined) setCustomRoute(effects.customRoute)
    if (effects.routeMode !== undefined) setRouteMode(effects.routeMode)
    if (effects.routeFromUser || effects.customRoute) {
      setRouteInfo(null)
      setRouteError(null)
    }
    if (effects.customRoute === null && effects.routeFromUser === false) {
      setRouteInfo(null)
      setRouteError(null)
    }
  }, [])

  const processSessionMapActions = useCallback((state: Record<string, unknown>) => {
    const raw = state.map_actions
    const payload = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '')
    if (!payload || payload === '[]' || payload === '""' || payload === appliedMapActionsRef.current) {
      return
    }
    const actions = parseMapActions(raw)
    if (!actions.length) return
    appliedMapActionsRef.current = payload
    const effects = applyMapActions(actions, {
      places: placesRef.current,
      itinerary: itineraryRef.current,
      activeStop: activeStopRef.current,
    })
    applyMapEffects(effects)
  }, [applyMapEffects])

  const ensureUserLocation = useCallback(async (): Promise<boolean> => {
    if (userLocation) return true
    setLocationPending(true)
    const loc = await requestUserLocation()
    setLocationPending(false)
    if (loc) {
      setUserLocation(loc)
      return true
    }
    setRouteError('Allow location access in your browser (lock icon in the address bar), then tap Route from me again.')
    return false
  }, [userLocation])

  const handleSend = useCallback(async (text: string, opts?: { speak?: boolean }) => {
    cancelSpeech() // stop any in-flight reply the moment a new turn begins
    const wantSpeak = !!opts?.speak

    if (isNewSearchRequest(text)) soloPlaceModeRef.current = false

    if (isHideLocationRequest(text)) {
      setShowUserOnMap(false)
      setRouteFromUser(false)
      setCustomRoute(null)
      setRouteInfo(null)
    }

    const attachGps = shouldAttachGps(text, userLocation, suppressGpsContext)
    const enriched = attachGps && userLocation
      ? `${text}\n[User location: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}]`
      : text

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    const visiblePlaces: Place[] = itinerary?.stops?.length
      ? itinerary.stops.map((s) => ({ ...s, personalization_score: 0, categories: [] }))
      : places

    let mapOnlyReply: string | null = null

    if (isZoomFocusRequest(text) || isListPickRequest(text)) {
      const idx = resolvePlaceIndex(text, visiblePlaces, activeStop)
      if (idx !== null) {
        setActiveStop(idx)
        setMapZoomFocus(true)
        setMapOpen(true)
        if (isZoomFocusRequest(text)) {
          mapOnlyReply = `Centered the map on ${visiblePlaces[idx].name}. Tap Route from me for directions.`
        }
      }
    }

    if (isKeepOnlyRequest(text) || isNamedKeepOnlyRequest(text, visiblePlaces)) {
      const idx = resolvePlaceIndex(text, visiblePlaces, activeStop)
      if (idx !== null) {
        const solo = visiblePlaces[idx]
        setPlaces([solo])
        setItinerary(null)
        setActiveStop(0)
        setMapZoomFocus(true)
        setMapOpen(true)
        soloPlaceModeRef.current = true
        mapOnlyReply = `Showing only ${solo.name} on your map. Tap its card and Route from me when you're ready to go.`
      }
    }

    if (isMapShowRequest(text)) setMapOpen(true)

    // Pure map UI actions — don't call the agent (it may re-search and restore old pins).
    if (mapOnlyReply && !wantsRouteFromUser(text)) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: mapOnlyReply },
      ])
      if (wantSpeak && speakRepliesRef.current) speak(mapOnlyReply)
      return
    }
    const routeRequest = wantsRouteFromUser(text)
    if (routeRequest) {
      setRouteFromUser(true)
      setMapOpen(true)
      const idx = findPlaceIndexInText(text, places)
      if (idx !== null) setActiveStop(idx)
    }
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
          if (s.intent_type === 'LIST_DISCOVERY') {
            setItinerary(null)
          }
          if (s.itinerary && s.intent_type !== 'LIST_DISCOVERY') {
            const parsed = parseItinerary(s.itinerary)
            if (parsed) {
              earlyItinerarySet = true
              setItinerary(parsed)
              setPlaces([])
              setActiveStop(0)
              setMapOpen(true)
              if (!routeRequest) setRouteFromUser(false)
            }
          }
          if (!earlyItinerarySet && s.candidates && !soloPlaceModeRef.current) {
            const parsed = parseCandidates(s.candidates)
            if (parsed) {
              setPlaces(parsed)
              setItinerary(null)
              setMapZoomFocus(false)
              setMapOpen(true)
              setActiveStop((prev) => prev ?? 0)
              if (!routeRequest) {
                setRouteFromUser(false)
                setRouteInfo(null)
              }
            }
          }
          processSessionMapActions(s)
          if (s.suppress_gps_context === '1') setSuppressGpsContext(true)
        } catch { /* non-critical */ }
      }
    }

    try {
      for await (const chunk of streamChat(enriched, USER_ID, sessionId.current)) {
        if (chunk.type === 'thinking') {
          pipelineRan = true
          setThinkingSteps((prev) => [...prev, chunk.label])
          if (chunk.agent === 'map_control') {
            fetchSessionState(USER_ID, sessionId.current)
              .then((s) => {
                processSessionMapActions(s)
                if (s.suppress_gps_context === '1') setSuppressGpsContext(true)
              })
              .catch(() => {})
          }
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

      // Final session fetch — map_control actions + pipeline/candidate hydration.
      const wantsMap = isMapShowRequest(text)
      try {
        const state = await fetchSessionState(USER_ID, sessionId.current)
        processSessionMapActions(state)
        if (state.suppress_gps_context === '1') setSuppressGpsContext(true)
        else if (state.suppress_gps_context === '') setSuppressGpsContext(false)

        if ((pipelineRan && !earlyItinerarySet) || wantsMap) {
          const intent = state.intent_type as string | undefined
          const parsedCandidates = state.candidates ? parseCandidates(state.candidates) : null
          const parsedItinerary =
            state.itinerary && !earlyItinerarySet ? parseItinerary(state.itinerary) : null

          if (parsedCandidates && (intent === 'LIST_DISCOVERY' || !parsedItinerary) && !soloPlaceModeRef.current) {
            setPlaces(parsedCandidates)
            setItinerary(null)
            setMapZoomFocus(false)
            setMapOpen(true)
            setActiveStop((prev) => prev ?? 0)
          } else if (parsedItinerary && intent !== 'LIST_DISCOVERY') {
            setItinerary(parsedItinerary)
            setPlaces([])
            setMapOpen(true)
            setActiveStop(0)
            if (!routeRequest) setRouteFromUser(false)
          }
        }
      } catch { /* non-critical */ }

      if (routeRequest) {
        let list = places
        try {
          const state = await fetchSessionState(USER_ID, sessionId.current)
          const parsed = state.candidates ? parseCandidates(state.candidates) : null
          if (parsed) list = parsed
        } catch { /* use in-memory places */ }
        const idx = findPlaceIndexInText(text, list)
        if (idx !== null) setActiveStop(idx)
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
  }, [userLocation, places, itinerary, activeStop, suppressGpsContext, processSessionMapActions])

  const handleMarkerClick = useCallback((index: number) => {
    setActiveStop(index)
    setMapZoomFocus(true)
    setMapOpen(true)
    const list = itinerary?.stops ?? places
    const item = list[index]
    if (item) setDetailsPlace(item as Place)
    setCustomRoute(null)
    setRouteFromUser(true)
    setRouteInfo(null)
    setRouteError(null)
    void ensureUserLocation()
  }, [places, itinerary, ensureUserLocation])

  const handleRouteFromMe = useCallback(async (index: number) => {
    setActiveStop(index)
    setCustomRoute(null)
    setRouteFromUser(true)
    setRouteInfo(null)
    setRouteError(null)
    setMapOpen(true)
    await ensureUserLocation()
  }, [ensureUserLocation])

  const handlePlaceAsk = useCallback((index: number, prompt: string) => {
    setActiveStop(index)
    setChatCollapsed(false)
    handleSend(prompt)
  }, [handleSend])

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

  const pinsMismatch =
    showUserOnMap &&
    !suppressGpsContext &&
    !!userLocation &&
    places.length > 0 &&
    !itineraryStops &&
    pinsFarFromUser(
      userLocation,
      places.map((p) => p.coordinates),
    )

  const routeActive = routeFromUser || !!customRoute

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
            onMarkerClick={handleMarkerClick}
            userLocation={userLocation}
            theme={theme}
            showUserLocation={showUserOnMap}
            routeFromUser={routeFromUser}
            customRoute={customRoute}
            routeMode={routeMode}
            onRouteInfo={setRouteInfo}
            onRouteError={setRouteError}
            zoomFocusOnActive={mapZoomFocus}
          />
          {pinsMismatch && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-md px-4 py-2 rounded-xl bg-surface/95 border border-gold/40 text-sm text-text backdrop-blur-md">
              Pins look far from your GPS. Ask Hodari to search again in your city (e.g. &quot;find restaurants in Kampala near me&quot;).
            </div>
          )}
          {routeActive && routeError && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-lg px-4 py-2 rounded-xl bg-surface/95 border border-red-500/40 text-sm text-text2 backdrop-blur-md">
              {routeError}
            </div>
          )}
          {routeFromUser && locationPending && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-surface/95 border border-border text-sm text-text2 backdrop-blur-md">
              Getting your location…
            </div>
          )}
          {routeActive && routeInfo && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-surface/95 border border-border shadow-lg text-sm text-text backdrop-blur-md pointer-events-none">
              <span className="text-gold font-medium">{routeInfo.destinationName}</span>
              <span className="text-text2">
                {' · '}{routeInfo.distance}{' · '}{routeInfo.duration} from{' '}
                {routeInfo.originLabel && routeInfo.originLabel !== 'you'
                  ? routeInfo.originLabel
                  : 'you'}
              </span>
            </div>
          )}
          {routeFromUser && !userLocation && !locationPending && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-md px-4 py-2 rounded-xl bg-surface/95 border border-gold/40 text-sm text-text2 backdrop-blur-md text-center">
              Allow location in your browser, then tap <strong className="text-text">Route from me</strong> again.
            </div>
          )}
          {!itineraryStops && places.length > 0 && (
            <PlaceStack
              places={places}
              activeIndex={activeStop}
              onSelect={handleMarkerClick}
              onShowDetails={setDetailsPlace}
              onRouteFromMe={handleRouteFromMe}
              onAsk={handlePlaceAsk}
              hasUserLocation={!!userLocation}
              locationPending={locationPending}
              leftOffset={chatCollapsed ? 0 : chatWidth}
            />
          )}
          {itineraryStops && itineraryStops.length > 0 && (
            <ItineraryStack
              stops={itineraryStops}
              activeIndex={activeStop}
              onSelect={handleMarkerClick}
              voiceSummary={itinerary?.voice_summary}
              onFeedback={handleFeedback}
              onSwap={handleSwap}
              onAsk={handleAsk}
              onShowDetails={(stop) => setDetailsPlace(stop as Place)}
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
      {detailsPlace?.place_id && (
        <PlaceDetailsPanel
          placeId={detailsPlace.place_id}
          fallbackName={detailsPlace.name}
          fallbackMapsUrl={`https://www.google.com/maps/search/?api=1&query=${detailsPlace.coordinates.lat},${detailsPlace.coordinates.lng}&query_place_id=${encodeURIComponent(detailsPlace.place_id)}`}
          onClose={() => setDetailsPlace(null)}
        />
      )}

    </div>
  )
}
