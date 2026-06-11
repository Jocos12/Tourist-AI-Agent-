import type { SavedPlace } from './savedPlaces'

export interface AnalyticsBucket {
  label: string
  count: number
}

export interface VisitsOverTimePoint {
  month: string
  count: number
}

export interface SavedAnalytics {
  totalSaved: number
  totalInteractions: number
  averageRating: number | null
  priceMix: AnalyticsBucket[]
  cuisineMix: AnalyticsBucket[]
  likedVsSkipped: { liked: number; skipped: number; disliked: number; visited: number }
  visitsOverTime: VisitsOverTimePoint[]
  hasData: boolean
}

function priceLabel(level: number | string | null | undefined): string {
  if (level == null) return 'Unknown'
  const n = Number(level)
  if (!Number.isFinite(n) || n <= 0) return 'Unknown'
  return '$'.repeat(Math.min(4, Math.round(n)))
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function computeSavedAnalytics(
  savedPlaces: SavedPlace[],
  interactions: Array<Record<string, unknown>>,
): SavedAnalytics {
  const priceCounts = new Map<string, number>()
  const cuisineCounts = new Map<string, number>()
  let ratingSum = 0
  let ratingN = 0

  for (const p of savedPlaces) {
    const pl = priceLabel(p.priceLevel)
    priceCounts.set(pl, (priceCounts.get(pl) ?? 0) + 1)
    const cat = p.cuisine?.trim() || 'Other'
    cuisineCounts.set(cat, (cuisineCounts.get(cat) ?? 0) + 1)
    if (p.rating != null) {
      ratingSum += p.rating
      ratingN++
    }
  }

  const likedVsSkipped = { liked: 0, skipped: 0, disliked: 0, visited: 0 }
  const visitMonths = new Map<string, number>()

  for (const row of interactions) {
    const action = String(row.action ?? '').toLowerCase()
    if (action === 'liked') likedVsSkipped.liked++
    else if (action === 'skipped') likedVsSkipped.skipped++
    else if (action === 'disliked') likedVsSkipped.disliked++
    else if (action === 'visited') {
      likedVsSkipped.visited++
      const ts = String(row.updated_at ?? row.created_at ?? '')
      if (ts) {
        const mk = monthKey(ts)
        visitMonths.set(mk, (visitMonths.get(mk) ?? 0) + 1)
      }
    }
  }

  const visitsOverTime = [...visitMonths.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  const priceMix = [...priceCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const cuisineMix = [...cuisineCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const totalInteractions =
    likedVsSkipped.liked +
    likedVsSkipped.skipped +
    likedVsSkipped.disliked +
    likedVsSkipped.visited

  const hasData =
    savedPlaces.length > 0 ||
    totalInteractions > 0 ||
    visitsOverTime.length > 0

  return {
    totalSaved: savedPlaces.length,
    totalInteractions,
    averageRating: ratingN > 0 ? ratingSum / ratingN : null,
    priceMix,
    cuisineMix,
    likedVsSkipped,
    visitsOverTime,
    hasData,
  }
}

/** Tiny horizontal bar chart as inline SVG (no chart library). */
export function barChartSvg(
  buckets: AnalyticsBucket[],
  maxBars = 6,
  width = 320,
  barHeight = 22,
): string | null {
  const items = buckets.slice(0, maxBars)
  if (items.length === 0) return null
  const max = Math.max(...items.map((b) => b.count), 1)
  const h = items.length * (barHeight + 8) + 8
  const bars = items
    .map((b, i) => {
      const w = Math.round((b.count / max) * (width - 120))
      const y = 8 + i * (barHeight + 8)
      return `
        <text x="0" y="${y + 15}" font-size="11" fill="currentColor" opacity="0.7">${escapeXml(b.label.slice(0, 14))}</text>
        <rect x="110" y="${y}" width="${w}" height="${barHeight}" rx="4" fill="#D97706" opacity="0.85"/>
        <text x="${116 + w}" y="${y + 15}" font-size="11" fill="currentColor">${b.count}</text>
      `
    })
    .join('')
  return `<svg viewBox="0 0 ${width} ${h}" width="100%" height="${h}" role="img" aria-hidden="true">${bars}</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
