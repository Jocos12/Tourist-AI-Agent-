import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hodari — Global Tourist AI',
  description: 'Grounded, personalized trip planning for any city.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#FFF7ED',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-bg text-text antialiased">{children}</body>
    </html>
  )
}
