import { type MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.bitsleuth.ai';
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/landing',
          '/market',
          '/mempool',
          '/discover',
          '/feedback',
          '/block/*',
          '/transactions/*',
          '/address/*',
        ],
        disallow: [
          '/dashboard/',
          '/analysis/',
          '/security/',
          '/chat/',
          '/report/',
          '/coin-control/',
          '/transactions', // Disallow the generic transaction list page
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/landing',
          '/market',
          '/mempool',
          '/discover',
          '/feedback',
          '/block/*',
          '/transactions/*',
          '/address/*',
        ],
        disallow: [
          '/dashboard/',
          '/analysis/',
          '/security/',
          '/chat/',
          '/report/',
          '/coin-control/',
          '/transactions',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
