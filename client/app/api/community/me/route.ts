import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateProfile, updateProfile } from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const profile = await getOrCreateProfile(userId)
    return NextResponse.json(profile)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { userId, display_name, visibility, location, public_profile, private_profile } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const profile = await updateProfile(userId, {
      display_name,
      visibility,
      location,
      public_profile,
      private_profile,
    })
    return NextResponse.json(profile)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
