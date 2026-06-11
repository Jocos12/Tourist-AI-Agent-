'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Grid3X3, LayoutList, RefreshCw } from 'lucide-react'
import type { SavedPlace } from '@/lib/savedPlaces'
import { savedPlaceToPlace } from '@/lib/savedPlaces'
import type { ReminderView } from '@/lib/reminders'
import {
  cancelReminder,
  fetchReminders,
  fetchSavedPlaces,
  removeSavedPlace,
  upsertReminder,
} from '@/lib/savedClient'
import { PlaceDetailsPanel } from '@/components/PlaceDetailsPanel'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SavedPlaceCard } from './components/SavedPlaceCard'
import { ReminderModal } from './components/ReminderModal'

type LoadState = 'loading' | 'ok' | 'empty' | 'error' | 'unauth'

function formatReminderWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SavedPage() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [reminders, setReminders] = useState<ReminderView[]>([])
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [detail, setDetail] = useState<SavedPlace | null>(null)
  const [reminderTarget, setReminderTarget] = useState<{
    placeId: string
    placeName: string
    existing?: ReminderView | null
  } | null>(null)

  const load = useCallback(async (force = false) => {
    if (!localStorage.getItem('hodari_email')) {
      setLoadState('unauth')
      return
    }
    setLoadState('loading')
    setError(null)
    try {
      const [saved, rems] = await Promise.all([
        fetchSavedPlaces(force),
        fetchReminders(force),
      ])
      setPlaces(saved)
      setReminders(rems)
      setLoadState(saved.length === 0 && rems.length === 0 ? 'empty' : 'ok')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      if (msg.includes('login')) {
        setLoadState('unauth')
      } else {
        setError(msg)
        setLoadState('error')
      }
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reminderByPlace = useMemo(() => {
    const m = new Map<string, ReminderView>()
    for (const r of reminders) m.set(r.placeId, r)
    return m
  }, [reminders])

  async function handleRemove(placeId: string) {
    if (!confirm('Remove this place from your collection?')) return
    try {
      await removeSavedPlace(placeId)
      setPlaces((prev) => prev.filter((p) => p.placeId !== placeId))
      if (detail?.placeId === placeId) setDetail(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not remove')
    }
  }

  async function handleCancelReminder(id: string) {
    try {
      await cancelReminder(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not cancel')
    }
  }

  if (loadState === 'unauth') {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-text2">Sign in to view and manage your saved places.</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Sign in
        </Button>
      </Card>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-text2">
        <div className="thinking-ring" />
        <p className="text-sm">Loading your collection…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-danger">{error ?? 'Something went wrong'}</p>
        <Button className="mt-4" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => load(true)}>
          Retry
        </Button>
      </Card>
    )
  }

  return (
    <>
      {reminders.length > 0 && (
        <section className="mb-8" aria-labelledby="agenda-heading">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <h2 id="agenda-heading" className="font-display text-base font-semibold">
              Upcoming visits
            </h2>
          </div>
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id}>
                <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{r.placeName}</p>
                    <p className="text-[12px] text-text2">{formatReminderWhen(r.scheduledAt)}</p>
                    {r.notes && <p className="mt-1 text-[12px] text-text3">{r.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setReminderTarget({
                          placeId: r.placeId,
                          placeName: r.placeName,
                          existing: r,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleCancelReminder(r.id)}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-text2">
          {places.length} saved {places.length === 1 ? 'place' : 'places'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setLayout('grid')}
              className={`rounded-md p-1.5 ${layout === 'grid' ? 'bg-gold/15 text-gold' : 'text-text2'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setLayout('list')}
              className={`rounded-md p-1.5 ${layout === 'list' ? 'bg-gold/15 text-gold' : 'text-text2'}`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => load(true)}>
            Refresh
          </Button>
        </div>
      </div>

      {loadState === 'empty' || places.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="font-display text-lg font-semibold">No saved places yet</p>
          <p className="mt-2 text-[13px] text-text2">
            Save spots from chat or place details — they&apos;ll show up here with photos and notes.
          </p>
          <Link href="/chat" className="mt-4 inline-block">
            <Button>Open chat</Button>
          </Link>
        </Card>
      ) : (
        <div
          className={
            layout === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col gap-3'
          }
        >
          {places.map((place) => (
            <SavedPlaceCard
              key={place.id}
              place={place}
              layout={layout}
              onOpen={() => setDetail(place)}
              onReminder={() =>
                setReminderTarget({
                  placeId: place.placeId,
                  placeName: place.name,
                  existing: reminderByPlace.get(place.placeId) ?? null,
                })
              }
              onRemove={() => handleRemove(place.placeId)}
            />
          ))}
        </div>
      )}

      {detail && (
        <PlaceDetailsPanel
          placeId={detail.placeId}
          fallbackName={detail.name}
          fallbackMapsUrl={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.name)}&query_place_id=${encodeURIComponent(detail.placeId)}`}
          fallbackPlace={savedPlaceToPlace(detail)}
          showSave={false}
          onClose={() => setDetail(null)}
        />
      )}

      {reminderTarget && (
        <ReminderModal
          open
          placeId={reminderTarget.placeId}
          placeName={reminderTarget.placeName}
          existing={reminderTarget.existing}
          onClose={() => setReminderTarget(null)}
          onSave={async (input) => {
            await upsertReminder(input)
            const rems = await fetchReminders(true)
            setReminders(rems)
          }}
        />
      )}
    </>
  )
}
