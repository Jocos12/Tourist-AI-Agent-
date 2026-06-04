'use client'

import { useEffect, useRef } from 'react'
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
  mapOpen: boolean
  hasMapData: boolean
  onToggleMap: () => void
  selectedModel: ModelId
  onModelChange: (id: ModelId) => void
  theme: Theme
  onToggleTheme: () => void
  hasLocation: boolean
}

const CHIPS = [
  '4 hrs, $60, vegetarian near Camp Nou',
  'Best tapas before the Bernabéu match',
  'Family afternoon near Lusail Stadium',
]

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

function GpsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  )
}

function AiMessage({ content }: { content: string }) {
  return (
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
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function ChatPanel({
  messages, loading, thinkingSteps, streamingStarted, onSend,
  mapOpen, hasMapData, onToggleMap,
  selectedModel, onModelChange,
  theme, onToggleTheme,
  hasLocation,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, thinkingSteps])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = inputRef.current?.value.trim()
    if (!text || loading) return
    onSend(text)
    inputRef.current!.value = ''
  }

  const showThinking = loading && !streamingStarted

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0 bg-bg/70 backdrop-blur-md">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-text">
            Hodari
          </h1>
          <p className="font-mono text-[10px] text-text3 tracking-widest uppercase mt-0.5">
            FIFA World Cup 2026 · Guide
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="p-1.5 rounded-lg border border-border text-text3 hover:text-gold hover:border-gold/40 transition-all duration-200"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Map toggle */}
          {hasMapData && (
            <button
              onClick={onToggleMap}
              className={`flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                mapOpen
                  ? 'border-gold/50 text-gold bg-gold/10'
                  : 'border-border text-text3 hover:border-border/80 hover:text-text2'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mapOpen ? 'bg-gold' : 'bg-text3'}`} />
              {mapOpen ? 'Map on' : 'Map'}
            </button>
          )}

          <ModelSwitcher selected={selectedModel} onChange={onModelChange} />
        </div>
      </div>
      {/* Header accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent shrink-0" />

      {/* ── Messages ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 animate-fade-up">
            <div className="relative select-none mb-2">
              <p className="font-display italic text-5xl font-semibold leading-tight text-text/[0.07] pointer-events-none">
                Where to?
              </p>
              <p className="font-display italic text-5xl font-semibold leading-tight text-gold/[0.18] absolute inset-0 blur-[3px] pointer-events-none">
                Where to?
              </p>
            </div>

            <p className="font-sans text-sm text-text2 max-w-sm leading-relaxed">
              Tell me your time, budget, and preferences — I&apos;ll build your matchday plan.
            </p>

            <div className="flex flex-col gap-2 w-full max-w-md">
              {CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="text-left text-sm font-sans text-text2 px-4 py-2.5 rounded-xl border border-border hover:border-gold/40 hover:text-text hover:bg-surface2 transition-all duration-200 group"
                >
                  <span className="text-gold/50 mr-2 group-hover:text-gold transition-colors">›</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[78%] bg-surface2 border border-border/60 rounded-2xl rounded-tr-sm px-4 py-3">
                <p className="text-sm text-text leading-relaxed">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[90%] w-full">
                <p className="font-mono text-[10px] text-gold tracking-[0.15em] uppercase mb-2 ml-0.5">Hodari</p>
                <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-5 py-4">
                  <AiMessage content={msg.content} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Thinking phase */}
        {showThinking && (
          <div className="flex justify-start animate-fade-up">
            <div className="max-w-[90%] w-full">
              <p className="font-mono text-[10px] text-gold tracking-[0.15em] uppercase mb-2 ml-0.5">Hodari</p>
              <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-5 py-4 relative overflow-hidden">
                {/* Subtle glow behind ring */}
                <div className="absolute top-3 left-4 w-6 h-6 rounded-full bg-gold/5 blur-md" />
                <div className="space-y-2.5 relative">
                  {thinkingSteps.length === 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="thinking-ring" />
                      <span className="font-mono text-[11px] text-text3 tracking-widest">thinking…</span>
                    </div>
                  ) : (
                    thinkingSteps.map((step, i) => {
                      const isLast = i === thinkingSteps.length - 1
                      return (
                        <div key={i} className="flex items-center gap-3 animate-fade-up">
                          {isLast ? (
                            <div className="thinking-ring" />
                          ) : (
                            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 font-mono text-[11px] text-gold/50">✓</span>
                          )}
                          <span className={`font-mono text-[11px] tracking-wider ${isLast ? 'text-gold/90' : 'text-text3'}`}>
                            {step}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-border/60 bg-bg/70 backdrop-blur-md shrink-0"
      >
        {/* GPS status row */}
        {hasLocation && (
          <div className="flex items-center gap-1.5 mb-2 ml-1">
            <span className="text-green"><GpsIcon /></span>
            <span className="font-mono text-[9px] text-text3 tracking-wider uppercase">Location active</span>
          </div>
        )}
        <div className="flex gap-2 items-center bg-surface border border-border rounded-2xl px-4 py-1 focus-within:border-gold/40 transition-colors">
          <input
            ref={inputRef}
            type="text"
            placeholder="Time, budget, preferences, location…"
            className="flex-1 bg-transparent py-3 text-sm text-text placeholder-text3 outline-none font-sans"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 w-8 h-8 rounded-xl bg-gold text-bg flex items-center justify-center disabled:opacity-30 hover:bg-gold-light transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
