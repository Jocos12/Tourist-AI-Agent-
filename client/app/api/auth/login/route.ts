import { NextRequest, NextResponse } from 'next/server'

const MCP_URL = process.env.MONGODB_MCP_URL ?? 'http://localhost:3100/mcp'
const DB = process.env.MONGODB_DATABASE ?? 'hodari'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function mcpSession(): Promise<string> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'hodari-client', version: '1.0' },
      },
    }),
  })
  const sid = res.headers.get('mcp-session-id')
  if (!sid) throw new Error('MCP did not return a session ID')
  return sid
}

/** Call an MCP tool and return its text content items (SSE or plain JSON body). */
async function mcpCall(sid: string, name: string, args: Record<string, unknown>): Promise<string[]> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-session-id': sid,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  const body = await res.text()
  const payloads = body.includes('data:')
    ? body.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim())
    : [body]
  for (const payload of payloads) {
    try {
      const msg = JSON.parse(payload)
      if (msg.result?.content) {
        return (msg.result.content as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => c.text as string)
      }
      if (msg.error) throw new Error(msg.error.message ?? 'MCP tool error')
    } catch (err) {
      if (err instanceof SyntaxError) continue
      throw err
    }
  }
  return []
}

/** The mongodb-mcp-server returns docs as a JSON array inside one text item. */
function extractDocs(texts: string[]): Array<Record<string, unknown>> {
  for (const t of texts) {
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) return parsed
    } catch { /* summary lines are not JSON — skip */ }
  }
  return []
}

function publicUser(doc: Record<string, unknown>) {
  return {
    user_id: doc.user_id,
    email: doc.email,
    home_country: doc.home_country ?? null,
    languages: doc.languages ?? ['en'],
    budget_tier: doc.budget_tier ?? 'moderate',
  }
}

export async function POST(req: NextRequest) {
  let email: string
  try {
    const body = await req.json()
    email = String(body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  try {
    const sid = await mcpSession()

    const existing = extractDocs(
      await mcpCall(sid, 'find', { database: DB, collection: 'users', filter: { email }, limit: 1 }),
    )
    if (existing.length > 0) {
      return NextResponse.json({ user: publicUser(existing[0]), isNew: false })
    }

    // First sign-in: create a profile matching the existing users schema.
    let userId = email.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'fan'
    const clash = extractDocs(
      await mcpCall(sid, 'find', { database: DB, collection: 'users', filter: { user_id: userId }, limit: 1 }),
    )
    if (clash.length > 0) {
      userId = `${userId}_${Math.random().toString(36).slice(2, 6)}`
    }

    const doc = {
      user_id: userId,
      email,
      home_country: null,
      languages: ['en'],
      dietary: [],
      budget_tier: 'moderate',
      accessibility: [],
      created_at: new Date().toISOString(),
    }
    await mcpCall(sid, 'insert-many', { database: DB, collection: 'users', documents: [doc] })

    return NextResponse.json({ user: publicUser(doc), isNew: true })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json(
      { error: 'Could not reach the profile database. Is the MongoDB MCP server running on port 3100?' },
      { status: 502 },
    )
  }
}
