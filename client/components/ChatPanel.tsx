'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
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

const SUGGESTIONS = [
  '4 hours in Kigali under $60',
  'Vegetarian food nearby',
  'Best food and sights nearby',
  'Plan my trip today',
]

const DEFAULT_ACTION_CHIPS = ['Show on map 🗺', 'Get walking directions 🚶', 'Filter by budget 💰']
const COLLAPSE_LIMIT = 300
const messageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
}
const buttonContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const buttonItem: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 01-4.4 2.26 5.4 5.4 0 01-5.4-5.4c0-1.81.89-3.42 2.26-4.4A9.05 9.05 0 0012 3z" />
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

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose-hodari text-sm leading-relaxed text-gray-900 dark:text-white">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul>{children}</ul>,
            ol: ({ children }) => <ol className="mt-2 space-y-1">{children}</ol>,
            li: ({ children }) => (
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span>{children}</span>
              </li>
            ),
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          code: ({ children }) => <code>{children}</code>,
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
          hr: () => <hr />,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function StreamingText({ content }: { content: string }) {
  const chunks = content.split(/(\s+)/)

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-white">
      {chunks.map((chunk, index) => {
        if (!chunk) return null
        if (/^\s+$/.test(chunk)) return <span key={`space-${index}`}>{chunk}</span>

        return (
          <motion.span
            key={`${index}-${chunk}`}
            className="inline"
            initial={{ opacity: 0, y: 3, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {chunk}
          </motion.span>
        )
      })}
    </div>
  )
}

function StreamingCursor({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          className="ml-0.5 inline-block align-baseline text-gold"
          initial={{ opacity: 0 }}
          animate={{ opacity: [1, 0.2, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          ▋
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function CollapsedReply({ content, children }: { content: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const shouldCollapse = content.length > COLLAPSE_LIMIT

  if (!shouldCollapse) return <>{children}</>

  return (
    <div>
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{ height: expanded ? 'auto' : 62 }}
        transition={{ duration: 0.24, ease: 'easeInOut' }}
      >
        {children}
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-white/0 dark:from-gray-800 dark:to-gray-800/0" />
        )}
      </motion.div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 text-xs font-semibold text-amber-700 transition hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}

function AssistantContent({
  content,
  isStreaming,
  onChipClick,
  disabled,
}: {
  content: string
  isStreaming: boolean
  onChipClick: (text: string) => void
  disabled: boolean
}) {
  const { body, chips } = parseActionChips(content)

  return (
    <div>
      <CollapsedReply content={body}>
        {isStreaming ? <StreamingText content={body} /> : <MarkdownBody content={body} />}
      </CollapsedReply>
      <StreamingCursor show={isStreaming} />

      {!isStreaming && chips.length > 0 && (
        <motion.div
          variants={buttonContainer}
          initial="hidden"
          animate="visible"
          className="mt-3 flex flex-wrap gap-2"
        >
          {chips.slice(0, 3).map((chip) => (
            <motion.button
              key={chip}
              type="button"
              variants={buttonItem}
              disabled={disabled}
              onClick={() => onChipClick(chip)}
              className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-40 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            >
              {chip}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function TypingHeadline() {
  const text = 'Where to?'

  return (
    <h2 aria-label={text} className="text-center text-[2rem] font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">
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

function AssistantSkeleton() {
  return (
    <motion.div
      className="flex items-start gap-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        H
      </div>
      <div className="w-full max-w-[680px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-navy/5 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-3">
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-200 [animation-delay:120ms] dark:bg-gray-700" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-gray-200 [animation-delay:240ms] dark:bg-gray-700" />
        </div>
      </div>
    </motion.div>
  )
}

function fallbackTime(createdAt?: number): string {
  if (!createdAt) return ''

  return new Date(createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageTimestamp({ message, align }: { message: ChatMessage; align: 'left' | 'right' }) {
  return (
    <span className={`mt-1 text-xs text-gray-400 dark:text-gray-500 ${align === 'right' ? 'mr-1' : 'ml-1'}`}>
      {message.timestamp ?? fallbackTime(message.createdAt)}
    </span>
  )
}

function UserMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <motion.div
      key={message.id}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex justify-end w-full"
    >
      <div className="flex flex-col items-end max-w-[680px] w-full">
        <div className="rounded-2xl rounded-tr-none bg-amber-100 px-4 py-3 dark:bg-amber-900/40">
          <p className="text-sm leading-relaxed text-gray-900 dark:text-amber-100">{message.content}</p>
        </div>
        <MessageTimestamp message={message} align="right" />
      </div>
    </motion.div>
  )
}

function AssistantMessageBubble({
  message,
  isStreaming,
  onChipClick,
  disabled,
}: {
  message: ChatMessage
  isStreaming: boolean
  onChipClick: (text: string) => void
  disabled: boolean
}) {
  return (
    <motion.div
      key={message.id}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex items-start gap-3 w-full"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        H
      </div>
      <div className="flex max-w-[680px] w-full flex-col">
        <div className="max-w-[680px] w-full rounded-2xl rounded-tl-none border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <AssistantContent
            content={message.content}
            isStreaming={isStreaming}
            onChipClick={onChipClick}
            disabled={disabled}
          />
        </div>
        <MessageTimestamp message={message} align="left" />
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
  const lastScrollTopRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [newMessageAvailable, setNewMessageAvailable] = useState(false)
  const [recording, setRecording] = useState(false)
  const [voiceLoading, setVoiceLoading] = useState(false)

  const streaming = loading && streamingStarted
  const lastMsg = messages[messages.length - 1]
  const lastMsgId = lastMsg?.id
  const showSkeleton = loading && !streamingStarted
  const isEmpty = messages.length === 0 && !loading
  const latestAssistantStreaming = streaming && lastMsg?.role === 'assistant'

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = scrollRef.current
    if (!el) return

    el.scrollTo({ top: el.scrollHeight, behavior })
    lastScrollTopRef.current = el.scrollHeight
    setNewMessageAvailable(false)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isAtBottom = distanceFromBottom < 160
    const userScrolledUp = el.scrollTop < lastScrollTopRef.current - 8

    lastScrollTopRef.current = el.scrollTop
    setAutoScroll(isAtBottom)
    if (isAtBottom) setNewMessageAvailable(false)
    if (userScrolledUp && distanceFromBottom > 180) setAutoScroll(false)
  }

  useEffect(() => {
    const last = messages[messages.length - 1]

    if (last?.role === 'user') {
      setAutoScroll(true)
      setNewMessageAvailable(false)
      requestAnimationFrame(() => scrollToBottom())
      return
    }

    if (autoScroll) {
      requestAnimationFrame(() => scrollToBottom(streaming ? 'auto' : 'smooth'))
    } else if ((last?.role === 'assistant' || loading) && scrollRef.current) {
      const el = scrollRef.current
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom < 180) return
      setNewMessageAvailable(true)
    }
  }, [messages, loading, thinkingSteps, streaming, autoScroll])

  function sendMessage(text: string) {
    if (!text.trim() || loading || voiceLoading) return
    setAutoScroll(true)
    setNewMessageAvailable(false)
    onSend(text)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = inputRef.current?.value.trim()
    if (!text) return
    sendMessage(text)
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

  function setInputValue(text: string) {
    if (!inputRef.current) return
    inputRef.current.value = text
    inputRef.current.focus()
  }

  function renderComposer() {
    return (
      <div className="border-t border-amber-100 bg-[var(--chat-bg)] px-4 pb-2 pt-2 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm transition focus-within:border-amber-400 dark:border-gray-700 dark:bg-gray-800">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Hodari to plan your trip..."
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
              disabled={loading || voiceLoading}
            />
            <motion.button
              type="button"
              onClick={handleVoiceClick}
              disabled={loading || voiceLoading}
              title={recording ? 'Stop recording' : 'Record voice'}
              className={`shrink-0 p-1 transition-colors disabled:opacity-35 ${
                recording ? 'text-red-500' : 'text-gray-400 hover:text-amber-600 dark:hover:text-amber-300'
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white transition-colors hover:bg-amber-600 disabled:opacity-35"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </motion.button>
          </div>
        </form>

        <div className="mx-auto mt-2 flex max-w-2xl flex-wrap justify-center gap-2 pb-1">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInputValue(suggestion)}
              className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-all hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-amber-900/30"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--chat-bg)]">
      <motion.div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">Hodari</h1>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">Global tourist guide</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <motion.button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="relative flex h-8 w-[62px] items-center rounded-full border border-gray-200 bg-white p-1 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            whileTap={{ scale: 0.96 }}
          >
            <motion.span
              className="absolute h-6 w-6 rounded-full bg-gray-900 shadow-sm dark:bg-white"
              animate={{ x: theme === 'dark' ? 30 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            />
            <span className="relative z-10 flex h-6 w-6 items-center justify-center text-white dark:text-gray-900">
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
          className="flex flex-1 flex-col items-center justify-center bg-[var(--chat-bg)] px-6 pb-20"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="mx-auto w-full text-center">
            <TypingHeadline />

            <p className="mx-auto mt-3 max-w-md text-sm italic text-gray-500 dark:text-gray-400">
              Plan a simple, grounded trip anywhere.
            </p>

            <div className="absolute bottom-0 left-0 right-0">
              {renderComposer()}
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="chat-scroll flex-1 space-y-5 overflow-y-auto bg-[var(--chat-bg)] px-6 py-4 pb-32"
          >
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                message.role === 'user' ? (
                  <UserMessageBubble key={message.id} message={message} />
                ) : (
                  <AssistantMessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={latestAssistantStreaming && message.id === lastMsgId}
                    onChipClick={sendMessage}
                    disabled={loading || voiceLoading}
                  />
                )
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {showSkeleton && <AssistantSkeleton />}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          <AnimatePresence>
            {newMessageAvailable && (
              <motion.button
                type="button"
                onClick={() => {
                  setAutoScroll(true)
                  setNewMessageAvailable(false)
                  scrollToBottom()
                }}
                title="Jump to latest"
                className="fixed bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs text-white shadow-lg dark:bg-white dark:text-gray-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                ↓ New message
              </motion.button>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0">
            {renderComposer()}
          </div>
        </>
      )}
    </div>
  )
}
