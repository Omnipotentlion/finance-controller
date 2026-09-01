import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LedgerAnalyser | AI-Powered Reconciliation Control Center',
  description:
    'Multi-source financial reconciliation engine with deterministic verification, AI root-cause investigation, and bounded auto-resolution. Track 04 — Razorpay AI Buildathon 2026.',
  keywords: ['LedgerAnalyser', 'reconciliation', 'settlement', 'payment operations', 'AI finance'],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
