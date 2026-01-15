---
name: frontend-design
description: Elite UI/UX developer specializing in modern web interfaces, interactive data visualizations, design systems, and user-centric experiences. Expert in React, Next.js, Tailwind CSS, shadcn/ui, and creating beautiful, accessible interfaces for Bitcoin wallet analysis applications.
---

This skill builds exceptional, production-grade frontend interfaces for BitSleuth — an AI-powered Bitcoin wallet analyzer. Every component, page, and interface must exemplify world-class design that serves Bitcoin professionals and enthusiasts.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Technical Stack Requirements

**REQUIRED Technologies:**
- **Next.js 16** (App Router) — React-based framework
- **React 19** — Functional components with hooks, TypeScript
- **Tailwind CSS 4** — Utility-first styling with custom theme variables
- **shadcn/ui** — Radix UI primitives, accessible components
- **Lucide Icons** — Icon system
- **next-themes** — Theme management (dark/light mode)

**Additional Libraries (when applicable):**
- **recharts** — Data visualization and charts
- **Framer Motion** — Advanced animations and micro-interactions
- **react-markdown** — Markdown rendering for AI responses

**Code Standards:**
- Strict TypeScript typing (no `any` types)
- Functional components with hooks
- File naming: kebab-case for files, PascalCase for components
- Place reusable UI in `src/components/ui/`

## Design Philosophy for Bitcoin Wallet Analysis

Before coding, understand the context and commit to an intentional design direction:

- **Purpose**: What problem does this interface solve? How does it serve Bitcoin users analyzing wallets, transactions, security, or market data?
- **User Context**: Bitcoin professionals need precision, clarity, and trust. Interfaces must be information-dense yet scannable, secure-feeling, and data-driven.
- **Aesthetic Direction**: Choose a clear conceptual approach — refined minimalism with data emphasis, sophisticated dark mode with accent highlights, editorial layout with financial precision, or technical brutalism with functional beauty.
- **Differentiation**: What makes this interface exceptional? What will users remember and trust?

**CRITICAL**: Precision and intentionality define excellence. Choose a direction and execute with meticulous attention to detail.

Then implement working code that is:
- **Production-grade and functional** — Real Next.js App Router pages/components
- **Visually exceptional** — Second-to-none design quality
- **Accessible** — WCAG compliance, keyboard navigation, screen reader support
- **Performance-optimized** — Fast loading, smooth interactions
- **Cohesive with BitSleuth's branding** — Professional, Bitcoin-focused, AI-powered

## Frontend Design Excellence Guidelines

### Typography
- **Hierarchy is critical**: Clear distinction between headings, body, labels, and data
- **Font choices**: Opt for modern, professional fonts that enhance readability and trust
- **Bitcoin/financial context**: Monospace for addresses, hashes, and numeric data; clean sans-serif for UI text
- **Tailwind classes**: Use `font-mono` for technical data, carefully sized headings (`text-3xl`, `text-xl`), and consistent weights

### Color & Theming
- **Tailwind CSS variables**: Use semantic color tokens (`hsl(var(--primary))`, `hsl(var(--muted))`, etc.)
- **Dark mode first**: BitSleuth users expect sophisticated dark interfaces
- **Bitcoin orange/brand accents**: Use sparingly for emphasis and branding
- **Data visualization**: Use chart color variables (`hsl(var(--chart-positive))`, `hsl(var(--chart-negative))`, etc.)
- **Trust signals**: Professional palettes with high contrast and clear visual hierarchy

### Motion & Micro-interactions
- **Tailwind animations**: Use `animate-accordion-down`, `transition-all`, `duration-200` for smooth interactions
- **Framer Motion** (when needed): Page transitions, staggered reveals, data loading states
- **Purposeful motion**: Enhance usability — loading states, data updates, confirmation feedback
- **Performance**: CSS-first; avoid heavy animations that impact perceived performance

### Layout & Spatial Design
- **shadcn/ui Card patterns**: Consistent card-based layouts for data sections
- **Responsive design**: Mobile-first with breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Information density**: Balance data richness with white space
- **Grid systems**: Use Tailwind grid for charts, transaction lists, UTXO views
- **Scan-friendly**: F-pattern reading, clear sections, visual grouping

### Data Visualization
- **recharts integration**: Clean, professional charts for balance history, volume, performance
- **Interactive elements**: Tooltips, zoom, filtering that enhance data exploration
- **Color semantics**: Green for positive/received, red for negative/sent, consistent with financial conventions
- **Accessibility**: Alt text, keyboard navigation, screen reader labels for all data visualizations

### Components & Patterns
- **shadcn/ui components**: Button, Card, Table, Badge, Progress, Dialog, Tooltip, etc.
- **Icon usage**: Lucide icons for actions, states, and visual cues
- **Loading states**: Skeleton loaders, spinners, progressive disclosure
- **Error handling**: Clear, actionable error messages with recovery options
- **Empty states**: Helpful, guiding messages when data is unavailable

### Bitcoin-Specific Design Patterns
- **Addresses**: Monospace, truncated with copy button, QR code support
- **Transactions**: Clear inflow/outflow indicators, timestamp formatting, amount emphasis
- **Security indicators**: Color-coded risk levels, shield icons, badge components
- **Balances**: Large, prominent display with fiat conversion, precision to 8 decimals
- **UTXO displays**: Tabular layout, sortable, filterable, with visual hierarchy

## Quality Standards

**NEVER produce:**
- Generic, cookie-cutter interfaces
- Inaccessible components (missing ARIA labels, poor contrast, no keyboard nav)
- Inconsistent spacing or typography
- Breaking shadcn/ui patterns or Tailwind conventions
- Poor performance (unnecessary re-renders, heavy animations)

**ALWAYS deliver:**
- Production-ready Next.js code that follows repository patterns
- Accessible, WCAG-compliant interfaces
- Responsive designs that work mobile to desktop
- Type-safe TypeScript with proper component props
- Code that integrates seamlessly with existing BitSleuth components

## Implementation Excellence

**Match implementation complexity to design vision:**
- **Data-rich dashboards**: Complex layouts with multiple chart components, responsive grids, interactive filters
- **Simple forms**: Clean validation, clear error states, smooth submission flows
- **Transaction explorers**: Sortable tables, pagination, search, detailed modals
- **Security views**: Risk indicators, progress bars, recommendation cards

**Performance considerations:**
- Dynamic imports for heavy components (`react-force-graph-2d`)
- Optimized re-renders with React.memo where appropriate
- Efficient Tailwind class usage (avoid unnecessary complexity)
- Image optimization with next/image

Remember: BitSleuth demands world-class frontend design. Every interface should exemplify precision, trust, and exceptional user experience. Build components that Bitcoin professionals rely on daily.
