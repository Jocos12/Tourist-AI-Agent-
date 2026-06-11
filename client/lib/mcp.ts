const MCP_URL = process.env.MONGODB_MCP_URL ?? 'http://localhost:3100/mcp'
export const MCP_DATABASE = process.env.MONGODB_DATABASE ?? 'hodari'

export async function mcpSession(): Promise<string> {
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

export async function mcpCall(
  sid: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string[]> {
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

export function extractDocs(texts: string[]): Array<Record<string, unknown>> {
  for (const t of texts) {
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* summary lines */
    }
  }
  return []
}

export async function mcpFind(
  collection: string,
  filter: Record<string, unknown>,
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  const sid = await mcpSession()
  return extractDocs(
    await mcpCall(sid, 'find', { database: MCP_DATABASE, collection, filter, limit }),
  )
}

export async function mcpUpdateMany(
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  upsert = false,
): Promise<void> {
  const sid = await mcpSession()
  await mcpCall(sid, 'update-many', {
    database: MCP_DATABASE,
    collection,
    filter,
    update,
    upsert,
  })
}

export async function mcpInsertMany(
  collection: string,
  documents: Record<string, unknown>[],
): Promise<void> {
  const sid = await mcpSession()
  await mcpCall(sid, 'insert-many', {
    database: MCP_DATABASE,
    collection,
    documents,
  })
}

export async function mcpDeleteMany(
  collection: string,
  filter: Record<string, unknown>,
): Promise<void> {
  const sid = await mcpSession()
  await mcpCall(sid, 'delete-many', {
    database: MCP_DATABASE,
    collection,
    filter,
  })
}
