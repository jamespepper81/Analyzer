import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { WalletProvider } from '@/contexts/wallet-context';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.bitsleuth.ai';

export const metadata: Metadata = {
  title: 'BitSleuth | AI Bitcoin Wallet Analyzer',
  description: "BitSleuth is an AI-powered Bitcoin wallet insights app that analyzes your wallet to uncover security issues, transaction patterns, and smart investment signals. Get powerful analysis in seconds.",
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.json',
  openGraph: {
    title: 'BitSleuth | AI Bitcoin Wallet Analyzer',
    description: 'Get AI-powered insights into any Bitcoin wallet. Analyze transactions, security, and privacy with BitSleuth.',
    url: siteUrl,
    siteName: 'BitSleuth',
    images: [
      {
        url: `${siteUrl}/1200x630.png`,
        width: 1200,
        height: 630,
        alt: 'BitSleuth AI Bitcoin Wallet Analyzer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BitSleuth | AI Bitcoin Wallet Analyzer',
    description: 'Get AI-powered insights into any Bitcoin wallet. Analyze transactions, security, and privacy with BitSleuth.',
    images: [`${siteUrl}/1200x630.png`],
  },
  verification: {
    google: 'rU1NLr7u83Rwv5xzcU6s1L0B8bi5Re1-UDd51RaQuJg',
  },
};

export const viewport: Viewport = {
  themeColor: '#BF5FFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#BF5FFF" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <WalletProvider>
            {children}
          </WalletProvider>
          <Toaster />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
