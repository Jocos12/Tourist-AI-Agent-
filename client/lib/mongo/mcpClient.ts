const MCP_URL = process.env.MONGODB_MCP_URL ?? 'http://localhost:3100/mcp'
const DB = process.env.MONGODB_DATABASE ?? 'hodari'

let sessionId: string | null = null

async function initSession(): Promise<string> {
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
        clientInfo: { name: 'hodari-community', version: '1.0' },
      },
    }),
  })
  const sid = res.headers.get('mcp-session-id')
  if (!sid) throw new Error('MCP did not return a session ID')
  return sid
}

function parseSsePayload(text: string): Record<string, unknown> {
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue
    return JSON.parse(line.slice(6)) as Record<string, unknown>
  }
  throw new Error('No response data from MCP')
}

function parseDocs(result: Record<string, unknown>): Record<string, unknown>[] {
  const sc = result.structuredContent as Record<string, unknown> | Record<string, unknown>[] | undefined
  if (Array.isArray(sc)) return sc as Record<string, unknown>[]
  if (sc && typeof sc === 'object' && 'documents' in sc) {
    return (sc.documents as Record<string, unknown>[]) ?? []
  }

  const content = result.content as { text?: string }[] | undefined
  for (const item of content ?? []) {
    const text = item.text ?? ''
    const blocks = text.match(/<untrusted-user-data-[^>]+>([\s\S]*?)<\/untrusted-user-data-[^>]+>/g)
    if (!blocks) continue
    for (const block of blocks) {
      const inner = block.replace(/<untrusted-user-data-[^>]+>|<\/untrusted-user-data-[^>]+>/g, '').trim()
      try {
        const parsed = JSON.parse(inner) as unknown
        if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
      } catch {
        /* try next block */
      }
    }
  }
  return []
}

async function mcpTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!sessionId) sessionId = await initSession()

  const post = async (sid: string) =>
    fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': sid,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: String(Date.now()),
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    })

  let res = await post(sessionId)
  let payload = parseSsePayload(await res.text())

  const err = payload.error as { code?: number; message?: string } | undefined
  if (err?.code === -32003) {
    sessionId = await initSession()
    res = await post(sessionId)
    payload = parseSsePayload(await res.text())
  }

  if (payload.error) {
    throw new Error(`MCP error calling '${toolName}': ${JSON.stringify(payload.error)}`)
  }

  return (payload.result as Record<string, unknown>) ?? {}
}

export function getDatabaseName(): string {
  return DB
}

export async function mcpFind(
  collection: string,
  filter: Record<string, unknown>,
  options?: { limit?: number; projection?: Record<string, unknown> },
): Promise<Record<string, unknown>[]> {
  const result = await mcpTool('find', {
    database: DB,
    collection,
    filter,
    limit: options?.limit ?? 50,
    ...(options?.projection ? { projection: options.projection } : {}),
  })
  return parseDocs(result)
}

export async function mcpAggregate(
  collection: string,
  pipeline: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const result = await mcpTool('aggregate', {
    database: DB,
    collection,
    pipeline,
  })
  return parseDocs(result)
}

export async function mcpUpdateOne(
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  upsert = false,
): Promise<void> {
  await mcpTool('update-many', {
    database: DB,
    collection,
    filter,
    update,
    upsert,
  })
}

export async function mcpInsertOne(collection: string, document: object): Promise<void> {
  await mcpTool('insert-many', {
    database: DB,
    collection,
    documents: [document as Record<string, unknown>],
  })
}
