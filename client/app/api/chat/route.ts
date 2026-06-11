import { NextRequest } from 'next/server'

// Full pipeline (Planner → Explorer → Itinerary) can exceed 2 minutes locally.
export const maxDuration = 300

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
    // Propagate client aborts (Stop button) so the upstream agent run is cancelled too.
    signal: req.signal,
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
    const detail = adkRes.ok
      ? 'no stream body from agent'
      : (await adkRes.text().catch(() => '')).slice(0, 300)
    return new Response(
      `Agent unreachable (${adkRes.status}${detail ? `: ${detail}` : ''})`,
      { status: 502 },
    )
  }

  return new Response(adkRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
