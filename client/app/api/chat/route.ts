import { NextRequest } from 'next/server'

import { getBackendBaseUrl } from '@/lib/backend'

async function backendReachable(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`, { cache: 'no-store' }, 3000)
    return res.ok
  } catch {
    return false
  }
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export async function POST(req: NextRequest) {
  let body: {
    message?: string
    userId?: string
    sessionId?: string
    location?: { lat: number; lng: number }
    lat?: number
    lng?: number
    feedback?: unknown
    placeId?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, userId, sessionId, location, lat, lng, feedback, placeId } = body
  const requestLocation = location ?? (typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined)
  const backendBaseUrl = getBackendBaseUrl()

  if (!message?.trim() || !userId?.trim() || !sessionId?.trim()) {
    return Response.json(
      { error: 'Missing message, userId, or sessionId' },
      { status: 400 },
    )
  }

  if (!(await backendReachable(backendBaseUrl))) {
    return Response.json(
      {
        error: 'Hodari backend is not running',
        detail: `Start it with: cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8001`,
        backendUrl: backendBaseUrl,
      },
      { status: 503 },
    )
  }

  let backendRes: Response
  try {
    backendRes = await fetchWithTimeout(
      `${backendBaseUrl}/agent/turn`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message,
          location: requestLocation ?? { lat: 0, lng: 0 },
          lat: requestLocation?.lat,
          lng: requestLocation?.lng,
          session_id: sessionId,
          feedback: feedback ?? null,
          place_id: placeId ?? null,
        }),
      },
      120_000,
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Connection failed'
    return Response.json(
      { error: `Cannot reach Hodari backend at ${backendBaseUrl}`, detail },
      { status: 502 },
    )
  }

  if (!backendRes.ok) {
    const detail = await backendRes.text().catch(() => '')
    return Response.json(
      {
        error: 'Backend rejected the chat request',
        backendUrl: backendBaseUrl,
        status: backendRes.status,
        detail: detail.slice(0, 300),
      },
      { status: backendRes.status === 404 ? 502 : backendRes.status },
    )
  }

  if (!backendRes.body) {
    return Response.json({ error: 'Backend returned an empty stream' }, { status: 502 })
  }

  return new Response(backendRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
