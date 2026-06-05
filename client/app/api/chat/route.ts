import { NextRequest } from 'next/server'

const ADK_BASE = process.env.ADK_BASE_URL ?? 'http://localhost:8000'
const APP_NAME = process.env.ADK_APP_NAME ?? 'hodari'

export async function POST(req: NextRequest) {
  const { message, userId, sessionId } = await req.json()

  // Ensure the session exists before running
  await fetch(
    `${ADK_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  ).catch(() => {/* session may already exist */})

  const adkRes = await fetch(`${ADK_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_name: APP_NAME,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: 'user',
        parts: [{ text: message }],
      },
      streaming: true,
    }),
  })

  if (!adkRes.ok || !adkRes.body) {
    return new Response('Agent unreachable', { status: 502 })
  }

  return new Response(adkRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
