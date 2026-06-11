'use client'

import { Star } from 'lucide-react'
import { Badge, Card, CardLabel } from '@/components/ui'
import type { VisitedPlace } from '@/lib/community/types'

function priceLabel(level?: number | null): string {
  if (!level || level < 1) return '—'
  return '€'.repeat(Math.min(level, 4))
}

interface Props {
  place: VisitedPlace
  compact?: boolean
}

/** Shared visited-restaurant card — reused by community profile and saved page. */
export function VisitedPlaceCard({ place, compact }: Props) {
  return (
    <Card glass={!compact} padding={compact ? 'sm' : 'md'} className="min-w-[200px] shrink-0">
      <CardLabel>{place.city || 'Unknown city'}</CardLabel>
      <p className="font-display text-base font-semibold text-text mt-1 truncate">{place.place_name}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {place.rating != null && (
          <Badge tone="gold" mono>
            <Star className="w-3 h-3 fill-current" aria-hidden />
            {place.rating.toFixed(1)}
          </Badge>
        )}
        <Badge tone="outline" mono>{priceLabel(place.price_level)}</Badge>
      </div>
    </Card>
  )
}
