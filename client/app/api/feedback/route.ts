import { NextRequest, NextResponse } from 'next/server'

import { getBackendBaseUrl } from '@/lib/backend'

export async function POST(req: NextRequest) {
  const { userId, sessionId, placeId, action, location } = await req.json()
  if (!userId || !placeId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const feedback = action === 'category_reject' ? 'category_reject' : 'disliked'
    const res = await fetch(`${getBackendBaseUrl()}/agent/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId ?? 'default',
        message: 'Feedback on itinerary item',
        location: location ?? { lat: 0, lng: 0 },
        feedback,
        place_id: placeId,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Backend feedback failed' }, { status: 502 })
    return NextResponse.json({ ok: true, placeId, action })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
