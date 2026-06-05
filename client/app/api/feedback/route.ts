import { NextRequest, NextResponse } from 'next/server'

const MCP_URL = process.env.MONGODB_MCP_URL ?? 'http://localhost:3100/mcp'
const DB = process.env.MONGODB_DATABASE ?? 'hodari'

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

export async function POST(req: NextRequest) {
  const { userId, placeId, placeName, city, action } = await req.json()
  if (!userId || !placeId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const sid = await mcpSession()
    await fetch(MCP_URL, {
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
        params: {
          name: 'update-many',
          arguments: {
            database: DB,
            collection: 'interactions',
            filter: { user_id: userId, place_id: placeId },
            update: {
              $set: { user_id: userId, place_id: placeId, place_name: placeName ?? '', city: city ?? '', action },
            },
            upsert: true,
          },
        },
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
