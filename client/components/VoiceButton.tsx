'use client'

import { useVoice } from '@/hooks/useVoice'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceButton({ onTranscript, disabled }: Props) {
  const { voiceState, supported, warning, toggleVoice, isBusy } = useVoice({ onTranscript, disabled })

  const label = !supported
    ? 'Voice input is not available (mic blocked or unsupported)'
    : voiceState === 'listening' ? 'Tap to stop and send'
    : voiceState === 'thinking' ? 'Thinking…'
    : voiceState === 'speaking' ? 'Tap to interrupt'
    : 'Push to talk'

  return (
    <div className="flex items-center gap-2">
      {voiceState === 'listening' && (
        <span className="font-mono text-[11px] text-gold/80">listening…</span>
      )}
      {voiceState === 'thinking' && (
        <span className="font-mono text-[11px] text-text3">thinking…</span>
      )}
      {warning && (
        <span className="font-mono text-[11px] text-text3">{warning}</span>
      )}
      <button
        onClick={toggleVoice}
        disabled={disabled || !supported || isBusy}
        title={label}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 ${
          voiceState === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
        </svg>
      </button>
    </div>
  )
}
