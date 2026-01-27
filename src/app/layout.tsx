import type { Metadata } from 'next'
import { getAuthContext } from '@madebykav/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'App Template | MadeByKav',
  description: 'A template for building apps on the MadeByKav platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get authentication context from platform
  // This provides tenantId, userId, and session info
  const auth = await getAuthContext()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        {/*
          Pass auth context to client components if needed:
          <AuthProvider value={auth}>
            {children}
          </AuthProvider>
        */}
        {children}
      </body>
    </html>
  )
}
