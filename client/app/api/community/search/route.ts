import { NextRequest, NextResponse } from 'next/server'
import { searchUsers } from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const results = await searchUsers(q, userId)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
