---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: loads after hydration
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them after hydration.

**Incorrect (blocks initial bundle):**

```tsx
import { Analytics } from '@/components/Analytics'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Correct (loads after hydration):**

```tsx
import dynamic from 'next/dynamic'

const Analytics = dynamic(
  () => import('@/components/Analytics').then(m => m.Analytics),
  { ssr: false }
)

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Firebase Analytics example:**

```tsx
// src/components/Analytics.tsx
'use client'

import { useEffect } from 'react'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { app } from '@/lib/firebase'

export function Analytics() {
  useEffect(() => {
    isSupported().then(supported => {
      if (supported) {
        getAnalytics(app)
      }
    })
  }, [])

  return null
}

// In layout - load dynamically after hydration
const Analytics = dynamic(
  () => import('@/components/Analytics').then(m => m.Analytics),
  { ssr: false }
)
```

**Common libraries to defer:**

- Analytics (Firebase Analytics, Mixpanel, Amplitude)
- Error tracking (Sentry, Bugsnag)
- Chat widgets (Intercom, Crisp)
- Social embeds (Twitter, Facebook)
- A/B testing tools

This pattern reduces initial bundle size and improves Time to Interactive (TTI).
