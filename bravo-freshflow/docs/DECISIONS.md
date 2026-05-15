# Architectural Decisions

## Stack
- Framework: Next.js 14 (App Router, src/ directory, TypeScript strict)
- Styling: Tailwind CSS + shadcn/ui (slate base color, CSS variables)
- Charts: Recharts
- State: Zustand (with persist middleware where appropriate)
- Forms: React Hook Form + Zod
- Tables: @tanstack/react-table
- Icons: lucide-react
- Animation: framer-motion
- Date: date-fns (with az locale where dates display in Azerbaijani context)
- Toasts: sonner
- Theme: next-themes (light/dark/system)
- Data: static JSON in `/public/mock-data/`

## Conventions
- File naming: kebab-case
- Components: PascalCase
- Hooks: camelCase, prefixed `use`
- Imports: absolute via `@/`
- Money via `formatAZN` (az-AZ locale, ₼ suffix)
- Dates display as "dd MMM yyyy" by default
- TypeScript types in `src/types/index.ts`
- Mock data loaded via `@/lib/mock-loader` (fetch with cache 'force-cache'); missing files return `[]`

## Auth strategy
No login. Topbar role switcher. 10 demo roles. Routes guarded client-side via `(app)/layout.tsx` RouteGuard island.

## Language rule
- Code / comments / UI chrome (menus, buttons, headers, page titles): English
- Data content (product names, store names, recommendation text, reason text, notifications, task titles/descriptions): Azerbaijani

## Decisions log
- 2026-05-15 — chose to scaffold inside `bravo-freshflow/` (data team produced JSON under `bravo-freshflow/public/mock-data/`). Moved mock-data aside during `create-next-app`, then restored.
- 2026-05-15 — shadcn CLI v3 dropped `--base-color` flag; manually set `baseColor: slate` in `components.json` after `init -d -f`.
