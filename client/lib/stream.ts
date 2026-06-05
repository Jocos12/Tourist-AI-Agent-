import type { StreamChunk } from './types'

const AGENT_LABELS: Record<string, string> = {
  planner_agent: 'Planning your trip',
  explorer_agent: 'Searching nearby places',
  itinerary_agent: 'Building your itinerary',
}

export async function* streamChat(
  message: string,
  userId: string,
  sessionId: string,
): AsyncGenerator<StreamChunk> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userId, sessionId }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const seenAgents = new Set<string>()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue

      try {
        const event = JSON.parse(raw)
        const author = event?.author as string | undefined
        if (!author) continue

        // ADK error events — surface them as readable text
        const errMsg: string | undefined = event.errorMessage || event.error
        if (errMsg) {
          if (errMsg.includes('prepayment credits are depleted') || errMsg.includes('prepay')) {
            yield { type: 'text', text: '⚡ Prepay credits depleted. Add credits at aistudio.google.com/projects or switch to a fresh API key.' }
          } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
            yield { type: 'text', text: '⚡ API quota reached. Switch to a fresh API key or wait for the daily quota to reset at midnight Pacific Time.' }
          } else {
            yield { type: 'text', text: `Something went wrong: ${errMsg.slice(0, 180)}` }
          }
          return
        }

        if (author !== 'hodari') {
          // Emit each sub-agent once as a thinking step
          if (!seenAgents.has(author) && AGENT_LABELS[author]) {
            seenAgents.add(author)
            yield { type: 'thinking', agent: author, label: AGENT_LABELS[author] }
          }
          continue
        }

        const parts = event?.content?.parts ?? []
        for (const part of parts) {
          if (part.text) yield { type: 'text', text: part.text }
        }
      } catch {
        // non-JSON SSE line — skip
      }
    }
  }
}

export async function fetchSessionState(
  userId: string,
  sessionId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/session?userId=${userId}&sessionId=${sessionId}`)
  if (!res.ok) return {}
  return res.json()
}
