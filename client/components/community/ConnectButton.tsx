'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { connectToUser } from '@/lib/community/client'
import type { ConnectionStatus } from '@/lib/community/types'

interface Props {
  userId: string
  targetUserId: string
  status: ConnectionStatus
  onStatusChange: (status: ConnectionStatus) => void
}

export function ConnectButton({ userId, targetUserId, status, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const { status: next } = await connectToUser(userId, targetUserId)
      onStatusChange(next)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'connected') {
    return <Button variant="secondary" disabled pill>Connected</Button>
  }

  if (status === 'pending_sent') {
    return <Button variant="secondary" disabled pill>Request sent</Button>
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="primary" pill loading={loading} onClick={handleConnect}>
        {status === 'pending_received' ? 'Accept connection' : 'Connect'}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
