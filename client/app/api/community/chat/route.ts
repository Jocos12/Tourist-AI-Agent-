import { NextRequest, NextResponse } from 'next/server'
import { getChatMessages, sendChatMessage } from '@/lib/community/store'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const peerId = req.nextUrl.searchParams.get('peerId')
  if (!userId || !peerId) {
    return NextResponse.json({ error: 'userId and peerId required' }, { status: 400 })
  }

  try {
    const messages = await getChatMessages(userId, peerId)
    return NextResponse.json(messages)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { userId, peerId, text } = await req.json()
  if (!userId || !peerId || !text?.trim()) {
    return NextResponse.json({ error: 'userId, peerId, and text required' }, { status: 400 })
  }

  try {
    const message = await sendChatMessage(userId, peerId, text)
    return NextResponse.json(message)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
