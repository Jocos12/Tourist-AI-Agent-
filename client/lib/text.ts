/**
 * Replace em dashes (— U+2014 and the horizontal bar ― U+2015) with
 * conversational punctuation, so model output doesn't read as machine-written.
 *
 * Applied to all LLM-sourced text before it reaches the UI. The prompt also
 * asks the model to avoid them, but models do it anyway — this is the guarantee.
 *
 *  - A spaced dash ("tapas — 0.4 km away") becomes a comma ("tapas, 0.4 km away").
 *  - A tight dash ("9—5", "open—closed") becomes a hyphen.
 *  - Line breaks are preserved (we only collapse spaces/tabs around the dash).
 */
import type { Itinerary, Place } from './types'

/** Fallback chat copy when the SSE stream ends before the orchestrator presents results. */
export function formatAssistantFallback(
  itinerary: Itinerary | null,
  places: Place[] | null,
): string | null {
  if (itinerary?.stops?.length) {
    const lines = itinerary.stops.map((s, i) => {
      const when =
        s.arrival_time || s.duration_at_stop
          ? ` (${[s.arrival_time, s.duration_at_stop].filter(Boolean).join(' · ')})`
          : ''
      const walk = s.travel_from_prev?.duration
        ? ` · ${s.travel_from_prev.duration} from previous stop`
        : ''
      return `${i + 1}. **${s.name}**${when}${walk}\n   ${s.rationale}`
    })
    const meta = [itinerary.total_duration, itinerary.total_distance].filter(Boolean).join(' · ')
    const footer = itinerary.voice_summary ? `\n\n*${itinerary.voice_summary}*` : ''
    return stripEmDashes(
      `Here's your plan:\n\n${lines.join('\n\n')}${meta ? `\n\nTotal: ${meta}` : ''}${footer}`,
    )
  }

  if (places?.length) {
    const lines = places.map((p, i) => {
      const rating = p.rating != null ? ` · ${p.rating}★` : ''
      const summary = p.summary ? `\n   ${p.summary}` : ''
      return `${i + 1}. **${p.name}**${rating}${summary}`
    })
    return stripEmDashes(`Here are ${places.length} places I found:\n\n${lines.join('\n\n')}`)
  }

  return null
}

export function stripEmDashes(text: string): string {
  if (!text) return text
  return text
    .replace(/[ \t]+[—―][ \t]+/g, ', ')
    .replace(/[—―]/g, '-')
}
