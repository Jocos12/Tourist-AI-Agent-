import { genaiConfigured, genaiMode } from '@/lib/genaiServer'

export const runtime = 'nodejs'

/** Lets the client pick Gemini vs browser speech without exposing credentials. */
export async function GET() {
  const configured = genaiConfigured()
  return Response.json({
    stt: configured ? 'gemini' : 'browser',
    tts: configured ? 'gemini' : 'browser',
    mode: genaiMode(),
  })
}
