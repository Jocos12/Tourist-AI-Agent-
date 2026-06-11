'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Star } from 'lucide-react'
import type { Place } from '@/lib/types'
import { PlaceImage } from './PlaceImage'

interface Props {
  places: Place[]
  activeIndex: number | null
  onSelect: (index: number) => void
  onShowDetails: (place: Place) => void
  leftOffset?: number
}

function mapsLink(place: Place): string | null {
  if (place.maps_url) return place.maps_url
  if (place.place_id && !place.place_id.startsWith('__')) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${encodeURIComponent(place.place_id)}`
  }
  if (place.coordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`
  }
  return null
}

/** Horizontal place cards with photos — full-map bottom strip. */
export function PlaceCardStrip({ places, activeIndex, onSelect, onShowDetails, leftOffset = 0 }: Props) {
  if (places.length === 0) return null

  return (
    <div
      className="absolute bottom-0 right-0 z-[25] border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md"
      style={{ left: leftOffset }}
    >
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-text3">
        Places · scroll →
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {places.map((place, i) => {
          const isActive = activeIndex === i
          const href = mapsLink(place)
          return (
            <motion.div
              key={`${place.place_id || place.name}-${i}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.22 }}
              className={`w-[min(72vw,220px)] shrink-0 overflow-hidden rounded-xl border transition-all ${
                isActive
                  ? 'border-amber-400/70 shadow-lg ring-1 ring-amber-400/40'
                  : 'border-border bg-surface hover:border-amber-300/50'
              }`}
            >
              <button type="button" onClick={() => onSelect(i)} className="block w-full text-left">
                <PlaceImage
                  place={place}
                  width={440}
                  height={260}
                  className="h-28 w-full object-cover sm:h-32"
                />
                <div className="px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-amber-600">{i + 1}</span>
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-text">{place.name}</p>
                  {place.rating != null && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-text2">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {place.rating.toFixed(1)}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 border-t border-border/60 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => onShowDetails(place)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  Details
                </button>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-text2 transition-colors hover:text-amber-600"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Maps
                  </a>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
