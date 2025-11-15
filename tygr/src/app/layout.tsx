import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'TYGR Security Agent | Enterprise Security Testing Platform',
    template: '%s | TYGR Security Agent'
  },
  description: 'TYGR Security Agent - A state-of-the-art React/Next.js UI for Strix. Enterprise-grade security testing with AI-powered vulnerability detection.',
  keywords: [
    'security',
    'pentesting',
    'vulnerability',
    'scanning',
    'strix',
    'tygr',
    'cybersecurity',
    'web security'
  ],
  authors: [{ name: 'TYGR Security Team' }],
  creator: 'TYGR Security Team',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tygr.security',
    title: 'TYGR Security Agent | Enterprise Security Testing Platform',
    description: 'Enterprise-grade security testing with AI-powered vulnerability detection.',
    siteName: 'TYGR Security Agent',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TYGR Security Agent',
    description: 'Enterprise-grade security testing with AI-powered vulnerability detection.',
    creator: '@tygrsecurity',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-tygr-black-900 text-tygr-black-50">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
