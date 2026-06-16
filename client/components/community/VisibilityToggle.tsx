'use client'

import { Eye, EyeOff, MapPin } from 'lucide-react'
import { Badge, Card, CardLabel } from '@/components/ui'
import { cn } from '@/lib/design/cn'
import type { Visibility } from '@/lib/community/types'

const OPTIONS: { value: Visibility; label: string; description: string; icon: typeof Eye }[] = [
  {
    value: 'active',
    label: 'Active & visible',
    description: 'On the map — others can find and recommend you',
    icon: MapPin,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Hidden from map — searchable, public profile only',
    icon: Eye,
  },
  {
    value: 'invisible',
    label: 'Invisible',
    description: 'Fully hidden — not on map or in search',
    icon: EyeOff,
  },
]

interface Props {
  value: Visibility
  onChange: (v: Visibility) => void
  saving?: boolean
}

/** Prominent three-state visibility control — defaults to private on first visit. */
export function VisibilityToggle({ value, onChange, saving }: Props) {
  return (
    <Card glass padding="md" className="border-gold/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <CardLabel>Your visibility</CardLabel>
          <p className="text-sm text-text2 mt-1">Privacy is opt-in. You start private until you choose otherwise.</p>
        </div>
        <Badge tone={value === 'active' ? 'success' : value === 'invisible' ? 'danger' : 'gold'} mono>
          {value === 'active' ? 'On map' : value === 'invisible' ? 'Hidden' : 'Private'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Visibility">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving}
              onClick={() => onChange(opt.value)}
              className={cn(
                'text-left rounded-xl border p-3 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                selected
                  ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(245,106,0,0.25)]'
                  : 'border-border bg-surface/60 hover:border-gold/30',
                saving && 'opacity-60 cursor-wait',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('w-4 h-4', selected ? 'text-gold' : 'text-text3')} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-text">{opt.label}</span>
              </div>
              <p className="text-xs text-text3 leading-snug">{opt.description}</p>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
