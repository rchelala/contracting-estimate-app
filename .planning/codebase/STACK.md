# Technology Stack

**Analysis Date:** 2026-05-02

## Languages

**Primary:**
- TypeScript 6.0.2 - Frontend application and build configuration (strict mode enforced)
- SQL - Postgres database schema and migrations

**Secondary:**
- JavaScript - Configuration files (eslint.config.js)
- HTML/CSS - UI rendering via React

## Runtime

**Environment:**
- Node.js (version managed via `.nvmrc`, not yet created in working branch)

**Package Manager:**
- npm (inferred from package.json structure)
- Lockfile: `package-lock.json` (not visible in exploration, standard for npm)

## Frameworks

**Core:**
- React 18.3.1 - UI framework with strict mode
- React DOM 18.3.1 - DOM rendering

**Build & Tooling:**
- Vite 8.0.10 - Build tool and dev server
- @vitejs/plugin-react 6.0.1 - React plugin for Vite
- TypeScript 6.0.2 - Type checking and compilation

**Testing:**
- Vitest 4.1.5 - Unit test runner (configured in `vite.config.ts`)
- @vitest/ui 4.1.5 - Vitest UI dashboard
- @testing-library/react 16.3.2 - React component testing
- @testing-library/jest-dom 6.9.1 - DOM matchers
- jsdom 29.1.1 - DOM environment for tests

**Linting & Code Quality:**
- ESLint 10.2.1 - JavaScript/TypeScript linter (flat config in `eslint.config.js`)
- typescript-eslint 8.58.2 - TypeScript support for ESLint
- @eslint/js 10.0.1 - Core ESLint rules
- eslint-plugin-react-hooks 7.1.1 - React hooks linting
- eslint-plugin-react-refresh 0.5.2 - React Fast Refresh validation

**Other Build Tools:**
- Supabase CLI 2.98.0 - Database migrations and local development

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.105.1 - Supabase client SDK for database and auth (ONLY stable dependency, pinned to patch version)
- React 18.3.1 - Core UI framework

**Infrastructure:**
- Not yet installed: @dnd-kit/core (drag-and-drop, mentioned in CLAUDE.md)
- Not yet installed: zustand (state management, mentioned in CLAUDE.md)
- Not yet installed: idb-keyval (offline IndexedDB, mentioned in CLAUDE.md)
- Not yet installed: @supabase/storage-js (file storage via Supabase Storage, mentioned in CLAUDE.md)
- Not yet installed: stripe (payments SDK, mentioned in CLAUDE.md)
- Not yet installed: tailwind (styling, mentioned in CLAUDE.md)
- Not yet installed: react-router (routing, mentioned in CLAUDE.md as v6)

**Type Support:**
- @types/react 18.3.23 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions
- @types/node 24.12.2 - Node.js type definitions

**Utilities:**
- globals 17.5.0 - Global variable definitions for ESLint

## Configuration

**Environment:**
- Configured via `.env.example` (committed with empty values)
- Secrets stored in `.env.local` (git-ignored)

**Required Environment Variables:**
```
VITE_SUPABASE_URL          # Supabase project URL (safe for Vite prefix)
VITE_SUPABASE_ANON_KEY     # Supabase anonymous/public key (safe for Vite prefix)
```

**Private Environment Variables (not Vite-prefixed):**
- `ANTHROPIC_API_KEY` - Anthropic API for AI features (consumed via `/api/*` serverless only)
- `STRIPE_SECRET_KEY` - Stripe secret key (consumed via `/api/*` serverless only)
- `RESEND_API_KEY` - Resend email API key (consumed via `/api/*` serverless only)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

**Build & Dev Configuration:**
- `vite.config.ts` - Vite build configuration (React plugin, test environment)
- `tsconfig.json` - TypeScript compiler options with references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` - Application-level TypeScript config (not visible in exploration)
- `tsconfig.node.json` - Build/config TypeScript config (not visible in exploration)
- `eslint.config.js` - ESLint flat configuration (browser globals, React hooks/refresh, TypeScript rules)

## Platform Requirements

**Development:**
- Node.js runtime
- npm for package management
- Supabase CLI for local database development (`supabase start`)
- Vercel account (for serverless functions)

**Production:**
- Vercel deployment platform (via `vercel.json`)
- Postgres database (Supabase)
- S3-compatible storage (Supabase Storage)

## Build Scripts

**Available Commands:**
```bash
npm run dev                # Start Vite dev server with hot module replacement
npm run build             # Compile TypeScript + Vite build (tsc -b && vite build)
npm run type-check        # TypeScript type checking without emit (tsc --noEmit)
npm run lint              # Run ESLint on all files
npm run preview           # Preview production build locally
npm run test              # Run Vitest tests once (vitest run)
npm run test:watch        # Run Vitest in watch mode (vitest)
```

**Quality Gates (from CLAUDE.md):**
- All scripts must pass before merge to `main`
- No hardcoded secrets in source
- RLS policies verified on new tables
- Vercel preview tested

## Deployment Configuration

**Vercel Integration:**
- `vercel.json` file present (SPA rewrite + API route configuration)
- Serverless functions route at `/api/*`
- AI endpoints: `/api/ai/draft-estimate`, `/api/ai/analyze-photo`
- Stripe webhook endpoint: `/api/stripe/webhook`
- Next.js-style routing (Vercel serverless)

**Local Supabase:**
- Config: `supabase/config.toml`
- API port: 54321
- DB port: 54322
- Migrations in: `supabase/migrations/` (numbered SQL files)
- Seed data: `supabase/seed.sql`

---

*Stack analysis: 2026-05-02*
