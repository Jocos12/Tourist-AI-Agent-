import type { Metadata } from 'next'
import LoginView from '@/components/landing/LoginView'

export const metadata: Metadata = {
  title: 'Sign in — Hodari',
  description: 'Sign in with your email to load your fan profile and matchday plans.',
}

export default function LoginPage() {
  return <LoginView />
}
