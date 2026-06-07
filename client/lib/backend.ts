/** Hodari FastAPI backend (port 8001 locally; ADK legacy server often uses 8000). */
export function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    'http://127.0.0.1:8001'
  )
}
