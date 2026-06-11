'use client'

import { useEffect, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import type { ReminderView } from '@/lib/reminders'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  placeId: string
  placeName: string
  existing?: ReminderView | null
  onClose: () => void
  onSave: (input: {
    placeId: string
    placeName: string
    scheduledAt: string
    notes?: string | null
    reminderId?: string
  }) => Promise<void>
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ReminderModal({ open, placeId, placeName, existing, onClose, onSave }: Props) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setScheduledAt(existing ? toLocalInputValue(existing.scheduledAt) : '')
    setNotes(existing?.notes ?? '')
    setError(null)
  }, [open, existing])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) {
      setError('Pick a date and time')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const iso = new Date(scheduledAt).toISOString()
      await onSave({
        placeId,
        placeName,
        scheduledAt: iso,
        notes: notes.trim() || null,
        reminderId: existing?.id,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reminder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gold">Visit reminder</p>
            <h2 className="mt-1 font-display text-lg font-semibold">{placeName}</h2>
            <p className="mt-1 text-[12px] text-text2">In-app only — no Google Calendar sync.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-text2 hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-text2">
            <Calendar className="h-3.5 w-3.5" />
            When
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold/50"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-text2">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Table for 4, match day lunch…"
            className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold/50"
          />
        </label>

        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {existing ? 'Update reminder' : 'Set reminder'}
          </Button>
        </div>
      </form>
    </div>
  )
}
