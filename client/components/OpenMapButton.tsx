'use client'

import { Map } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'

interface Props {
  message: ChatMessage
  mapVisible: boolean
  onOpen: () => void
}

export function OpenMapButton({ message, mapVisible, onOpen }: Props) {
  const count = message.places?.length ?? message.itinerary?.stops?.length ?? 0
  if (count === 0) return null

  const label = message.itinerary
    ? `View ${count}-stop itinerary on map`
    : `View ${count} place${count !== 1 ? 's' : ''} on map`

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-header)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
    >
      <Map className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      {mapVisible ? 'Update map' : label}
    </button>
  )
}
