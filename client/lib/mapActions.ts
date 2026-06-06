import { findPlaceIndexInText } from './mapIntents'
import type { Itinerary, Place } from './types'
import type { LatLng } from './geo'

export type TravelMode = 'WALK' | 'DRIVE'

export type MapAction =
  | { op: 'hide_user_location' }
  | { op: 'show_user_location' }
  | { op: 'open_map' }
  | { op: 'close_map' }
  | { op: 'clear_route' }
  | { op: 'focus_place'; place_index?: number; place_name?: string }
  | { op: 'keep_only'; place_index?: number; place_name?: string }
  | { op: 'route'; from: 'user' | 'landmark'; landmark?: string; to_place_index?: number; to_place_name?: string; mode?: TravelMode }
  | { op: 'suppress_gps_context' }

export interface CustomRouteConfig {
  from: 'user' | 'landmark'
  landmark?: string
  destinationIndex: number
  mode: TravelMode
}

export interface MapActionContext {
  places: Place[]
  itinerary: Itinerary | null
  activeStop: number | null
}

export interface MapActionEffects {
  showUserOnMap?: boolean
  suppressGpsContext?: boolean
  mapOpen?: boolean
  mapZoomFocus?: boolean
  activeStop?: number | null
  places?: Place[]
  clearItinerary?: boolean
  soloPlaceMode?: boolean
  routeFromUser?: boolean
  customRoute?: CustomRouteConfig | null
  routeMode?: TravelMode
}

const VALID_OPS = new Set([
  'hide_user_location',
  'show_user_location',
  'open_map',
  'close_map',
  'clear_route',
  'focus_place',
  'keep_only',
  'route',
  'suppress_gps_context',
])

export function parseMapActions(raw: unknown): MapAction[] {
  if (!raw) return []
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const clean = str.trim()
    if (!clean || clean === '""' || clean === '[]') return []
    const parsed = JSON.parse(clean) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is MapAction =>
        typeof a === 'object' &&
        a !== null &&
        'op' in a &&
        typeof (a as { op: string }).op === 'string' &&
        VALID_OPS.has((a as { op: string }).op),
    )
  } catch {
    return []
  }
}

function visiblePlaces(ctx: MapActionContext): Place[] {
  if (ctx.itinerary?.stops?.length) {
    return ctx.itinerary.stops.map((s) => ({
      ...s,
      personalization_score: 0,
      categories: [] as string[],
    }))
  }
  return ctx.places
}

function resolveIndex(
  action: { place_index?: number; place_name?: string },
  list: Place[],
  fallback: number | null,
): number | null {
  if (
    typeof action.place_index === 'number' &&
    action.place_index >= 0 &&
    action.place_index < list.length
  ) {
    return action.place_index
  }
  if (action.place_name) {
    const idx = findPlaceIndexInText(action.place_name, list)
    if (idx !== null) return idx
  }
  if (fallback !== null && fallback < list.length) return fallback
  return null
}

/** Apply agent map_control actions to client UI state. */
export function applyMapActions(
  actions: MapAction[],
  ctx: MapActionContext,
): MapActionEffects {
  const effects: MapActionEffects = {}
  const list = visiblePlaces(ctx)
  let active = ctx.activeStop

  for (const action of actions) {
    switch (action.op) {
      case 'hide_user_location':
        effects.showUserOnMap = false
        effects.routeFromUser = false
        effects.customRoute = null
        break
      case 'show_user_location':
        effects.showUserOnMap = true
        effects.suppressGpsContext = false
        break
      case 'open_map':
        effects.mapOpen = true
        break
      case 'close_map':
        effects.mapOpen = false
        break
      case 'clear_route':
        effects.routeFromUser = false
        effects.customRoute = null
        break
      case 'suppress_gps_context':
        effects.suppressGpsContext = true
        effects.showUserOnMap = false
        break
      case 'focus_place': {
        const idx = resolveIndex(action, list, active)
        if (idx !== null) {
          active = idx
          effects.activeStop = idx
          effects.mapZoomFocus = true
          effects.mapOpen = true
        }
        break
      }
      case 'keep_only': {
        const idx = resolveIndex(action, list, active)
        if (idx !== null) {
          effects.places = [list[idx]]
          effects.clearItinerary = true
          effects.activeStop = 0
          effects.soloPlaceMode = true
          effects.mapZoomFocus = true
          effects.mapOpen = true
          active = 0
        }
        break
      }
      case 'route': {
        const destIdx = resolveIndex(
          {
            place_index: action.to_place_index,
            place_name: action.to_place_name,
          },
          list,
          active,
        )
        if (destIdx === null) break
        const mode = action.mode === 'DRIVE' ? 'DRIVE' : 'WALK'
        effects.activeStop = destIdx
        effects.mapOpen = true
        effects.routeMode = mode
        active = destIdx
        if (action.from === 'user') {
          effects.routeFromUser = true
          effects.customRoute = null
        } else if (action.landmark) {
          effects.routeFromUser = false
          effects.customRoute = {
            from: 'landmark',
            landmark: action.landmark,
            destinationIndex: destIdx,
            mode,
          }
          effects.showUserOnMap = false
        }
        break
      }
      default:
        break
    }
  }

  return effects
}

export function mergeMapActionEffects(
  current: MapActionEffects,
  next: MapActionEffects,
): MapActionEffects {
  return { ...current, ...next }
}

/** Whether to attach GPS coordinates to the agent message. */
export function shouldAttachGps(
  text: string,
  userLocation: LatLng | null,
  suppressGpsContext: boolean,
): boolean {
  if (!userLocation) return false
  if (suppressGpsContext) return false
  const t = text.toLowerCase()
  if (/\b(hide|don't show|do not show|remove)\b.{0,30}\b(my )?(location|gps|position)\b/.test(t)) {
    return false
  }
  if (/\b(not from me|don't route from me|do not route from me|ignore my (gps|location))\b/.test(t)) {
    return false
  }
  if (
    /\b(without my location|ignore my gps|not my location)\b/.test(t)
  ) {
    return false
  }
  // Browsing a named place/city — don't bias search with distant GPS.
  if (
    /\b(near|around|by|from)\b.{0,40}\b(louvre|paris|eiffel|musee|musée|museum)\b/.test(t) &&
    !/\bnear me\b/.test(t)
  ) {
    return false
  }
  return true
}
