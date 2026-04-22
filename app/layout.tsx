import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TwinMind — Live Meeting Copilot',
  description: 'Always-on AI meeting assistant with live suggestions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
