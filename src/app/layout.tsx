import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Core Systems Broker',
  description: 'Authentication and token management service for Core Health Systems',
  keywords: ['healthcare', 'authentication', 'JWT', 'API', 'broker'],
  authors: [{ name: 'Core Health Systems' }],
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                      Core Systems Broker
                    </h1>
                  </div>
                  <div className="text-sm text-gray-500">
                    Authentication & Token Service
                  </div>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="bg-white border-t mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="text-center text-sm text-gray-500">
                  <p>&copy; 2024 Core Health Systems. All rights reserved.</p>
                  <p className="mt-2">
                    <a 
                      href="/api/health" 
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Health Check
                    </a>
                    <a 
                      href="/api/sanity" 
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Sanity Check
                    </a>
                    <a 
                      href="/.well-known/jwks.json" 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      JWKS
                    </a>
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </UserProvider>
      </body>
    </html>
  )
}
