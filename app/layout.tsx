import type { Metadata } from 'next'
import { DM_Sans, Space_Mono, Syne } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

// Keep Syne for setup/onboarding headings
const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Fitness Coach AI',
  description: 'Your AI-powered nutrition & fitness companion',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${spaceMono.variable} ${syne.variable} antialiased`}
        style={{ background: 'var(--fc-bg)', color: 'var(--fc-text)', fontFamily: 'var(--font-dm-sans)' }}
      >
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
