import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'C-It - C Algorithm Visualizer',
  description: 'Interactive visualization tool for C programming algorithms. Visualize sorting, searching, and data structure algorithms with step-by-step animations.',
  keywords: 'C programming, algorithm visualizer, sorting algorithms, data structures, computer science education',
  authors: [{ name: 'John Jandayan' }],
  creator: 'John Jandayan',
  publisher: 'C-It',
  robots: 'index, follow',
  openGraph: {
    title: 'C-It - C Algorithm Visualizer',
    description: 'Interactive visualization tool for C programming algorithms',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'C-It - C Algorithm Visualizer',
    description: 'Interactive visualization tool for C programming algorithms',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        {children}
      </body>
    </html>
  )
} 