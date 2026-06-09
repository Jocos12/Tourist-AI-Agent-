'use client'

import { useEffect, useState } from 'react'
import { subscribeVoiceActivity, type VoiceActivity } from '@/lib/voice'
import { VoiceCaptions } from './VoiceCaptions'

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function WaveGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M3 10v4h2v-4H3zm4-3v10h2V7H7zm4-3v16h2V4h-2zm4 3v10h2V7h-2zm4 3v4h2v-4h-2z" />
    </svg>
  )
}

// Floating, audio-reactive voice bubble. Listening and speaking react to real
// analyser levels; thinking idles softly. Hidden when voice is idle.
export function VoiceOrb() {
  const [state, setState] = useState<VoiceActivity>('idle')
  const [level, setLevel] = useState(0)

  useEffect(() => subscribeVoiceActivity((s, l) => { setState(s); setLevel(l) }), [])

  if (state === 'idle') return null
  const listening = state === 'listening'
  const speaking = state === 'speaking'
  const thinking = state === 'thinking'

  const reactiveLevel = Math.min(level, 1)
  const ringScale = listening || speaking ? 1 + reactiveLevel * 0.5 : 1

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-up">
      <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer reactive halo */}
        <div
          className={`absolute inset-0 rounded-full bg-gold/20 ${thinking ? 'voice-orb-pulse' : ''}`}
          style={listening || speaking ? { transform: `scale(${ringScale})`, transition: 'transform 70ms linear' } : undefined}
        />
        {/* Second ring for depth */}
        <div
          className={`absolute inset-2 rounded-full bg-gold/25 ${thinking ? 'voice-orb-pulse-2' : ''}`}
          style={listening || speaking ? { transform: `scale(${1 + reactiveLevel * 0.28})`, transition: 'transform 70ms linear' } : undefined}
        />
        {/* Core */}
        <div className="relative w-12 h-12 rounded-full bg-gold text-bg flex items-center justify-center shadow-lg shadow-gold/40">
          {listening ? <MicGlyph /> : <WaveGlyph />}
        </div>
      </div>
      <span className="glass rounded-full px-3 py-1 font-mono text-[10px] tracking-wider uppercase text-text2">
        {state}
      </span>
      <VoiceCaptions active={speaking} />
      </div>
    </div>
  )
}
