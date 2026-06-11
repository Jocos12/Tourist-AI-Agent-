import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Saved places — Hodari',
  description: 'Your saved restaurants and venues, visit reminders, and taste analytics.',
}

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-text2 transition-colors hover:border-gold/40 hover:text-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Chat
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold">Saved places</h1>
              <p className="text-[11px] uppercase tracking-wider text-text3">Your collection</p>
            </div>
          </div>
          <Link
            href="/saved/analytics"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-text2 transition-colors hover:border-gold/40 hover:text-gold"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
