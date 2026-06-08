'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the first client render. Use to gate `createPortal` so the
 * server and first client render agree (both render nothing) — avoids the
 * hydration mismatch that portals otherwise cause.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
