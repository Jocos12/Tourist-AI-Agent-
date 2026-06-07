import { NextRequest, NextResponse } from 'next/server'

import { getBackendBaseUrl } from '@/lib/backend'

// Returns session state (plan, candidates, itinerary) after agent finishes
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')
  const sessionId = searchParams.get('sessionId')

  if (!userId || !sessionId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const res = await fetch(`${getBackendBaseUrl()}/health`, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ status: 'offline', userId, sessionId }, { status: 200 })
  return NextResponse.json({ status: 'ok', userId, sessionId })
}
