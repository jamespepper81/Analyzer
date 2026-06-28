import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge proxy to protect the dynamic blockchain-explorer routes
 * (`/transactions/[id]`, `/address/[address]`, `/block/[id]`) from crawler
 * traffic.
 *
 * These pages cross-link densely (a transaction links to every input/output
 * address, each address links back to every transaction, blocks link to prior
 * blocks + transactions), forming an effectively infinite "spider trap". Every
 * crawl runs an uncached server function (SSR shell + a `'use server'` data
 * fetch), so unchecked bots generate large compute->CDN egress around the clock
 * even with zero human users.
 *
 * robots.txt (see `src/app/robots.ts`) tells well-behaved bots to stay out.
 * This proxy is the enforcement layer for bots that ignore it: it matches
 * the path (catching both the GET page request and the Server Action POST that
 * posts back to the same path) and short-circuits known crawler User-Agents at
 * the edge with a tiny `403` before the expensive Node function ever runs.
 *
 * Real users pass through untouched, but every response on these routes carries
 * `X-Robots-Tag: noindex, nofollow` as defense in depth so the pages are never
 * indexed even if discovered through other links.
 */

// Curated list of common search-engine, social, AI and SEO crawler User-Agents,
// plus a generic fallback. Normal browsers do not match these tokens.
const BOT_UA_REGEX = new RegExp(
  [
    'applebot',
    'googlebot',
    'bingbot',
    'gptbot',
    'oai-searchbot',
    'chatgpt',
    'claudebot',
    'claude-web',
    'anthropic',
    'ccbot',
    'perplexitybot',
    'amazonbot',
    'bytespider',
    'yandex(bot)?',
    'baiduspider',
    'duckduckbot',
    'slurp', // Yahoo
    'facebookexternalhit',
    'meta-externalagent',
    'semrushbot',
    'ahrefsbot',
    'mj12bot',
    'dotbot',
    'petalbot',
    'dataforseobot',
    // Generic fallback for anything self-identifying as automated.
    'bot\\b',
    'crawler',
    'spider',
  ].join('|'),
  'i'
);

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  if (BOT_UA_REGEX.test(userAgent)) {
    return new NextResponse(null, {
      status: 403,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/transactions/:path*',
    '/address/:path*',
    '/block/:path*',
  ],
};
