import { NextRequest } from 'next/server'

export function userIdFromRequest(req: NextRequest): string | null {
  const header = req.headers.get('x-user-id')?.trim()
  if (header) return header
  const q = req.nextUrl.searchParams.get('userId')?.trim()
  return q || null
}

export function requireUserId(req: NextRequest): string | Response {
  const userId = userIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Login required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return userId
}
