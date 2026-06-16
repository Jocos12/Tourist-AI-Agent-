import { NextRequest, NextResponse } from 'next/server'
import { syncVisitedFromInteractions } from '@/lib/community/store'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const publicProfile = await syncVisitedFromInteractions(userId)
    return NextResponse.json(publicProfile)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
