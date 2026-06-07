import { NextRequest, NextResponse } from 'next/server'

import { getBackendBaseUrl } from '@/lib/backend'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get('audio')

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
  }

  const backendForm = new FormData()
  backendForm.set('audio', audio, audio.name || 'voice.webm')

  const backendRes = await fetch(`${getBackendBaseUrl()}/agent/voice`, {
    method: 'POST',
    body: backendForm,
  })

  const text = await backendRes.text()
  if (!backendRes.ok) {
    return new Response(text || 'Voice transcription failed', { status: backendRes.status })
  }

  return new Response(text, {
    status: backendRes.status,
    headers: { 'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json' },
  })
}
