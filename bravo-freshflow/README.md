# Bravo FreshFlow AI

An AI-powered retail loss-prevention platform. Detect potential waste before it happens, explain why a SKU is at risk, compare rescue scenarios side-by-side, act with a single approval, and learn from outcomes.

Built as a hackathon demo for the Bravo Retail chain (Azerbaijan).

> **Detect. Explain. Compare. Act. Learn.**

## Live demo

_Hosted demo URL: TBA_

Local: `npm run dev` → http://localhost:3000

## Important — no authentication

The demo is intentionally login-free. **Pick a role from the topbar** (top-right pill) to instantly view the platform from any seat:

| Group | Roles |
|---|---|
| Leadership | CEO · COO · CFO · CIO |
| Management | Category Manager · Purchase Manager · Logistics Manager |
| Store Operations | Store Manager · Supervisor · Employee |

Data scoping (own-store filters), default routes, and allowed sidebar entries adapt automatically.

## Local setup

```bash
git clone <repo>
cd bravo-freshflow
npm install
npm run dev
```

Open http://localhost:3000. The app loads with the **CEO** role on `/executive`.

### Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` | Production build (19 routes) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check without emitting |

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) (slate base)
- **State**: Zustand (per-domain stores, persisted to `localStorage` where appropriate)
- **Tables**: TanStack React Table
- **Charts**: Recharts
- **Animation**: Framer Motion
- **Command palette**: cmdk
- **Toasts**: Sonner
- **Dates**: date-fns

Backend is intentionally a mock layer: 19 JSON files under `public/mock-data/` are loaded at runtime. Approvals, decisions, task lifecycle, transfers, discounts, audit entries, and notification reads all live in Zustand stores and persist locally.

## Project structure

```
src/
  app/                       # Next.js routes (App Router)
    (app)/                   # Authed shell — sidebar + topbar + main content
      executive/             # CEO/COO dashboard
      operations/            # COO/Store Manager
      products/              # Risky Products list + /[id] details (demo centerpiece)
      recommendations/       # AI recommendation triage inbox
      tasks/                 # Manager task views
      my-tasks/              # Employee mobile task list
      transfers/             # Inter-branch transfers
      discounts/             # Markdown queue
      analytics/             # 6-tab deep dive
      data-quality/          # Integrity console (CIO/Admin)
      whatif-lab/            # Sandbox simulator
      notifications/         # Notification inbox
      audit-log/             # Immutable audit table + diff drawer
      settings/              # 8-card settings shell
    error.tsx                # Global error boundary
    not-found.tsx            # Custom 404
  components/                # Layout, cards, charts, badges, tables, modals, common, whatif, settings…
  lib/                       # constants, utils, formatters, risk-calculator, scenario-calculator, demo-scenarios
  store/                     # auth, ui, filters, notifications, actions, whatif
  hooks/                     # use-role, use-keyboard-shortcut, use-permissions
  types/                     # All TS types mirroring the spec data model
public/mock-data/            # 19 JSON files (synthetic)
docs/
  SPEC.md                    # Full product/tech/phase spec
  PROGRESS.md                # Phase tracker
  GIT_WORKFLOW.md            # Commit & push protocol
  DECISIONS.md               # Architectural decisions log
  DEMO_SCRIPT.md             # 5–7 minute walkthrough
```

## Demo scenarios

Four scripted entry points are available from the topbar **Scenarios** dropdown and from Settings → Demo Controls:

1. **🥛 Crisis: Qatıq 500q** — opens `/products/p-demo-yogurt#whatif` with the AI recommendation panel pristine.
2. **☕ Morning approvals queue** — pending high-priority recommendations awaiting review.
3. **👷 Employee shift starts** — switches to an employee and lands on `/my-tasks`.
4. **🏁 End-of-day report** — CEO `/executive` view with elevated saved-value KPIs.

A **30-second onboarding tour** runs automatically on first visit and is replayable from Settings → About → **Replay tour**.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘⇧R` | Role switcher |
| `G → D` | Executive dashboard |
| `G → P` | Risky Products |
| `G → T` | Tasks |
| `G → R` | Recommendations |
| `N` | New task (manager only) |
| `?` | Shortcuts cheat-sheet |
| `Esc` | Close any modal/drawer/tour |

Easter egg: 5 rapid clicks on the brand mark in the sidebar.

## Reset demo state

Settings → **Demo Controls** → **Reset all local state**.
Clears every approval, decision, task override, transfer status, discount adjustment, data-issue resolution, what-if snapshot, saved view, and profile change. Mock JSON reloads from disk on next refresh.

## Team

- **Aysel Məmmədova** — Product · Demo Lead
- **Rəşad Əliyev** — Frontend Engineering
- **Nigar Hüseynova** — Data Modelling
- **Elnur İbrahimov** — UX Design

## License

Hackathon project — not for production use.
