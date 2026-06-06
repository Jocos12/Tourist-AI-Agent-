'use client'

import { useEffect, useRef, useState } from 'react'
import { startRecording, cancelSpeech, isSpeechInputSupported, type Recorder } from '@/lib/voice'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

type State = 'idle' | 'recording' | 'transcribing'

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<State>('idle')
  const [supported, setSupported] = useState(true)
  const recorderRef = useRef<Recorder | null>(null)

  useEffect(() => setSupported(isSpeechInputSupported()), [])

  async function toggle() {
    if (state === 'transcribing') return

    if (state === 'recording') {
      const rec = recorderRef.current
      recorderRef.current = null
      setState('transcribing')
      try {
        const text = await rec?.stop()
        if (text) onTranscript(text)
      } catch (e) {
        console.error(e)
      } finally {
        setState('idle')
      }
      return
    }

    // idle -> start recording
    cancelSpeech() // barge-in: stop Hodari mid-sentence when the user speaks
    try {
      recorderRef.current = await startRecording()
      setState('recording')
    } catch (e) {
      console.error('mic unavailable:', e)
      setSupported(false)
      setState('idle')
    }
  }

  const label = !supported
    ? 'Voice input is not available (mic blocked or unsupported)'
    : state === 'recording' ? 'Tap to stop and send'
    : state === 'transcribing' ? 'Transcribing…'
    : 'Push to talk'

  return (
    <div className="flex items-center gap-2">
      {state === 'recording' && (
        <span className="font-mono text-[11px] text-gold/80">listening…</span>
      )}
      {state === 'transcribing' && (
        <span className="font-mono text-[11px] text-text3">transcribing…</span>
      )}
      <button
        onClick={toggle}
        disabled={disabled || !supported || state === 'transcribing'}
        title={label}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 ${
          state === 'recording' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
        </svg>
      </button>
    </div>
  )
}
