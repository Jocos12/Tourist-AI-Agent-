'use client'

import { useEffect, useState } from 'react'
import { subscribeVoiceActivity } from '@/lib/voice'

export function useMicLevel(active: boolean): number {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!active) {
      setLevel(0)
      return
    }
    return subscribeVoiceActivity((_state, lvl) => {
      setLevel(lvl)
    })
  }, [active])

  return level
}
