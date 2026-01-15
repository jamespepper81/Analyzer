# Dependabot Configuration Guide

This document explains the Dependabot configuration for BitSleuth Analyzer and why it's optimized for our Next.js + Tailwind + shadcn/ui stack.

## Overview

Our `.github/dependabot.yml` is configured to automatically update dependencies while minimizing noise and ensuring related packages are updated together.

## Configuration Structure

### NPM Ecosystem

**Schedule**: Weekly on Mondays at 09:00
- Provides timely security updates without overwhelming the team
- Weekly cadence balances freshness with stability

**Open Pull Requests Limit**: 10
- Prevents Dependabot from creating too many PRs at once
- Allows time for proper review and testing

### Dependency Groups

We use strategic grouping to ensure related packages are updated together in a single PR:

#### 1. **nextjs** - Next.js Framework
```yaml
patterns:
  - "next"
  - "react"
  - "react-dom"
  - "eslint-config-next"
```
**Why**: Next.js, React, and React-DOM must be compatible versions. ESLint config also needs to match Next.js version.

#### 2. **tailwind** - Tailwind CSS Ecosystem
```yaml
patterns:
  - "tailwindcss"
  - "tailwindcss-animate"
  - "tailwind-merge"
  - "autoprefixer"
  - "postcss"
  - "@tailwindcss/*"
```
**Why**: Tailwind and its ecosystem packages (animations, merge utility) and build tools (PostCSS, Autoprefixer) should be updated together to ensure compatibility.

#### 3. **radix-ui** - shadcn/ui Foundation
```yaml
patterns:
  - "@radix-ui/*"
```
**Why**: All Radix UI components are from the same package family and should maintain version consistency. These are the foundation of shadcn/ui components.

#### 4. **genkit** - Genkit AI Framework
```yaml
patterns:
  - "genkit"
  - "genkit-cli"
  - "@genkit-ai/*"
```
**Why**: Genkit packages must be compatible across the runtime, CLI, and plugins. The `@genkit-ai/*` pattern covers all Genkit plugins including Firebase (`@genkit-ai/firebase`), Next.js (`@genkit-ai/next`), and OpenAI compatibility layer (`@genkit-ai/compat-oai`).

#### 5. **typescript** - TypeScript and Type Definitions
```yaml
patterns:
  - "typescript"
  - "@types/*"
```
**Why**: TypeScript version and type definitions should be updated together to ensure types match the compiler version.

#### 6. **forms** - Form Handling
```yaml
patterns:
  - "react-hook-form"
  - "@hookform/resolvers"
  - "zod"
```
**Why**: React Hook Form, its resolvers, and Zod schema validator work together for form validation and should maintain compatibility.

#### 7. **bitcoin** - Bitcoin Libraries
```yaml
patterns:
  - "bitcoinjs-lib"
  - "bip32"
  - "ecpair"
  - "bs58check"
  - "@types/bs58check"
  - "@bitcoinerlab/secp256k1"
```
**Why**: Bitcoin-related cryptography libraries are tightly coupled and should be updated together to prevent incompatibilities.

#### 8. **development-dependencies** - Dev Tools (Minor/Patch Only)
```yaml
dependency-type: "development"
update-types:
  - "minor"
  - "patch"
exclude-patterns:
  - "@types/*"
  - "typescript"
  - "tailwindcss"
  - "@tailwindcss/*"
  - "autoprefixer"
  - "postcss"
  - "eslint-config-next"
  - "genkit-cli"
  - "@radix-ui/*"
  - "react-hook-form"
  - "@hookform/resolvers"
  - "zod"
  - "bitcoinjs-lib"
  - "bip32"
  - "ecpair"
  - "bs58check"
  - "@bitcoinerlab/secp256k1"
```
**Why**: Catches other dev dependencies but excludes packages already in specific groups to prevent duplicate PRs. Only minor/patch updates to avoid breaking changes in development tools.

### GitHub Actions Ecosystem

**Schedule**: Monthly
- GitHub Actions updates are less critical and less frequent
- Monthly checks are sufficient for workflow dependencies

## Best Practices for This Stack

### Why This Configuration Works for Next.js 16 + React 19 + Tailwind 4 + shadcn

1. **Framework Cohesion**: Next.js 16 with React 19 requires coordinated updates. Our `nextjs` group ensures these are tested together.

2. **Styling Ecosystem**: Tailwind CSS 4 with its PostCSS plugin, merge utility, and build chain need version alignment. Note: Tailwind 4 uses a new PostCSS-based architecture with `@tailwindcss/postcss` instead of separate PostCSS plugins.

3. **Component Library**: Radix UI (shadcn/ui foundation) benefits from consistent versioning across all primitives.

4. **Type Safety**: TypeScript and @types packages updated together prevent type mismatches.

5. **Reduced PR Noise**: Instead of 10+ PRs for a Radix UI update across all components, you get 1 PR with all components updated together.

### Security Updates

All dependency types are allowed for automatic updates:
```yaml
allow:
  - dependency-type: "all"
```

This ensures security patches are applied quickly, regardless of grouping.

### Versioning Strategy

```yaml
versioning-strategy: increase
```

Increases the version requirement in package.json when updating, maintaining compatibility with the existing package manager (npm).

## Commit Message Format

- **NPM updates**: `chore(deps): update nextjs group`
- **GitHub Actions**: `ci: update actions/checkout action to v4`

This follows conventional commits and makes it easy to track dependency updates in the changelog.

## Labels

All Dependabot PRs are labeled with:
- `dependencies` - Identifies dependency updates
- `security` - Highlights security-related updates
- `github-actions` - Specific to Actions updates

## Monitoring and Review

### Review Checklist for Dependabot PRs:

1. **Check changelog**: Look for breaking changes
2. **Run tests**: Ensure `npm run test` passes
3. **Run build**: Verify `npm run build` succeeds
4. **Type check**: Confirm `npm run typecheck` has no new errors
5. **Manual testing**: For major updates, test key flows
6. **Preview deployment**: Test in a preview environment if available

### Common Scenarios

**Scenario 1**: Radix UI update
- Single PR updates all 15+ Radix components
- Review breaking changes in Radix changelog
- Test all shadcn/ui components in use

**Scenario 2**: Next.js + React update
- Single PR updates Next.js, React, React-DOM together
- Review Next.js upgrade guide
- Test App Router functionality, server components, React 19 features

**Scenario 3**: Tailwind ecosystem update
- Single PR updates Tailwind, plugins, PostCSS
- Review Tailwind changelog for utility changes and v4 migration notes
- Verify `@tailwindcss/postcss` compatibility
- Test builds, verify no styling regressions

## Troubleshooting

### Peer Dependency Warnings

With React 19, some packages may show peer dependency warnings. This is expected during the ecosystem transition.

**Common warnings you may see:**

```
npm WARN ERESOLVE overriding peer dependency
npm WARN While resolving: react-force-graph-2d@1.25.4
npm WARN Found: react@19.2.0
npm WARN Could not resolve dependency:
npm WARN peer react@"^16.0.0 || ^17.0.0 || ^18.0.0" from react-force-graph-2d@1.25.4
```

**How to interpret:**

- ⚠️ **Warning** (yellow): Usually safe to proceed if the package works in testing
- ❌ **Error** (red): Package is incompatible, wait for update or find alternative

**Solution**: Review the warning, check if the package supports React 19, and:
- Update the package if a compatible version exists
- Test thoroughly in your development environment
- Use `overrides` in package.json if needed (like we do for tiny-secp256k1)
- Wait for package maintainer to update for breaking incompatibilities

**Common packages with warnings:**
- Charting libraries (recharts, react-force-graph)
- Some form libraries
- Legacy UI component libraries

**When to act vs wait:**
- ✅ **Act now**: Security vulnerabilities, features you need
- ⏸️ **Wait**: Package works fine, only peer dependency warning
- 🔍 **Monitor**: Check package issues/PRs for React 19 support status

### Merge Conflicts

If Dependabot PRs have conflicts:
1. GitHub will mark the PR as conflicted
2. Comment `@dependabot rebase` to ask Dependabot to rebase
3. Or close the PR and Dependabot will create a new one

### Too Many PRs

If you hit the 10 PR limit:
1. Review and merge existing PRs
2. Close PRs for updates you don't want
3. Adjust grouping to consolidate more packages

## Future Improvements

Consider these enhancements as the project evolves:

1. **Version constraints**: Add `ignore` rules for packages you want to pin
2. **Custom schedules**: Different schedules for prod vs dev dependencies
3. **Auto-merge**: Enable auto-merge for trusted minor/patch updates
4. **Changelog generation**: Integrate with release notes

## References

- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)
- [Next.js upgrade guide](https://nextjs.org/docs/upgrading)
- [React 19 upgrade guide](https://react.dev/blog/2024/12/05/react-19)
- [shadcn/ui React 19 support](https://ui.shadcn.com/docs/react-19)
- [Tailwind CSS releases](https://github.com/tailwindlabs/tailwindcss/releases)
