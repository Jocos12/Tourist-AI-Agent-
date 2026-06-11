// client/app/api/saved/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface SavedPlaceWithReminder {
  id: string;
  placeId: string;
  name: string;
  rating: number | null;
  priceLevel: number | null;
  cuisine: string | null;
  photoRef: string | null;
  comment: string | null;
  reminderDate: string | null;
  reminderNotes: string | null;
  createdAt: string;
}

let savedPlacesStore: SavedPlaceWithReminder[] = [];

export async function GET() {
  return NextResponse.json({ savedPlaces: savedPlacesStore });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { placeId, name, rating, priceLevel, cuisine, photoRef, comment, reminderDate, reminderNotes } = body;

  if (!placeId || !name) {
    return NextResponse.json({ error: 'placeId and name required' }, { status: 400 });
  }

  const existing = savedPlacesStore.find(p => p.placeId === placeId);
  if (existing) {
    return NextResponse.json({ savedPlace: existing });
  }

  const newPlace: SavedPlaceWithReminder = {
    id: Date.now().toString(),
    placeId,
    name,
    rating: rating || null,
    priceLevel: priceLevel || null,
    cuisine: cuisine || null,
    photoRef: photoRef || null,
    comment: comment || null,
    reminderDate: reminderDate || null,
    reminderNotes: reminderNotes || null,
    createdAt: new Date().toISOString(),
  };

  savedPlacesStore.push(newPlace);
  return NextResponse.json({ savedPlace: newPlace });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const body = await request.json();
  const { reminderDate, reminderNotes } = body;

  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 });
  }

  const placeIndex = savedPlacesStore.findIndex(p => p.placeId === placeId);
  if (placeIndex === -1) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  savedPlacesStore[placeIndex] = {
    ...savedPlacesStore[placeIndex],
    reminderDate: reminderDate || null,
    reminderNotes: reminderNotes || null,
  };

  return NextResponse.json({ success: true, savedPlace: savedPlacesStore[placeIndex] });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 });
  }

  savedPlacesStore = savedPlacesStore.filter(p => p.placeId !== placeId);
  return NextResponse.json({ success: true });
}