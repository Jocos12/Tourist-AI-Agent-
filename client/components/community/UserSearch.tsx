'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, UserX } from 'lucide-react'
import { Avatar, Badge, Card, Input, Skeleton } from '@/components/ui'
import { searchCommunityUsers } from '@/lib/community/client'
import type { SearchUserResult } from '@/lib/community/types'

interface Props {
  userId: string
  onSelectUser: (userId: string) => void
}

export function UserSearch({ userId, onSelectUser }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await searchCommunityUsers(userId, trimmed)
      setResults(data)
      setSearched(true)
    } catch (err) {
      setError(String(err))
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, runSearch])

  return (
    <div className="flex flex-col gap-3 h-full">
      <Input
        label="Search fans"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
        hint="Only fans who are not invisible appear in search."
      />

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 min-h-0">
        {loading && (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        )}

        {error && (
          <Card padding="md" className="border-danger/30 bg-danger/5">
            <p className="text-sm text-danger">{error}</p>
          </Card>
        )}

        {!loading && !error && !searched && !query.trim() && (
          <EmptyState
            icon={<Search className="w-8 h-8 text-text3" />}
            title="Find fellow fans"
            body="Search by display name to view public profiles and connect."
          />
        )}

        {!loading && !error && searched && results.length === 0 && (
          <EmptyState
            icon={<UserX className="w-8 h-8 text-text3" />}
            title="No fans found"
            body={`No one matches “${query.trim()}”. Try a different name.`}
          />
        )}

        {!loading &&
          results.map((user) => (
            <button
              key={user.user_id}
              type="button"
              onClick={() => onSelectUser(user.user_id)}
              className="w-full text-left"
            >
              <Card interactive padding="sm" className="flex items-center gap-3">
                <Avatar name={user.display_name} status={user.visibility === 'active' ? 'online' : 'offline'} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text truncate">{user.display_name}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge tone={user.visibility === 'active' ? 'success' : 'outline'} mono>
                      {user.visibility === 'active' ? 'On map' : 'Private'}
                    </Badge>
                    <ConnectionBadge status={user.connection_status} />
                  </div>
                </div>
              </Card>
            </button>
          ))}
      </div>
    </div>
  )
}

function ConnectionBadge({ status }: { status: SearchUserResult['connection_status'] }) {
  if (status === 'connected') return <Badge tone="gold" mono>Connected</Badge>
  if (status === 'pending_sent') return <Badge tone="neutral" mono>Pending</Badge>
  if (status === 'pending_received') return <Badge tone="gold" mono>Accept?</Badge>
  return null
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="mb-3">{icon}</div>
      <p className="font-display text-lg text-text">{title}</p>
      <p className="text-sm text-text2 mt-1 max-w-xs">{body}</p>
    </div>
  )
}
