import { NextRequest, NextResponse } from 'next/server'
import { requestConnection } from '@/lib/community/store'

export async function POST(req: NextRequest) {
  const { fromUserId, toUserId } = await req.json()
  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: 'fromUserId and toUserId required' }, { status: 400 })
  }

  try {
    const status = await requestConnection(fromUserId, toUserId)
    return NextResponse.json({ status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
