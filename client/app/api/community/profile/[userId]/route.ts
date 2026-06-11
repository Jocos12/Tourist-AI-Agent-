import { NextRequest, NextResponse } from 'next/server'
import { getProfileView } from '@/lib/community/store'
import { toRecommendableUser } from '@/lib/community/publicContract'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: targetId } = await params
  const viewerId = req.nextUrl.searchParams.get('viewerId')
  if (!viewerId) return NextResponse.json({ error: 'viewerId required' }, { status: 400 })

  try {
    const profile = await getProfileView(viewerId, targetId)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    return NextResponse.json({
      ...profile,
      recommendable: toRecommendableUser(profile),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
