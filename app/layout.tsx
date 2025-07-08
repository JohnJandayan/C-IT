import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'C-It | Professional C Code Visualizer',
  description: 'Professional-grade C code visualization tool. Step through algorithms, visualize data structures, and understand C programming with interactive animations. Supports sorting, searching, trees, graphs, and more.',
  keywords: 'C programming, algorithm visualization, code execution, data structures, sorting algorithms, searching algorithms, programming education, C code visualizer',
  authors: [{ name: 'John Jandayan', url: 'https://portfolio-john-jandayan.vercel.app/' }],
  creator: 'John Jandayan',
  openGraph: {
    title: 'C-It | Professional C Code Visualizer',
    description: 'Professional-grade C code visualization tool for learning algorithms and data structures',
    url: 'https://c-it.pages.dev',
    siteName: 'C-It',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'C-It | Professional C Code Visualizer',
    description: 'Professional-grade C code visualization tool for learning algorithms and data structures',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}