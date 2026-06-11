import { NextRequest, NextResponse } from 'next/server'
import { userIdFromRequest } from '@/lib/apiUser'
import { mcpDeleteMany, mcpFind, mcpInsertMany, mcpUpdateMany } from '@/lib/mcp'
import { reminderFromDoc, reminderToDoc, type ReminderInput } from '@/lib/reminders'

export async function GET(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  try {
    const docs = await mcpFind('reminders', { user_id: userId }, 100)
    const reminders = docs
      .map(reminderFromDoc)
      .filter((r) => r.status === 'scheduled')
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return NextResponse.json(
      { reminders },
      { headers: { 'Cache-Control': 'private, max-age=30' } },
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  const body = await req.json()
  const input: ReminderInput = {
    placeId: String(body.placeId ?? ''),
    placeName: String(body.placeName ?? ''),
    scheduledAt: String(body.scheduledAt ?? ''),
    notes: body.notes ?? null,
    timezone: body.timezone ?? null,
  }

  if (!input.placeId || !input.placeName || !input.scheduledAt) {
    return NextResponse.json({ error: 'placeId, placeName, scheduledAt required' }, { status: 400 })
  }

  try {
    const doc = reminderToDoc(userId, input)
    await mcpInsertMany('reminders', [doc as unknown as Record<string, unknown>])
    return NextResponse.json({ reminder: reminderFromDoc(doc as unknown as Record<string, unknown>) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  const body = await req.json()
  const reminderId = String(body.reminderId ?? '')
  if (!reminderId) {
    return NextResponse.json({ error: 'reminderId required' }, { status: 400 })
  }

  const $set: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.scheduledAt) $set.scheduled_at = body.scheduledAt
  if (body.notes !== undefined) $set.notes = body.notes

  try {
    await mcpUpdateMany(
      'reminders',
      { user_id: userId, id: reminderId },
      { $set },
      false,
    )
    const docs = await mcpFind('reminders', { user_id: userId, id: reminderId }, 1)
    if (!docs.length) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }
    return NextResponse.json({ reminder: reminderFromDoc(docs[0]) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    await mcpUpdateMany(
      'reminders',
      { user_id: userId, id },
      { $set: { status: 'cancelled', updated_at: new Date().toISOString() } },
      false,
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
