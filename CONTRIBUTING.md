# Contributing to BitSleuth

Thank you for your interest in contributing to BitSleuth! This document provides guidelines for contributing to the project.

## Documentation Guidelines

### Markdown File Storage

**All documentation markdown files must be stored in the `docs/` folder.**

This includes:
- Product requirements and specifications
- Technical documentation
- Development guides
- Strategy documents (SEO, marketing, etc.)
- TODO lists and roadmaps
- Any other markdown documentation

#### Examples of Correct Placement

✅ **Correct:**
- `docs/PRD.md` - Product Requirements Document
- `docs/SEO_STRATEGY.md` - SEO Strategy
- `docs/todo.md` - Development roadmap
- `docs/API_GUIDE.md` - API documentation
- `docs/DEPLOYMENT.md` - Deployment instructions

❌ **Incorrect:**
- `src/app/documentation.md` - Should be in `docs/`
- `src/components/guide.md` - Should be in `docs/`
- `root-level-doc.md` - Should be in `docs/` (unless it's README.md, LICENSE, CONTRIBUTING.md, AGENTS.md)

#### Exceptions

The following markdown files are allowed at the root level:
- `README.md` - Main project documentation
- `LICENSE` or `LICENSE.md` - License information
- `CONTRIBUTING.md` - This file
- `AGENTS.md` - Agent overview and project structure
- `.github/` directory - GitHub-specific configurations and templates

### File Naming Conventions

- Use UPPERCASE for important root-level documents (e.g., `README.md`, `CONTRIBUTING.md`)
- Use lowercase with hyphens for general documentation files (e.g., `api-guide.md`, `deployment-instructions.md`)
- Use descriptive names that clearly indicate the content

## Code Contribution Guidelines

### TypeScript
- **Strict typing**: All files must be properly typed
- **No `any` types**: Use proper TypeScript types instead
- **Formatting**: Follow existing code style

### Components
- Use functional components with hooks
- File naming: kebab-case for files, PascalCase for components
- Place reusable UI components in `src/components/ui/`

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commit format when possible
- Keep commits focused and atomic

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear commits
4. Run `npm run typecheck` and `npm run lint`
5. Test thoroughly in development
6. Push to your fork
7. Open a Pull Request with description of changes

## Development Workflow

### Prerequisites
- Node.js 18.x or higher (Node.js 20.x or 22.x recommended)
- npm (or pnpm/yarn)

### Setup
```bash
npm install
npm run dev          # Start Next.js web app
npm run genkit:dev   # Start AI backend (in separate terminal)
```

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run genkit:dev   # Start Genkit AI flows
```

## Questions or Issues?

If you have questions or encounter issues, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ by BitSleuth**
