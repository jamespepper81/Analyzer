import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { GoogleAnalytics } from '@next/third-parties/google';
import { WalletProviderWrapper } from '@/components/wallet-provider-wrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.bitsleuth.ai';

export const metadata: Metadata = {
  title: {
    default: 'BitSleuth | AI Bitcoin Wallet Analyzer & Security Tool',
    template: '%s | BitSleuth - AI Bitcoin Wallet Analyzer'
  },
  description: "BitSleuth is the leading AI-powered Bitcoin wallet analyzer that provides comprehensive security insights, transaction analysis, and privacy recommendations. Analyze any Bitcoin wallet instantly with advanced AI technology. Free Bitcoin wallet security scanner, transaction tracker, and privacy analyzer.",
  keywords: [
    'Bitcoin wallet analyzer',
    'Bitcoin security tool',
    'AI Bitcoin analysis',
    'Bitcoin wallet scanner',
    'Bitcoin privacy analyzer',
    'Bitcoin transaction tracker',
    'Bitcoin wallet insights',
    'Bitcoin security scanner',
    'Bitcoin wallet checker',
    'Bitcoin privacy tool',
    'Bitcoin wallet analysis',
    'Bitcoin security audit',
    'Bitcoin wallet monitoring',
    'Bitcoin transaction analysis',
    'Bitcoin wallet security'
  ],
  authors: [{ name: 'BitSleuth Team' }],
  creator: 'BitSleuth',
  publisher: 'BitSleuth',
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'BitSleuth | AI Bitcoin Wallet Analyzer & Security Tool',
    description: 'Get comprehensive AI-powered insights into any Bitcoin wallet. Analyze security, privacy, transactions, and get smart recommendations. Free Bitcoin wallet analyzer with advanced AI technology.',
    url: siteUrl,
    siteName: 'BitSleuth',
    images: [
      {
        url: `${siteUrl}/1200x630.png`,
        width: 1200,
        height: 630,
        alt: 'BitSleuth AI Bitcoin Wallet Analyzer - Comprehensive Bitcoin Security Analysis Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BitSleuth | AI Bitcoin Wallet Analyzer & Security Tool',
    description: 'Get comprehensive AI-powered insights into any Bitcoin wallet. Analyze security, privacy, transactions, and get smart recommendations.',
    images: [`${siteUrl}/1200x630.png`],
    creator: '@bitsleuth',
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
  verification: {
    google: 'rU1NLr7u83Rwv5xzcU6s1L0B8bi5Re1-UDd51RaQuJg',
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#F7931A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isTestMode = process.env.NODE_ENV === 'test';
  const testXpub = isTestMode ? process.env.TEST_XPUB : undefined;
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7931A" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "BitSleuth",
              "alternateName": "BitSleuth AI Bitcoin Wallet Analyzer",
              "description": "AI-powered Bitcoin wallet analyzer that provides comprehensive security insights, transaction analysis, and privacy recommendations for Bitcoin wallets.",
              "url": siteUrl,
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Bitcoin wallet security analysis",
                "Transaction pattern analysis",
                "Privacy and address reuse detection",
                "AI-powered insights and recommendations",
                "Real-time Bitcoin market data",
                "Mempool monitoring",
                "UTXO management",
                "Tax reporting and P&L analysis"
              ],
              "screenshot": `${siteUrl}/1200x630.png`,
              "author": {
                "@type": "Organization",
                "name": "BitSleuth",
                "url": siteUrl
              },
              "publisher": {
                "@type": "Organization",
                "name": "BitSleuth",
                "url": siteUrl
              },
              "keywords": "Bitcoin, wallet analyzer, security, privacy, AI, blockchain analysis, cryptocurrency, Bitcoin security tool",
              "inLanguage": "en-US",
              "isAccessibleForFree": true,
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "softwareVersion": "1.0",
              "datePublished": "2025-01-01",
              "dateModified": new Date().toISOString().split('T')[0]
            })
          }}
        />
      </head>
      <body className="font-body antialiased">
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <ThemeProvider 
              attribute="class" 
              defaultTheme="system" 
              enableSystem
              disableTransitionOnChange={false}
              storageKey="bitsleuth-theme"
            >
              <WalletProviderWrapper testXpub={testXpub}>
                {children}
              </WalletProviderWrapper>
              <Toaster />
            </ThemeProvider>
          </Suspense>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
        </ErrorBoundary>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
