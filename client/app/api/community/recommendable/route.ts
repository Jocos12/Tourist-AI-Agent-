import { NextRequest, NextResponse } from 'next/server'
import { getMapUsers, getOrCreateProfile } from '@/lib/community/store'
import { toRecommendableUsers } from '@/lib/community/publicContract'

/**
 * Agent-engineer endpoint: list users safe for the AI recommender.
 * Returns only public fields — see lib/community/publicContract.ts
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? undefined

  try {
    const mapUsers = await getMapUsers(userId)
    const profiles = await Promise.all(mapUsers.map((u) => getOrCreateProfile(u.user_id)))
    return NextResponse.json({
      users: toRecommendableUsers(profiles),
      contract: 'lib/community/publicContract.ts',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
