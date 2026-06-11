import { NextRequest, NextResponse } from 'next/server'
import { userIdFromRequest } from '@/lib/apiUser'
import { mcpFind } from '@/lib/mcp'
import { computeSavedAnalytics } from '@/lib/savedAnalytics'
import { savedPlaceFromDoc } from '@/lib/savedPlaces'

export async function GET(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  try {
    const [savedDocs, interactionDocs] = await Promise.all([
      mcpFind('saved_places', { user_id: userId }, 500),
      mcpFind('interactions', { user_id: userId }, 1000),
    ])

    const savedPlaces = savedDocs.map(savedPlaceFromDoc)
    const analytics = computeSavedAnalytics(savedPlaces, interactionDocs)

    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
