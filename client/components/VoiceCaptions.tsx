'use client'

import { useEffect, useState } from 'react'
import { subscribeVoiceCaptions } from '@/lib/voice'

export function VoiceCaptions({ active }: { active: boolean }) {
  const [caption, setCaption] = useState('')

  useEffect(() => subscribeVoiceCaptions(setCaption), [])

  if (!active || !caption) return null

  return (
    <p className="max-w-sm text-center font-sans text-sm leading-relaxed text-text2">
      {caption}
    </p>
  )
}
