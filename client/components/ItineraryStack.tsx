'use client'

import type { ItineraryStop } from '@/lib/types'

interface Props {
  stops: ItineraryStop[]
  activeIndex: number | null
  onSelect: (index: number) => void
  voiceSummary?: string
}

export function ItineraryStack({ stops, activeIndex, onSelect, voiceSummary }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-md border-t border-border">
      {/* Voice summary strip */}
      {voiceSummary && (
        <div className="px-4 pt-3 pb-1 border-b border-border/50">
          <p className="font-mono text-[11px] text-text2 italic tracking-wide line-clamp-1">
            <span className="text-gold not-italic mr-2">›</span>
            {voiceSummary}
          </p>
        </div>
      )}

      {/* Ticket cards */}
      <div className="overflow-x-auto flex gap-3 px-4 py-3 scrollbar-hide">
        {stops.map((stop, i) => {
          const isActive = activeIndex === i
          return (
            <button
              key={stop.place_id ?? i}
              onClick={() => onSelect(i)}
              className={`flex-shrink-0 w-56 rounded-xl overflow-hidden text-left transition-all duration-300 relative group ${
                isActive
                  ? 'ring-1 ring-gold shadow-[0_0_20px_rgba(232,160,32,0.15)]'
                  : 'ring-1 ring-border hover:ring-border/80'
              }`}
            >
              {/* Background stop number watermark */}
              <span
                className="absolute right-2 bottom-1 font-display font-bold text-[64px] leading-none pointer-events-none select-none"
                style={{ color: isActive ? 'rgba(232,160,32,0.08)' : 'rgba(255,255,255,0.04)' }}
              >
                {i + 1}
              </span>

              <div className={`h-full p-3 ${isActive ? 'bg-surface2' : 'bg-surface'}`}>
                {/* Stop index + time row */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-[10px] tracking-widest uppercase ${isActive ? 'text-gold' : 'text-text3'}`}>
                    Stop {i + 1}
                  </span>
                  {stop.arrival_time && (
                    <span className="font-mono text-[10px] text-text2">{stop.arrival_time}</span>
                  )}
                </div>

                {/* Perforation line */}
                <div className="border-t border-dashed border-border mb-2" />

                {/* Place name */}
                <p className={`font-display text-sm font-semibold leading-snug mb-1.5 ${isActive ? 'text-text' : 'text-text/80'}`}>
                  {stop.name}
                </p>

                {/* Duration + travel */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                  {stop.duration_at_stop && (
                    <span className="font-mono text-[10px] text-text2">{stop.duration_at_stop}</span>
                  )}
                  {stop.travel_from_prev && (
                    <span className="font-mono text-[10px] text-text3">
                      {stop.travel_from_prev.distance} · {stop.travel_from_prev.duration}
                    </span>
                  )}
                </div>

                {/* Rationale */}
                <p className="text-[11px] text-text2 leading-relaxed line-clamp-2 font-sans">
                  {stop.rationale}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
