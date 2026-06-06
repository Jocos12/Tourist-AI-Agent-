'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string | null
  loading: boolean
  streaming: boolean
  onOpen: () => void
}

// Compact floating card shown when the full chat is collapsed — surfaces Hodari's
// latest reply (and live progress) so the user can talk by voice and still see the
// response without reopening the whole chat panel.
export function CollapsedReply({ content, loading, streaming, onOpen }: Props) {
  const showThinking = loading && !streaming && !content

  return (
    <div className="absolute top-4 left-4 z-20 w-[340px] max-w-[80vw] glass rounded-2xl overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <span className="font-mono text-[10px] text-gold tracking-[0.15em] uppercase">Hodari</span>
        <button
          onClick={onOpen}
          title="Open full chat"
          className="flex items-center gap-1.5 text-text3 hover:text-gold transition-colors"
        >
          <span className="font-mono text-[9px] tracking-wider uppercase">Open chat</span>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3 max-h-[42vh] overflow-y-auto scrollbar-hide">
        {showThinking ? (
          <div className="flex items-center gap-2.5 py-1">
            <div className="thinking-ring" />
            <span className="font-mono text-[11px] text-text3 tracking-widest">thinking…</span>
          </div>
        ) : content ? (
          <div className="prose-hodari text-[13.5px] text-text leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && <span className="stream-caret" />}
          </div>
        ) : (
          <p className="text-[12.5px] text-text3 leading-relaxed">
            Tap the mic and ask me anything, your reply shows up here.
          </p>
        )}
      </div>
    </div>
  )
}
