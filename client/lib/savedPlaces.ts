import type { Place } from './types'

/** MongoDB `saved_places` document shape. */
export interface SavedPlaceRecord {
  id: string
  user_id: string
  place_id: string
  name: string
  rating: number | null
  price_level: number | null
  cuisine: string | null
  photo_ref: string | null
  comment: string | null
  address: string | null
  city: string | null
  created_at: string
}

/** Client-facing saved place (camelCase). */
export interface SavedPlace {
  id: string
  placeId: string
  name: string
  rating: number | null
  priceLevel: number | null
  cuisine: string | null
  photoRef: string | null
  comment: string | null
  address: string | null
  city: string | null
  createdAt: string
}

export function proxiedPhotoUrl(photoRef: string | null | undefined): string | null {
  if (!photoRef) return null
  if (photoRef.startsWith('/api/')) return photoRef
  return `/api/place-photo?ref=${encodeURIComponent(photoRef)}`
}

export function savedPlaceFromDoc(doc: Record<string, unknown>): SavedPlace {
  return {
    id: String(doc.id ?? doc._id ?? doc.place_id),
    placeId: String(doc.place_id),
    name: String(doc.name ?? 'Place'),
    rating: typeof doc.rating === 'number' ? doc.rating : null,
    priceLevel: typeof doc.price_level === 'number' ? doc.price_level : null,
    cuisine: typeof doc.cuisine === 'string' ? doc.cuisine : null,
    photoRef: typeof doc.photo_ref === 'string' ? doc.photo_ref : null,
    comment: typeof doc.comment === 'string' ? doc.comment : null,
    address: typeof doc.address === 'string' ? doc.address : null,
    city: typeof doc.city === 'string' ? doc.city : null,
    createdAt: String(doc.created_at ?? new Date().toISOString()),
  }
}

export function savedPlaceToDoc(
  userId: string,
  input: {
    placeId: string
    name: string
    rating?: number | null
    priceLevel?: number | null
    cuisine?: string | null
    photoRef?: string | null
    comment?: string | null
    address?: string | null
    city?: string | null
  },
): SavedPlaceRecord {
  const now = new Date().toISOString()
  return {
    id: `${userId}_${input.placeId}`,
    user_id: userId,
    place_id: input.placeId,
    name: input.name,
    rating: input.rating ?? null,
    price_level: input.priceLevel ?? null,
    cuisine: input.cuisine ?? null,
    photo_ref: input.photoRef ?? null,
    comment: input.comment ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    created_at: now,
  }
}

export function placeToSavedPayload(place: Place, comment?: string) {
  const cuisine = place.categories?.[0] ?? null
  const photoRef =
    place.photo_reference ??
    (place.photo_url?.includes('photo_reference=')
      ? new URL(place.photo_url, 'http://x').searchParams.get('photo_reference')
      : null)

  let priceLevel: number | null = null
  if (place.price_level != null) {
    const n = Number(place.price_level)
    priceLevel = Number.isFinite(n) ? n : null
  }

  return {
    placeId: place.place_id,
    name: place.name,
    rating: place.rating ?? null,
    priceLevel,
    cuisine,
    photoRef,
    comment: comment ?? null,
    address: place.address ?? null,
    city: null as string | null,
  }
}

export function savedPlaceToPlace(saved: SavedPlace): Place {
  const photoUrl = proxiedPhotoUrl(saved.photoRef)
  return {
    place_id: saved.placeId,
    name: saved.name,
    address: saved.address ?? '',
    coordinates: { lat: 0, lng: 0 },
    categories: saved.cuisine ? [saved.cuisine] : [],
    rating: saved.rating ?? undefined,
    price_level: saved.priceLevel != null ? String(saved.priceLevel) : undefined,
    photo_reference: saved.photoRef ?? undefined,
    photo_url: photoUrl ?? undefined,
    photos: photoUrl ? [photoUrl] : undefined,
  }
}
