import { NextRequest, NextResponse } from 'next/server'
import { getMapUsers } from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? undefined

  try {
    const users = await getMapUsers(userId)
    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
