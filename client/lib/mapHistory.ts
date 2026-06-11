import type { Place, Itinerary } from './types'

export interface MapSnapshot {
  id: string
  title: string
  savedAt: number
  places?: Place[]
  itinerary?: Itinerary | null
  activeStopIndex?: number | null
}
