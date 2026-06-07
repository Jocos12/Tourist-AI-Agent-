import type { Coordinates, Itinerary, ItineraryStop, Place, StreamChunk, TravelLeg } from './types'

const AGENT_LABELS: Record<string, string> = {
  planner: 'Planning your trip',
  researcher: 'Searching nearby places',
  itinerary: 'Building your itinerary',
}

export async function* streamChat(
  message: string,
  userId: string,
  sessionId: string,
  location?: Coordinates | null,
  options?: { feedback?: 'liked' | 'disliked' | 'category_reject'; placeId?: string | null },
): AsyncGenerator<StreamChunk> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId,
      sessionId,
      location,
      lat: location?.lat,
      lng: location?.lng,
      feedback: options?.feedback,
      placeId: options?.placeId,
    }),
  })

  if (!res.ok || !res.body) {
    let detail = ''
    try {
      const payload = await res.json()
      detail = [payload.error, payload.detail].filter(Boolean).join(' — ')
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(detail || `Chat request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const seenAgents = new Set<string>()
  let emittedAnswer = false
  let pendingItinerary: unknown = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue

      try {
        const event = JSON.parse(raw)
        if (event.type === 'ping') continue

        if (event.type === 'error') {
          yield { type: 'text', text: `Something went wrong: ${event.message ?? 'The agent failed to complete this turn.'}` }
          return
        }

        if (event.type === 'token') {
          const agent = event.agent as string | undefined
          if (agent && !seenAgents.has(agent) && AGENT_LABELS[agent]) {
            seenAgents.add(agent)
            yield { type: 'thinking', agent, label: AGENT_LABELS[agent] }
          }
          continue
        }

        if (event.type === 'answer' && event.content) {
          emittedAnswer = true
          yield { type: 'text', text: String(event.content) }
          continue
        }

        if (event.type === 'plan_ready' && !seenAgents.has('planner')) {
          seenAgents.add('planner')
          yield { type: 'thinking', agent: 'planner', label: AGENT_LABELS.planner }
          continue
        }

        if (event.type === 'map_pin' && event.place) {
          if (!seenAgents.has('researcher')) {
            seenAgents.add('researcher')
            yield { type: 'thinking', agent: 'researcher', label: AGENT_LABELS.researcher }
          }
          yield { type: 'place', place: normalizePlace(event.place) }
          continue
        }

        if (event.type === 'card' && !seenAgents.has('itinerary')) {
          seenAgents.add('itinerary')
          yield { type: 'thinking', agent: 'itinerary', label: AGENT_LABELS.itinerary }
          continue
        }

        if (event.type === 'itinerary' && event.itinerary) {
          pendingItinerary = event.itinerary
          yield { type: 'itinerary', itinerary: normalizeItinerary(event.itinerary) }
          continue
        }

        if (event.type === 'done') {
          if (!emittedAnswer && pendingItinerary) {
            yield { type: 'text', text: formatItinerary(pendingItinerary as Parameters<typeof formatItinerary>[0]) }
          }
          return
        }
      } catch {
        // non-JSON SSE line — skip
      }
    }
  }
}

function normalizePlace(raw: {
  place_id?: string
  name?: string
  address?: string
  lat?: number
  lng?: number
  coordinates?: Coordinates
  rating?: number
  price_level?: number | string
  match_reason?: string
  summary?: string
}): Place {
  const coordinates = raw.coordinates ?? { lat: Number(raw.lat ?? 0), lng: Number(raw.lng ?? 0) }
  const placeId = raw.place_id ?? `${raw.name ?? 'place'}-${coordinates.lat}-${coordinates.lng}`

  return {
    place_id: placeId,
    name: raw.name ?? 'Suggested place',
    address: raw.address ?? 'Address unavailable',
    coordinates,
    categories: [],
    rating: raw.rating,
    price_level: raw.price_level,
    summary: raw.match_reason ?? raw.summary,
    maps_url: `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}&query_place_id=${encodeURIComponent(placeId)}`,
  }
}

function normalizeItinerary(raw: {
  voice_summary?: string
  total_duration_m?: number
  total_cost_estimate?: number
  stops?: Array<{
    place_id?: string
    name?: string
    address?: string
    lat?: number
    lng?: number
    coordinates?: Coordinates
    arrival_time?: string
    dwell_time_m?: number
    duration_at_stop?: string
    rationale?: string
  }>
  transitions?: Array<{
    from_place_id?: string
    to_place_id?: string
    travel_mode?: string
    duration_m?: number
    distance_m?: number
    distance?: string
    duration?: string
    polyline?: string
    encoded_polyline?: string
  }>
}): Itinerary {
  const transitions = raw.transitions ?? []
  const stops: ItineraryStop[] = (raw.stops ?? []).map((stop, index) => {
    const coordinates = stop.coordinates ?? { lat: Number(stop.lat ?? 0), lng: Number(stop.lng ?? 0) }
    const transition = index > 0 ? transitions[index - 1] : undefined
    const travel_from_prev: TravelLeg | undefined = transition
      ? {
          distance: transition.distance ?? formatDistance(transition.distance_m),
          duration: transition.duration ?? formatDuration(transition.duration_m),
          encoded_polyline: transition.encoded_polyline ?? transition.polyline,
        }
      : undefined

    return {
      place_id: stop.place_id ?? `${stop.name ?? 'stop'}-${index}`,
      name: stop.name ?? `Stop ${index + 1}`,
      address: stop.address ?? 'Address unavailable',
      coordinates,
      arrival_time: formatArrival(stop.arrival_time),
      duration_at_stop: stop.duration_at_stop ?? (stop.dwell_time_m ? `${stop.dwell_time_m} min` : undefined),
      travel_from_prev,
      rationale: stop.rationale ?? 'Selected because it matches your plan and constraints.',
    }
  })

  return {
    stops,
    total_duration: raw.total_duration_m ? `${raw.total_duration_m} min` : undefined,
    total_cost_estimate: raw.total_cost_estimate,
    voice_summary: raw.voice_summary ?? '',
  }
}

function formatArrival(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDistance(distanceM?: number): string {
  if (!distanceM) return 'nearby'
  if (distanceM < 1000) return `${Math.round(distanceM)} m`
  return `${(distanceM / 1000).toFixed(1)} km`
}

function formatDuration(durationM?: number): string {
  return durationM ? `${durationM} min` : 'short walk'
}

export async function fetchSessionState(
  userId: string,
  sessionId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/session?userId=${userId}&sessionId=${sessionId}`)
  if (!res.ok) return {}
  return res.json()
}

export async function transcribeVoice(audio: Blob): Promise<{ transcription: string; session_id: string }> {
  const formData = new FormData()
  formData.set('audio', audio, 'voice.webm')

  const res = await fetch('/api/voice', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Voice request failed: ${res.status}`)
  }

  return res.json()
}

function formatItinerary(itinerary: {
  voice_summary?: string
  rationale?: string
  total_duration_m?: number
  total_cost_estimate?: number
  stops?: Array<{ name: string; rationale?: string; arrival_time?: string; dwell_time_m?: number }>
}) {
  const lines = [
    itinerary.voice_summary,
    itinerary.rationale,
    itinerary.total_duration_m ? `Total time: ${itinerary.total_duration_m} min` : undefined,
    typeof itinerary.total_cost_estimate === 'number' ? `Estimated cost: $${itinerary.total_cost_estimate.toFixed(0)}` : undefined,
  ].filter(Boolean) as string[]

  if (itinerary.stops?.length) {
    lines.push(
      '',
      '### Suggested stops',
      ...itinerary.stops.map((stop, index) => {
        const details = [stop.arrival_time ? `arrival ${stop.arrival_time}` : undefined, stop.dwell_time_m ? `${stop.dwell_time_m} min` : undefined]
          .filter(Boolean)
          .join(', ')
        return `${index + 1}. **${stop.name}**${details ? ` (${details})` : ''}${stop.rationale ? ` - ${stop.rationale}` : ''}`
      }),
    )
  }

  return lines.join('\n')
}
