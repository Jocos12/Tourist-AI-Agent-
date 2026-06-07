'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage, Theme } from '@/lib/types'
import { ModelSwitcher, type ModelId } from './ModelSwitcher'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  thinkingSteps: string[]
  streamingStarted: boolean
  onSend: (text: string) => void
  onVoiceTranscribe: (audio: Blob) => Promise<string>
  selectedModel: ModelId
  onModelChange: (id: ModelId) => void
  theme: Theme
  onToggleTheme: () => void
}

const SUGGESTION_CHIPS = [
  '4 hours in Kigali under $60',
  'Vegetarian near Camp Nou',
  'Best food and sights nearby',
]

const PLAN_STEPS = ['Plan constraints', 'Find real places', 'Build route']
const DEFAULT_ACTION_CHIPS = ['Show on map 🗺', 'Get walking directions 🚶', 'Filter by budget 💰']

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 01-4.4 2.26 5.4 5.4 0 01-5.4-5.4c0-1.81.89-3.42 2.26-4.4A9.05 9.05 0 0012 3z"/>
    </svg>
  )
}

function parseActionChips(content: string): { body: string; chips: string[] } {
  const lines = content.trimEnd().split('\n')
  const lastLine = lines[lines.length - 1] ?? ''
  const actionLine = lastLine.match(/^Action chips:\s*\[(.*?)\]\s*$/)
  if (!actionLine) return { body: content, chips: DEFAULT_ACTION_CHIPS }

  const chips = [...actionLine[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean)
  return {
    body: lines.slice(0, -1).join('\n').trim(),
    chips: chips.length ? chips : DEFAULT_ACTION_CHIPS,
  }
}

function AiMessage({ content, onChipClick, disabled }: { content: string; onChipClick: (text: string) => void; disabled: boolean }) {
  const { body, chips } = parseActionChips(content)

  return (
    <div>
      <div className="prose-hodari text-sm text-text leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p>{children}</p>,
            strong: ({ children }) => <strong>{children}</strong>,
            em: ({ children }) => <em>{children}</em>,
            ul: ({ children }) => <ul>{children}</ul>,
            ol: ({ children }) => <ol>{children}</ol>,
            li: ({ children }) => <li><span className="bullet">›</span><span>{children}</span></li>,
            h1: ({ children }) => <h1>{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            h3: ({ children }) => <h3>{children}</h3>,
            code: ({ children }) => <code>{children}</code>,
            blockquote: ({ children }) => <blockquote>{children}</blockquote>,
            hr: () => <hr />,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
          }}
        >
          {body}
        </ReactMarkdown>
      </div>
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.slice(0, 3).map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={disabled}
              onClick={() => onChipClick(chip)}
              className="rounded-full border border-gold/40 bg-[#FFFBEB] px-3 py-1.5 text-xs font-medium text-gold transition hover:border-gold hover:bg-[#FEF3C7] disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TypingHeadline() {
  const text = 'Where to?'

  return (
    <h2 aria-label={text} className="text-center text-[2rem] font-semibold tracking-[-0.02em] text-[#1A1A2E] dark:text-text">
      {text.split('').map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          aria-hidden="true"
          className="inline-block"
          initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.12 + index * 0.035, duration: 0.25, ease: 'easeOut' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
      <motion.span
        aria-hidden="true"
        className="ml-1 inline-block h-8 w-[3px] translate-y-1 rounded-full bg-gold"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </h2>
  )
}

function ThinkingProgress({ steps }: { steps: string[] }) {
  const current = Math.min(Math.max(steps.length, 1), PLAN_STEPS.length)
  const progress = (current / PLAN_STEPS.length) * 100

  return (
    <motion.div
      className="rounded-2xl border border-border bg-surface/70 p-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text">Building your plan</p>
          <p className="mt-1 text-sm text-text2">{steps.at(-1) ?? 'Reading your request'}</p>
        </div>
        <div className="thinking-ring" />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface3/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-gold to-green"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45 }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PLAN_STEPS.map((step, index) => {
          const active = index < current
          return (
            <div key={step} className={`rounded-2xl px-3 py-2 text-center text-[11px] ${active ? 'bg-white/75 text-text shadow-sm dark:bg-white/10' : 'text-text3'}`}>
              {active ? '✓ ' : ''}
              {step}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <motion.div
      className="w-full rounded-[1.75rem] border border-border/70 bg-white/60 p-5 shadow-xl shadow-navy/5 backdrop-blur-xl dark:bg-white/5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gold/20" />
        <div className="space-y-2">
          <div className="skeleton-shine relative h-3 w-32 overflow-hidden rounded-full bg-surface3/70" />
          <div className="skeleton-shine relative h-2 w-20 overflow-hidden rounded-full bg-surface3/60" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton-shine relative h-3 w-full overflow-hidden rounded-full bg-surface3/70" />
        <div className="skeleton-shine relative h-3 w-5/6 overflow-hidden rounded-full bg-surface3/70" />
        <div className="skeleton-shine relative h-3 w-2/3 overflow-hidden rounded-full bg-surface3/70" />
      </div>
    </motion.div>
  )
}

export function ChatPanel({
  messages, loading, thinkingSteps, streamingStarted, onSend,
  onVoiceTranscribe,
  selectedModel, onModelChange,
  theme, onToggleTheme,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [atBottom, setAtBottom] = useState(true)
  const [recording, setRecording] = useState(false)
  const [voiceLoading, setVoiceLoading] = useState(false)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  // Smart auto-scroll: follow new content only when the user is already at the
  // bottom, OR when they just sent a message — never yank them up mid-read.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'user' || atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, thinkingSteps, atBottom])

  const streaming = loading && streamingStarted
  const lastMsgId = messages[messages.length - 1]?.id
  const showThinking = loading && !streamingStarted
  const isEmpty = messages.length === 0 && !loading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = inputRef.current?.value.trim()
    if (!text || loading) return
    onSend(text)
    inputRef.current!.value = ''
  }

  async function handleVoiceClick() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Voice recording is not supported in this browser.')
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    audioChunksRef.current = []
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())
      setRecording(false)
      setVoiceLoading(true)
      try {
        const audio = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        const transcription = await onVoiceTranscribe(audio)
        if (inputRef.current) {
          inputRef.current.value = transcription
          inputRef.current.focus()
        }
      } catch (error) {
        console.error(error)
      } finally {
        setVoiceLoading(false)
      }
    }

    recorder.start()
    setRecording(true)
  }

  // Composer (input + send) — reused in the empty hero and pinned at the bottom.
  const composer = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 rounded-[28px] border border-border bg-white px-3 py-2.5 shadow-[0_8px_30px_rgba(92,74,49,0.08)] transition focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.15),0_8px_30px_rgba(92,74,49,0.08)] dark:bg-surface2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask Hodari to plan your trip..."
          className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-text outline-none placeholder:text-text3"
          disabled={loading || voiceLoading}
        />
        <motion.button
          type="button"
          onClick={handleVoiceClick}
          disabled={loading || voiceLoading}
          title={recording ? 'Stop recording' : 'Record voice'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition disabled:opacity-35 ${
            recording ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:border-gold/50 hover:text-gold dark:bg-surface2'
          }`}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
        >
          {voiceLoading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a1 1 0 10-2 0 3 3 0 11-6 0 1 1 0 10-2 0 5 5 0 004 4.9V19H8a1 1 0 100 2h8a1 1 0 100-2h-3v-3.1A5 5 0 0017 11z" />
            </svg>
          )}
        </motion.button>
        <motion.button
          type="submit"
          disabled={loading || voiceLoading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-white shadow-sm shadow-gold/30 transition disabled:opacity-35"
          whileHover={{ scale: 1.06, boxShadow: '0 0 0 8px rgba(245,158,11,0.14), 0 10px 24px rgba(245,158,11,0.28)' }}
          whileTap={{ scale: 0.96 }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </motion.button>
      </div>
    </form>
  )

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden pb-36">
      <motion.div
        className="flex shrink-0 items-center justify-between gap-4 py-5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium tracking-tight text-text">Hodari</h1>
            <p className="mt-0.5 truncate text-xs text-text3">Global tourist guide</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <motion.button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="relative flex h-8 w-[62px] items-center rounded-full border border-border bg-surface p-1 text-text2 shadow-sm"
            whileTap={{ scale: 0.96 }}
          >
            <motion.span
              className="absolute h-6 w-6 rounded-full bg-text shadow-sm"
              animate={{ x: theme === 'dark' ? 30 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            />
            <span className="relative z-10 flex h-6 w-6 items-center justify-center text-bg">
              <SunIcon />
            </span>
            <span className="relative z-10 flex h-6 w-6 items-center justify-center">
              <MoonIcon />
            </span>
          </motion.button>

          <div className="hidden min-[440px]:block">
            <ModelSwitcher selected={selectedModel} onChange={onModelChange} />
          </div>
        </div>
      </motion.div>

      {isEmpty ? (
        <motion.div
          className="flex flex-1 flex-col items-center justify-center pb-20"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="mx-auto w-full text-center">
            <TypingHeadline />

            <p className="mx-auto mt-3 max-w-md text-sm italic text-[#6B7280]">
              Plan a simple, grounded trip anywhere.
            </p>

            <div className="absolute bottom-8 left-0 right-0">
              {composer}
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {SUGGESTION_CHIPS.map((s, index) => (
                  <motion.button
                    key={s}
                    onClick={() => onSend(s)}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-xs text-text2 shadow-sm transition hover:border-gold hover:text-text"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: [0, -4, 0] }}
                    transition={{ opacity: { delay: 0.15 + index * 0.04 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 } }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 space-y-5 overflow-y-auto pb-10 pt-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[82%] rounded-2xl bg-surface2 px-4 py-3 shadow-sm">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full max-w-[90%]">
                    <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm">
                      <p className="mb-2 text-xs font-medium text-text3">Hodari</p>
                      <AiMessage content={msg.content} onChipClick={onSend} disabled={loading || voiceLoading} />
                      {streaming && msg.id === lastMsgId && <span className="stream-caret" />}
                    </div>
                  </div>
                )}
                </motion.div>
              ))}
            </AnimatePresence>

            {showThinking && (
              <div className="flex justify-start">
                <div className="w-full max-w-[90%] space-y-3">
                  <ThinkingProgress steps={thinkingSteps} />
                  <LoadingSkeleton />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!atBottom && messages.length > 0 && (
            <button
              onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true) }}
              title="Jump to latest"
              className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface/90 py-1.5 pl-3 pr-3 text-text2 shadow-sm backdrop-blur-xl transition hover:text-text"
            >
              {streaming && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse_dot" />}
              <span className="text-xs">Latest</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
              </svg>
            </button>
          )}

          <div className="absolute bottom-8 left-0 right-0">
            {composer}
          </div>
        </>
      )}
    </div>
  )
}
