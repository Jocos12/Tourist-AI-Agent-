'use client'

import { Badge, Card, CardLabel } from '@/components/ui'
import type { PlaceAnalytics } from '@/lib/community/types'

interface Props {
  analytics: PlaceAnalytics
}

/** First-party visit analytics — shared by saved page and community public profile. */
export function PlaceAnalyticsSummary({ analytics }: Props) {
  const priceEntries = Object.entries(analytics.price_mix)

  return (
    <Card padding="md" className="bg-surface2/50">
      <CardLabel>Your food trail</CardLabel>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Stat label="Visited" value={String(analytics.total_visited)} />
        <Stat label="Avg rating" value={analytics.avg_rating != null ? analytics.avg_rating.toFixed(1) : '—'} />
        <Stat label="Cities" value={String(analytics.cities_count)} />
      </div>
      {priceEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {priceEntries.map(([tier, count]) => (
            <Badge key={tier} tone="neutral" mono>{tier} ×{count}</Badge>
          ))}
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-text3 uppercase tracking-wider">{label}</p>
      <p className="font-display text-xl font-semibold text-text mt-0.5">{value}</p>
    </div>
  )
}
