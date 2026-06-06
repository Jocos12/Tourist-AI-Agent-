import { NextRequest, NextResponse } from 'next/server'

const ADK_BASE = process.env.ADK_BASE_URL ?? 'http://localhost:8000'
const APP_NAME = process.env.ADK_APP_NAME ?? 'hodari'

// Returns session state (plan, candidates, itinerary) after agent finishes
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')
  const sessionId = searchParams.get('sessionId')

  if (!userId || !sessionId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const res = await fetch(
    `${ADK_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
  )

  if (!res.ok) return NextResponse.json({}, { status: 200 })

  const session = await res.json()
  // Return only the output_key values written by sub-agents
  return NextResponse.json({
    plan: session?.state?.plan,
    candidates: session?.state?.candidates,
    itinerary: session?.state?.itinerary,
    intent_type: session?.state?.intent_type,
    map_actions: session?.state?.map_actions,
    suppress_gps_context: session?.state?.suppress_gps_context,
  })
}
