'use client'

import { useEffect, useState } from 'react'
import { subscribeVoiceActivity, type VoiceActivity } from '@/lib/voice'

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

// Floating, audio-reactive voice bubble. Listening ripples to the real mic level;
// speaking beats with a rhythmic pulse. Hidden when voice is idle.
export function VoiceOrb() {
  const [state, setState] = useState<VoiceActivity>('idle')
  const [level, setLevel] = useState(0)

  useEffect(() => subscribeVoiceActivity((s, l) => { setState(s); setLevel(l) }), [])

  if (state === 'idle') return null
  const listening = state === 'listening'

  // Listening: outer ring scales with live mic level. Speaking: CSS pulse.
  const ringScale = listening ? 1 + Math.min(level, 1) * 0.5 : 1

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-2 pointer-events-none animate-fade-up">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer reactive halo */}
        <div
          className={`absolute inset-0 rounded-full bg-gold/20 ${state === 'speaking' ? 'voice-orb-pulse' : ''}`}
          style={listening ? { transform: `scale(${ringScale})`, transition: 'transform 70ms linear' } : undefined}
        />
        {/* Second ring for depth */}
        <div
          className={`absolute inset-2 rounded-full bg-gold/25 ${state === 'speaking' ? 'voice-orb-pulse-2' : ''}`}
          style={listening ? { transform: `scale(${1 + Math.min(level, 1) * 0.28})`, transition: 'transform 70ms linear' } : undefined}
        />
        {/* Core */}
        <div className="relative w-12 h-12 rounded-full bg-gold text-bg flex items-center justify-center shadow-lg shadow-gold/40">
          {listening ? <MicGlyph /> : <WaveGlyph />}
        </div>
      </div>
      <span className="glass rounded-full px-3 py-1 font-mono text-[10px] tracking-wider uppercase text-text2">
        {listening ? 'Listening' : 'Speaking'}
      </span>
    </div>
  )
}
