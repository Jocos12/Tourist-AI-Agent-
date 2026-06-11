import { NextRequest } from 'next/server'

// Full pipeline (Planner → Explorer → Itinerary) can exceed 2 minutes locally.
export const maxDuration = 300

const ADK_BASE = process.env.ADK_BASE_URL ?? 'http://localhost:8000'
const APP_NAME = process.env.ADK_APP_NAME ?? 'hodari'

function agentDownMessage(cause: string): string {
  if (cause.includes('ECONNREFUSED') || cause.includes('fetch failed')) {
    return (
      'Agent server is not running. In a terminal: cd agents && .venv\\Scripts\\adk.exe api_server hodari'
    )
  }
  if (cause.includes('CERTIFICATE_VERIFY_FAILED') || cause.includes('SSL')) {
    return (
      'Vertex AI auth failed (SSL on Windows). Run: cd agents && .\\run.ps1 (installs pip-system-certs), then gcloud auth application-default login'
    )
  }
  return cause
}

export async function POST(req: NextRequest) {
  const { message, userId, sessionId } = await req.json()

  let adkRes: Response
  try {
    // Ensure the session exists before running
    await fetch(
      `${ADK_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    ).catch(() => {/* session may already exist */})

    adkRes = await fetch(`${ADK_BASE}/run_sse`, {
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
  } catch (err) {
    const msg = agentDownMessage(String(err))
    return new Response(msg, { status: 503 })
  }

  if (!adkRes.ok || !adkRes.body) {
    const detail = adkRes.ok
      ? 'no stream body from agent'
      : (await adkRes.text().catch(() => '')).slice(0, 400)
    const msg = agentDownMessage(detail || `agent returned ${adkRes.status}`)
    return new Response(msg, { status: adkRes.ok ? 502 : adkRes.status === 500 ? 502 : adkRes.status })
  }

  return new Response(adkRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
