import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'App Template | MadeByKav',
  description: 'A template for building apps on the MadeByKav platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
