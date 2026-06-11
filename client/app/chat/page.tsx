'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HodariApp from '@/components/LandingPage'

/** The chat app lives behind the email sign-in gate. */
export default function ChatPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('hodari_email')) setAuthed(true)
    else router.replace('/login')
  }, [router])

  if (!authed) return null
  return <HodariApp />
}
