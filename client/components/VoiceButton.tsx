'use client'

import { Mic, Square } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  compact?: boolean
}

export function VoiceButton({ onTranscript, disabled, compact }: Props) {
  const { voiceState, supported, warning, toggleVoice, isBusy } = useVoice({ onTranscript, disabled })

  const label = !supported
    ? 'Voice unavailable'
    : voiceState === 'listening' ? 'Stop listening'
    : voiceState === 'thinking' ? 'Processing…'
    : voiceState === 'speaking' ? 'Stop speaking'
    : voiceState === 'paused' ? 'Resume speaking'
    : 'Start voice input'

  if (compact) {
    return (
      <>
        {warning && <span className="sr-only">{warning}</span>}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled || !supported || isBusy}
          title={label}
          aria-label={label}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
            voiceState === 'listening'
              ? 'bg-red-500 text-white'
              : 'text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30'
          }`}
        >
          {voiceState === 'listening' ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
        </button>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {warning && <span className="text-[11px] text-gray-500">{warning}</span>}
      <button
        type="button"
        onClick={toggleVoice}
        disabled={disabled || !supported || isBusy}
        title={label}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
          voiceState === 'listening' ? 'bg-red-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-amber-300 dark:border-slate-600'
        }`}
      >
        {voiceState === 'listening' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>
  )
}
