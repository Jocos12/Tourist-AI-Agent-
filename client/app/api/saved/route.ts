import { NextRequest, NextResponse } from 'next/server'
import { userIdFromRequest } from '@/lib/apiUser'
import {
  mcpDeleteMany,
  mcpFind,
  mcpInsertMany,
  mcpUpdateMany,
} from '@/lib/mcp'
import { savedPlaceFromDoc, savedPlaceToDoc } from '@/lib/savedPlaces'

async function recordSavedInteraction(
  userId: string,
  placeId: string,
  placeName: string,
  city: string | null,
) {
  try {
    await mcpUpdateMany(
      'interactions',
      { user_id: userId, place_id: placeId },
      {
        $set: {
          user_id: userId,
          place_id: placeId,
          place_name: placeName,
          city: city ?? '',
          action: 'saved',
          updated_at: new Date().toISOString(),
        },
      },
      true,
    )
  } catch {
    /* non-blocking */
  }
}

export async function GET(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  try {
    const docs = await mcpFind('saved_places', { user_id: userId }, 200)
    const savedPlaces = docs.map(savedPlaceFromDoc).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
    return NextResponse.json(
      { savedPlaces },
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
  const placeId = String(body.placeId ?? '')
  const name = String(body.name ?? '')
  if (!placeId || !name) {
    return NextResponse.json({ error: 'placeId and name required' }, { status: 400 })
  }

  try {
    const existing = await mcpFind('saved_places', { user_id: userId, place_id: placeId }, 1)
    if (existing.length > 0) {
      return NextResponse.json({ savedPlace: savedPlaceFromDoc(existing[0]) })
    }

    const doc = savedPlaceToDoc(userId, {
      placeId,
      name,
      rating: body.rating ?? null,
      priceLevel: body.priceLevel ?? null,
      cuisine: body.cuisine ?? null,
      photoRef: body.photoRef ?? null,
      comment: body.comment ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
    })

    await mcpInsertMany('saved_places', [doc as unknown as Record<string, unknown>])
    await recordSavedInteraction(userId, placeId, name, doc.city)

    return NextResponse.json({ savedPlace: savedPlaceFromDoc(doc as unknown as Record<string, unknown>) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  const body = await req.json()
  try {
    await mcpUpdateMany(
      'saved_places',
      { user_id: userId, place_id: placeId },
      {
        $set: {
          comment: body.comment ?? undefined,
        },
      },
      false,
    )
    const docs = await mcpFind('saved_places', { user_id: userId, place_id: placeId }, 1)
    if (!docs.length) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }
    return NextResponse.json({ savedPlace: savedPlaceFromDoc(docs[0]) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 })
  }

  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  try {
    await mcpDeleteMany('saved_places', { user_id: userId, place_id: placeId })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
