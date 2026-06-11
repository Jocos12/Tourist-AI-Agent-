import { NextRequest, NextResponse } from 'next/server'

const KEY =
  process.env.GOOGLE_MAPS_SERVER_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
  ''

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }
  if (!KEY) {
    return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 })
  }

  const fields = [
    'name',
    'rating',
    'user_ratings_total',
    'formatted_address',
    'opening_hours',
    'price_level',
    'photos',
    'url',
    'website',
  ].join(',')

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&key=${KEY}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' || !data.result) {
    return NextResponse.json(
      { error: data.error_message ?? data.status ?? 'Place not found' },
      { status: 404 },
    )
  }

  const r = data.result as {
    name?: string
    rating?: number
    formatted_address?: string
    price_level?: number
    opening_hours?: { open_now?: boolean; weekday_text?: string[] }
    photos?: Array<{ photo_reference: string }>
    url?: string
    website?: string
  }

  const photoUrls = (r.photos ?? [])
    .slice(0, 8)
    .map((p) => `/api/place-photo?ref=${encodeURIComponent(p.photo_reference)}`)

  return NextResponse.json({
    name: r.name,
    rating: r.rating,
    address: r.formatted_address,
    formatted_address: r.formatted_address,
    price_level: r.price_level,
    priceLevel: r.price_level,
    opening_hours: r.opening_hours,
    isOpen: r.opening_hours?.open_now ?? null,
    maps_url: r.url,
    website: r.website,
    photoUrls,
  })
}
