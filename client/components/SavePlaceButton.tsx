'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import type { Place } from '@/lib/types'
import { placeToSavedPayload } from '@/lib/savedPlaces'
import { savePlace } from '@/lib/savedClient'
import { Button } from '@/components/ui/Button'

interface Props {
  place: Place
  comment?: string
  size?: 'sm' | 'md'
  onSaved?: () => void
}

export function SavePlaceButton({ place, comment, size = 'sm', onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      await savePlace(placeToSavedPayload(place, comment))
      setDone(true)
      onSaved?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save place')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={done ? 'secondary' : 'primary'}
      size={size}
      loading={loading}
      disabled={done}
      leftIcon={<Bookmark className="h-3.5 w-3.5" />}
      onClick={handleSave}
    >
      {done ? 'Saved' : 'Save place'}
    </Button>
  )
}
