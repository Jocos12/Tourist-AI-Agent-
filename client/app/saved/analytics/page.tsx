'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import type { SavedAnalytics } from '@/lib/savedAnalytics'
import { barChartSvg } from '@/lib/savedAnalytics'
import { fetchSavedAnalytics } from '@/lib/savedClient'
import { Button } from '@/components/ui/Button'
import { Card, CardLabel } from '@/components/ui/Card'

type LoadState = 'loading' | 'ok' | 'empty' | 'error' | 'unauth'

function visitsLineSvg(points: { month: string; count: number }[]): string | null {
  if (points.length === 0) return null
  const w = 320
  const h = 120
  const pad = 24
  const max = Math.max(...points.map((p) => p.count), 1)
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = pad + i * step
    const y = h - pad - (p.count / max) * (h - pad * 2)
    return `${x},${y}`
  })
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Visits over time"><polyline fill="none" stroke="#D97706" stroke-width="2" points="${coords.join(' ')}"/></svg>`
}

export default function SavedAnalyticsPage() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SavedAnalytics | null>(null)

  const load = useCallback(async (force = false) => {
    if (!localStorage.getItem('hodari_email')) {
      setLoadState('unauth')
      return
    }
    setLoadState('loading')
    setError(null)
    try {
      const analytics = await fetchSavedAnalytics(force)
      setData(analytics)
      setLoadState(analytics.hasData ? 'ok' : 'empty')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      if (msg.includes('login')) setLoadState('unauth')
      else {
        setError(msg)
        setLoadState('error')
      }
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loadState === 'unauth') {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-text2">Sign in to see your taste analytics.</p>
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
        <p className="text-sm">Crunching your data…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-danger">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => load(true)}>
          Retry
        </Button>
      </Card>
    )
  }

  if (loadState === 'empty' || !data?.hasData) {
    return (
      <Card padding="lg" className="text-center">
        <p className="font-display text-lg font-semibold">No analytics yet</p>
        <p className="mt-2 text-[13px] text-text2">
          Save places and interact with Hodari (like, skip, visit) — charts appear from your real activity only.
        </p>
      </Card>
    )
  }

  const priceSvg = barChartSvg(data.priceMix)
  const cuisineSvg = barChartSvg(data.cuisineMix)
  const visitsSvg = visitsLineSvg(data.visitsOverTime)
  const { liked, skipped, disliked, visited } = data.likedVsSkipped
  const feedbackTotal = liked + skipped + disliked + visited

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-text2">From your saves and interactions — no estimates.</p>
        <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => load(true)}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardLabel>Saved</CardLabel>
          <p className="mt-2 font-display text-3xl font-semibold">{data.totalSaved}</p>
        </Card>
        <Card>
          <CardLabel>Avg rating</CardLabel>
          <p className="mt-2 font-display text-3xl font-semibold">
            {data.averageRating != null ? data.averageRating.toFixed(1) : '—'}
          </p>
        </Card>
        <Card>
          <CardLabel>Interactions</CardLabel>
          <p className="mt-2 font-display text-3xl font-semibold">{data.totalInteractions}</p>
        </Card>
      </div>

      {priceSvg && (
        <Card>
          <CardLabel>Price mix</CardLabel>
          <div className="mt-3 text-text" dangerouslySetInnerHTML={{ __html: priceSvg }} />
        </Card>
      )}

      {cuisineSvg && (
        <Card>
          <CardLabel>Cuisine mix</CardLabel>
          <div className="mt-3 text-text" dangerouslySetInnerHTML={{ __html: cuisineSvg }} />
        </Card>
      )}

      {feedbackTotal > 0 && (
        <Card>
          <CardLabel>Liked vs skipped</CardLabel>
          <ul className="mt-3 space-y-2 text-[13px]">
            {[
              ['Liked', liked],
              ['Skipped', skipped],
              ['Disliked', disliked],
              ['Visited', visited],
            ].map(([label, n]) => (
              <li key={String(label)} className="flex justify-between border-b border-border/50 py-1 last:border-0">
                <span className="text-text2">{label}</span>
                <span className="font-medium">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {visitsSvg && (
        <Card>
          <CardLabel>Visits over time</CardLabel>
          <div className="mt-3 text-text" dangerouslySetInnerHTML={{ __html: visitsSvg }} />
          <ul className="mt-2 flex flex-wrap gap-2 text-[10px] text-text3">
            {data.visitsOverTime.map((p) => (
              <li key={p.month}>
                {p.month}: {p.count}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
