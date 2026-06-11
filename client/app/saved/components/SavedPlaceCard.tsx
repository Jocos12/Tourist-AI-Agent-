'use client'

import { Calendar, Star, Trash2 } from 'lucide-react'
import type { SavedPlace } from '@/lib/savedPlaces'
import { proxiedPhotoUrl } from '@/lib/savedPlaces'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

function priceSymbol(level: number | null): string {
  if (level == null || level <= 0) return '—'
  return '$'.repeat(Math.min(4, Math.round(level)))
}

interface Props {
  place: SavedPlace
  layout: 'grid' | 'list'
  onOpen: () => void
  onReminder: () => void
  onRemove: () => void
}

export function SavedPlaceCard({ place, layout, onOpen, onReminder, onRemove }: Props) {
  const photo = proxiedPhotoUrl(place.photoRef)
  const initials = place.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  if (layout === 'list') {
    return (
      <Card interactive padding="none" className="flex overflow-hidden" onClick={onOpen}>
        <div className="h-24 w-28 shrink-0 bg-surface2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-xl text-gold/50">{initials}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div>
            <h3 className="truncate font-medium text-text">{place.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-text2">
              {place.rating != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {place.rating.toFixed(1)}
                </span>
              )}
              <span>{priceSymbol(place.priceLevel)}</span>
              {place.cuisine && <Badge tone="outline">{place.cuisine}</Badge>}
            </div>
            {place.comment && (
              <p className="mt-1.5 line-clamp-2 text-[12px] text-text3">&ldquo;{place.comment}&rdquo;</p>
            )}
          </div>
          <CardActions onReminder={onReminder} onRemove={onRemove} />
        </div>
      </Card>
    )
  }

  return (
    <Card interactive padding="none" className="flex flex-col overflow-hidden" onClick={onOpen}>
      <div className="relative h-36 bg-surface2">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-3xl text-gold/50">{initials}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-medium leading-snug text-text">{place.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text2">
          {place.rating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {place.rating.toFixed(1)}
            </span>
          )}
          <span>{priceSymbol(place.priceLevel)}</span>
        </div>
        {place.cuisine && (
          <Badge tone="outline" className="mt-2 w-fit">
            {place.cuisine}
          </Badge>
        )}
        {place.comment && (
          <p className="mt-2 line-clamp-2 text-[12px] text-text3">&ldquo;{place.comment}&rdquo;</p>
        )}
        <div className="mt-auto pt-3">
          <CardActions onReminder={onReminder} onRemove={onRemove} />
        </div>
      </div>
    </Card>
  )
}

function CardActions({
  onReminder,
  onRemove,
}: {
  onReminder: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onReminder}
        title="Set visit reminder"
        className="rounded-lg border border-border p-1.5 text-text2 transition-colors hover:border-gold/40 hover:text-gold"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Remove from saved"
        className="rounded-lg border border-border p-1.5 text-text2 transition-colors hover:border-danger/40 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
