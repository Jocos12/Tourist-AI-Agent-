'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelSpeech,
  emitActivity,
  isSpeechInputSupported,
  startRecording,
  subscribeVoiceActivity,
  type Recorder,
  type VoiceState,
} from '@/lib/voice'

type VoiceStatus = VoiceState | 'idle'

interface UseVoiceOptions {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function useVoice({ onTranscript, disabled }: UseVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceStatus>('idle')
  const [supported, setSupported] = useState(true)
  const [warning, setWarning] = useState('')
  const recorderRef = useRef<Recorder | null>(null)
  const lastSpeechAtRef = useRef(0)
  const rafRef = useRef(0)
  const levelRef = useRef(0)

  const stopListening = useCallback(async () => {
    const rec = recorderRef.current
    if (!rec) return

    recorderRef.current = null
    setVoiceState('thinking')
    emitActivity('thinking', 0.12)

    try {
      const text = await rec.stop()
      if (text) {
        onTranscript(text)
      } else {
        setWarning('No speech detected. Try speaking clearly, or use Chrome/Edge for voice input.')
        setVoiceState('idle')
        emitActivity('idle', 0)
      }
    } catch (error) {
      console.error(error)
      setWarning('Voice transcription failed. Please try again.')
      setVoiceState('idle')
      emitActivity('idle', 0)
    }
  }, [onTranscript])

  const startListening = useCallback(async () => {
    if (disabled) return
    setWarning('')
    cancelSpeech()

    if (!isSpeechInputSupported()) {
      setSupported(false)
      setWarning('Microphone is blocked or not supported.')
      return
    }

    try {
      recorderRef.current = await startRecording()
      lastSpeechAtRef.current = performance.now()
      setVoiceState('listening')
    } catch (error) {
      console.error('mic unavailable:', error)
      setSupported(false)
      setWarning('Microphone permission denied.')
      setVoiceState('idle')
      emitActivity('idle', 0)
    }
  }, [disabled])

  const toggleVoice = useCallback(() => {
    if (voiceState === 'listening') {
      void stopListening()
      return
    }

    if (voiceState === 'speaking') {
      cancelSpeech()
      void startListening()
      return
    }

    if (voiceState === 'thinking') return
    void startListening()
  }, [startListening, stopListening, voiceState])

  useEffect(() => setSupported(isSpeechInputSupported()), [])

  useEffect(() => {
    return subscribeVoiceActivity((state, level) => {
      levelRef.current = level
      if (state === 'speaking') setVoiceState('speaking')
      if (state === 'idle' && voiceState !== 'listening') setVoiceState('idle')
    })
  }, [voiceState])

  useEffect(() => {
    if (voiceState !== 'listening') {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      const now = performance.now()
      if (levelRef.current > 0.035) lastSpeechAtRef.current = now
      if (now - lastSpeechAtRef.current > 1500) {
        void stopListening()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [stopListening, voiceState])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      recorderRef.current?.cancel()
    }
  }, [])

  return {
    voiceState,
    supported,
    warning,
    toggleVoice,
    isBusy: voiceState === 'thinking',
  }
}
