import { NextRequest, NextResponse } from 'next/server'
import { listConnections, listPendingConnections } from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const [connected, pending] = await Promise.all([
      listConnections(userId),
      listPendingConnections(userId),
    ])
    return NextResponse.json({ connected, pending })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
