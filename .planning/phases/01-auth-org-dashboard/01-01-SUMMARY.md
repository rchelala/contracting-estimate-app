---
phase: 1
plan: "01"
subsystem: foundation
tags: [dependencies, tailwind, supabase, rpc, vercel, schema]
dependency_graph:
  requires: []
  provides:
    - stage1-schema merged to master (11 migrations, supabase client, money utils, types)
    - Phase 1 npm dependencies installed
    - Tailwind CSS v4 wired via @tailwindcss/vite plugin
    - create_organization SECURITY DEFINER RPC migration (migration 12)
    - vercel.json SPA rewrite
    - supabase/config.toml aligned with Vite port 5173
  affects:
    - All subsequent Phase 1 plans depend on this foundation
tech_stack:
  added:
    - "@supabase/auth-ui-react@0.4.7"
    - "@supabase/auth-ui-shared@0.1.8"
    - "react-router-dom@6.30.3"
    - "zustand@5.0.12"
    - "idb-keyval@6.2.2"
    - "tailwindcss@4.2.4 (dev)"
    - "@tailwindcss/vite@4.2.4 (dev)"
  patterns:
    - Tailwind v4 CSS-first config via @import "tailwindcss" (no tailwind.config.js needed)
    - SECURITY DEFINER RPC pattern for bootstrap operations that bypass RLS intentionally
key_files:
  created:
    - vercel.json
    - supabase/migrations/20260502000012_create_organization_rpc.sql
  modified:
    - package.json (7 new deps)
    - package-lock.json
    - vite.config.ts (added @tailwindcss/vite plugin, server port)
    - src/index.css (replaced with Tailwind v4 entry)
    - src/App.tsx (replaced with minimal smoke screen)
    - supabase/config.toml (site_url + auth callback redirect URLs)
decisions:
  - "Used @tailwindcss/vite plugin (not PostCSS) for Tailwind v4 — zero config required, faster HMR"
  - "create_organization is SECURITY DEFINER to bypass missing INSERT policy on organizations — org name is trimmed and length-checked inside the function, owner bound to auth.uid() (cannot be spoofed)"
  - "vercel.json rewrite pattern /((?!api/).*) preserves /api/* routes for Vercel serverless"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 3
  tasks_total: 4
  files_created: 2
  files_modified: 6
---

# Phase 1 Plan 01: Foundation Summary

Foundation plan that merges Stage 1 data layer, installs all Phase 1 frontend dependencies, wires Tailwind CSS v4 with the Vite plugin, creates the `create_organization` SECURITY DEFINER RPC migration, and aligns Vercel/Supabase config — blocking foundation for every other plan in Phase 1.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Merge stage1-schema into master | bd75fac | 38 files (migrations, types, money utils, supabase client) |
| 2 | Install Phase 1 deps + configure Tailwind v4/Vite/Vercel/Supabase | 5cc842b | package.json, vite.config.ts, src/index.css, src/App.tsx, vercel.json, supabase/config.toml |
| 3 | Add create_organization SECURITY DEFINER migration | 2f66b15 | supabase/migrations/20260502000012_create_organization_rpc.sql |
| 4 | Push schema to Supabase | — | BLOCKED — awaiting human action (see below) |

## Dependency Versions Installed

| Package | Planned | Installed |
|---------|---------|-----------|
| @supabase/auth-ui-react | 0.4.7 | ^0.4.7 |
| @supabase/auth-ui-shared | 0.1.8 | ^0.1.8 |
| react-router-dom | 6.30.3 | ^6.30.3 |
| zustand | 5.0.12 | ^5.0.12 |
| idb-keyval | 6.2.2 | ^6.2.2 |
| tailwindcss | 4.2.4 | ^4.2.4 |
| @tailwindcss/vite | 4.2.4 | ^4.2.4 |

No version drift. All packages installed at exact planned versions.

## npm audit summary

`npm install` completed with 0 vulnerabilities. One deprecation warning noted:
- `node-domexception@1.0.0` — transitive dependency, no action needed (use platform's native DOMException).
- Note: `@supabase/auth-ui-react` is archived upstream but was the planned package; no replacement exists for this version constraint.

## RPC Migration

File: `supabase/migrations/20260502000012_create_organization_rpc.sql`

Key hardening measures implemented per threat model T-01-01 and T-01-02:
- `auth.uid() IS NOT NULL` check rejects anonymous calls with ERRCODE 42501
- `btrim(coalesce(p_name, ''))` normalizes input; length validated 1..120 chars
- Owner row always uses `auth.uid()` — caller cannot supply a different user_id
- `SET search_path = public, pg_temp` prevents search_path injection
- `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated` minimizes exposure

## Schema Push Status

Task 4 (schema push) is blocked — requires `supabase link` to connect to a Supabase project and `SUPABASE_ACCESS_TOKEN` credentials. The local `npx supabase db push` returned "Cannot find project ref. Have you run supabase link?"

This is a human-action gate. Once the user runs `supabase link` and provides credentials, `supabase db push --include-all` will apply all 12 migrations.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1–3. Task 4 is a legitimate blocking human-action checkpoint.

## Known Stubs

- `src/App.tsx` is a temporary smoke screen ("EstimateFlow boot OK") — intentional placeholder per plan. Plan 02 replaces this with the router and auth flow.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. The SECURITY DEFINER RPC (T-01-01, T-01-02) is hardened as designed.

## Self-Check: PARTIAL

Tasks 1–3 verified:
- FOUND: supabase/migrations/20260502000012_create_organization_rpc.sql
- FOUND: vercel.json
- FOUND: commits bd75fac, 5cc842b, 2f66b15
- FOUND: npm run build exits 0
- FOUND: npm run lint exits 0
- FOUND: npm run type-check exits 0

Task 4: BLOCKED — schema push pending human action (supabase link + credentials).
