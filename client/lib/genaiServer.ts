import { GoogleGenAI } from '@google/genai'

// NOTE: server-only module. It reads credentials from process.env and must never
// be imported by a client component (only the /api/voice route handlers use it).

// Shared server-side Gemini client for the voice routes. Supports two billing
// paths, selected by env (mirrors agents/.env):
//
//   • Vertex AI  (GOOGLE_GENAI_USE_VERTEXAI=TRUE) — billed through Google Cloud
//     Billing, so it draws on your Cloud credits / the same project the agents
//     already use. Auth is ADC (gcloud auth application-default login).
//   • Developer API (default) — a GEMINI_API_KEY from AI Studio. Has its own
//     separate prepay wallet (NOT funded by Cloud credits).

const API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const VERTEX_FLAG = process.env.GOOGLE_GENAI_USE_VERTEXAI
const USE_VERTEX =
  VERTEX_FLAG === undefined || VERTEX_FLAG === ''
    ? !!PROJECT
    : /^true$/i.test(VERTEX_FLAG)
// Voice uses Gemini 2.5 models (STT + TTS), which are served from REGIONAL
// endpoints — unlike the agents' Gemini 3.x (global-only). So default to a
// region. Override with GEMINI_VOICE_LOCATION if needed.
const LOCATION = process.env.GEMINI_VOICE_LOCATION ?? 'us-central1'

export function genaiMode(): 'vertex' | 'apikey' {
  return USE_VERTEX ? 'vertex' : 'apikey'
}

/** True when the selected mode has the config it needs to authenticate. */
export function genaiConfigured(): boolean {
  return USE_VERTEX ? !!PROJECT : !!API_KEY
}

/** Human-readable hint for the 501 response when not configured. */
export function genaiMissingHint(): string {
  return USE_VERTEX
    ? 'GOOGLE_GENAI_USE_VERTEXAI=TRUE but GOOGLE_CLOUD_PROJECT is not set (and ADC must be available)'
    : 'GEMINI_API_KEY is not set'
}

let _client: GoogleGenAI | null = null
export function genai(): GoogleGenAI {
  if (!_client) {
    _client = USE_VERTEX
      ? new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION })
      : new GoogleGenAI({ apiKey: API_KEY })
  }
  return _client
}
