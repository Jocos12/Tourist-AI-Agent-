import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hodari — FIFA World Cup 2026',
  description: 'Your matchday guide to the 2026 FIFA World Cup cities.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0C0C0E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hodari_theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans bg-bg text-text antialiased">{children}</body>
    </html>
  )
}
