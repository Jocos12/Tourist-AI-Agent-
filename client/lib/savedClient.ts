import type { SavedPlace } from './savedPlaces'
import type { ReminderView } from './reminders'
import type { SavedAnalytics } from './savedAnalytics'

const CACHE_TTL_MS = 30_000

type CacheEntry<T> = { at: number; userId: string; data: T }

let savedCache: CacheEntry<SavedPlace[]> | null = null
let analyticsCache: CacheEntry<SavedAnalytics> | null = null
let remindersCache: CacheEntry<ReminderView[]> | null = null

export function getClientUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hodari_uid')
}

function headersForUser(userId: string): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-User-Id': userId }
}

export function invalidateSavedCaches() {
  savedCache = null
  analyticsCache = null
  remindersCache = null
}

export async function fetchSavedPlaces(force = false): Promise<SavedPlace[]> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login to view saved places')

  const now = Date.now()
  if (!force && savedCache && savedCache.userId === userId && now - savedCache.at < CACHE_TTL_MS) {
    return savedCache.data
  }

  const res = await fetch('/api/saved', { headers: headersForUser(userId), cache: 'no-store' })
  if (res.status === 401) throw new Error('Please login to view saved places')
  if (!res.ok) throw new Error('Failed to fetch saved places')
  const data = await res.json()
  const list = (data.savedPlaces ?? []) as SavedPlace[]
  savedCache = { at: now, userId, data: list }
  return list
}

export async function savePlace(payload: Record<string, unknown>): Promise<SavedPlace> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login to save places')
  const res = await fetch('/api/saved', {
    method: 'POST',
    headers: headersForUser(userId),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to save place')
  invalidateSavedCaches()
  const data = await res.json()
  return data.savedPlace as SavedPlace
}

export async function removeSavedPlace(placeId: string): Promise<void> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login')
  const res = await fetch(`/api/saved?placeId=${encodeURIComponent(placeId)}`, {
    method: 'DELETE',
    headers: headersForUser(userId),
  })
  if (!res.ok) throw new Error('Failed to remove place')
  invalidateSavedCaches()
}

export async function fetchReminders(force = false): Promise<ReminderView[]> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login')

  const now = Date.now()
  if (!force && remindersCache && remindersCache.userId === userId && now - remindersCache.at < CACHE_TTL_MS) {
    return remindersCache.data
  }

  const res = await fetch('/api/reminders', { headers: headersForUser(userId), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load reminders')
  const data = await res.json()
  const list = (data.reminders ?? []) as ReminderView[]
  remindersCache = { at: now, userId, data: list }
  return list
}

export async function upsertReminder(input: {
  placeId: string
  placeName: string
  scheduledAt: string
  notes?: string | null
  reminderId?: string
}): Promise<void> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login')
  const res = await fetch('/api/reminders', {
    method: input.reminderId ? 'PATCH' : 'POST',
    headers: headersForUser(userId),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to save reminder')
  invalidateSavedCaches()
}

export async function cancelReminder(reminderId: string): Promise<void> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login')
  const res = await fetch(`/api/reminders?id=${encodeURIComponent(reminderId)}`, {
    method: 'DELETE',
    headers: headersForUser(userId),
  })
  if (!res.ok) throw new Error('Failed to cancel reminder')
  invalidateSavedCaches()
}

export async function fetchSavedAnalytics(force = false): Promise<SavedAnalytics> {
  const userId = getClientUserId()
  if (!userId) throw new Error('Please login')

  const now = Date.now()
  if (!force && analyticsCache && analyticsCache.userId === userId && now - analyticsCache.at < CACHE_TTL_MS) {
    return analyticsCache.data
  }

  const res = await fetch('/api/saved/analytics', { headers: headersForUser(userId), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load analytics')
  const data = (await res.json()) as SavedAnalytics
  analyticsCache = { at: now, userId, data }
  return data
}
