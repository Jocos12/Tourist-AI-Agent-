'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardLabel, Input, Skeleton } from '@/components/ui'
import { fetchChatMessages, fetchConnections, sendMessage } from '@/lib/community/client'
import type { ChatMessage } from '@/lib/community/types'

interface Props {
  userId: string
  activePeerId: string | null
  onSelectPeer: (peerId: string | null) => void
}

export function ChatShell({ userId, activePeerId, onSelectPeer }: Props) {
  const [connected, setConnected] = useState<{ user_id: string; display_name: string }[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingPeers, setLoadingPeers] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadPeers = useCallback(async () => {
    setLoadingPeers(true)
    try {
      const data = await fetchConnections(userId)
      setConnected(data.connected)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoadingPeers(false)
    }
  }, [userId])

  const loadMessages = useCallback(async (peerId: string) => {
    setLoadingMessages(true)
    setError(null)
    try {
      const msgs = await fetchChatMessages(userId, peerId)
      setMessages(msgs)
    } catch (err) {
      setError(String(err))
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [userId])

  useEffect(() => {
    loadPeers()
  }, [loadPeers])

  useEffect(() => {
    if (activePeerId) loadMessages(activePeerId)
    else setMessages([])
  }, [activePeerId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!activePeerId || !draft.trim()) return
    setSending(true)
    try {
      const msg = await sendMessage(userId, activePeerId, draft)
      setMessages((prev) => [...prev, msg])
      setDraft('')
    } catch (err) {
      setError(String(err))
    } finally {
      setSending(false)
    }
  }

  const activePeer = connected.find((p) => p.user_id === activePeerId)

  return (
    <div className="flex h-full min-h-[320px] rounded-2xl border border-border overflow-hidden bg-surface/40">
      <aside className="w-36 sm:w-44 border-r border-border flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-border">
          <CardLabel>Chats</CardLabel>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
          {loadingPeers && <Skeleton className="h-10 rounded-lg" />}
          {!loadingPeers && connected.length === 0 && (
            <p className="text-xs text-text3 p-2">Connect with fans to start chatting.</p>
          )}
          {connected.map((peer) => (
            <button
              key={peer.user_id}
              type="button"
              onClick={() => onSelectPeer(peer.user_id)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                activePeerId === peer.user_id ? 'bg-gold/10 border border-gold/30' : 'hover:bg-surface2'
              }`}
            >
              <Avatar name={peer.display_name} size="sm" status="online" />
              <span className="text-xs text-text truncate">{peer.display_name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!activePeerId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle className="w-10 h-10 text-text3 mb-3" />
            <p className="font-display text-lg text-text">Message shell</p>
            <p className="text-sm text-text2 mt-1 max-w-xs">
              Real-time delivery is mocked — messages persist in MongoDB for connected fans.
            </p>
            <Badge tone="outline" mono className="mt-3">Mock DM</Badge>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Avatar name={activePeer?.display_name ?? '?'} size="sm" status="online" />
              <span className="font-medium text-sm text-text">{activePeer?.display_name}</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
              {loadingMessages && <Skeleton className="h-12 rounded-xl" />}
              {!loadingMessages &&
                messages.map((m) => {
                  const mine = m.from_user_id === userId
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <Card
                        padding="sm"
                        className={`max-w-[80%] ${mine ? 'bg-gold/15 border-gold/25' : 'bg-surface2'}`}
                      >
                        <p className="text-sm text-text">{m.text}</p>
                        <p className="text-[10px] text-text3 mt-1 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </Card>
                    </div>
                  )
                })}
              <div ref={bottomRef} />
            </div>

            {error && <p className="px-4 text-xs text-danger">{error}</p>}

            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="flex-1"
              />
              <Button iconOnly aria-label="Send" onClick={handleSend} loading={sending} disabled={!draft.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
