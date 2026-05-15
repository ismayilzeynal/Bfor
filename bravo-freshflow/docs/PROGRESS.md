# Progress Tracker

Last updated: 2026-05-15
Current phase: PHASE_5_RISKY_PRODUCTS_LIST
Status: PENDING

## Phases
- [x] PHASE_0_BOOTSTRAP — Scaffold, tracking files, types, utilities
- [x] PHASE_1_FOUNDATION — Design system, formatters, calculators, mock loader
- [x] PHASE_2_APP_SHELL — Role switcher, sidebar, topbar, command palette
- [x] PHASE_3_EXECUTIVE_DASHBOARD — KPIs, charts, AI feed, sustainability, network health
- [x] PHASE_4_OPERATIONS_DASHBOARD — Priority tiles, value-at-risk, top risky table, lanes, overdue banner, AI approve, heat-map, live pulse
- [ ] PHASE_5_RISKY_PRODUCTS_LIST
- [ ] PHASE_6_PRODUCT_DETAILS — DEMO CENTERPIECE
- [ ] PHASE_7_WHATIF_SIMULATOR
- [ ] PHASE_8_RECOMMENDATIONS
- [ ] PHASE_9_TASKS — manager + employee mobile views
- [ ] PHASE_10_TRANSFERS_DISCOUNTS
- [ ] PHASE_11_ANALYTICS
- [ ] PHASE_12_DATA_QUALITY
- [ ] PHASE_13_NOTIFICATIONS_AUDIT_SETTINGS
- [ ] PHASE_14_POLISH_DEMO

## Notes
- 2026-05-15 — PHASE_0 done. Next.js 14 scaffold, shadcn slate base, all 34 UI components, 19 mock-data JSONs preserved, type system + formatters + risk/scenario calculators + mock-loader + permissions in place, every route has placeholder page.
- 2026-05-15 — PHASE_1 closed. PHASE_0 covered all foundation deliverables (types, constants, utils, formatters, risk/scenario calcs, mock-loader, permissions, globals.css risk vars, all 15 route placeholders). `tsc --noEmit` clean. No gaps to fill.
- 2026-05-15 — PHASE_2 done. 5 Zustand stores (auth/ui/filters/notifications/actions) with persist where applicable. Layout shell rebuilt: `(app)/layout.tsx` mounts AppHydrator + RouteGuard + CommandPalette + DesktopSidebar + Topbar. Sidebar collapsible (persisted) with mobile Sheet variant, nav groups filtered by role, mini user card. Topbar pieces: Breadcrumbs (resolves product IDs to names), DemoBadge (pulsing), Search trigger, DateRangePill, NotificationsPopover (unread badge + tabs + mark-all-read), ThemeToggle (sun/moon/system), RoleSwitcher (grouped popover with search), Avatar dropdown. CommandPalette via cmdk with Pages / Top Risky Products / My Tasks / Quick Actions. Hotkeys ⌘K (palette) and ⌘⇧R (role switcher) via `useKeyboardShortcut`. RouteGuard redirects on disallowed routes with sonner warning. `tsc --noEmit` and `next build` both clean (19 routes).
- 2026-05-15 — PHASE_3 done. Executive dashboard wired to filters-store date range with previous-period comparisons. 5 badges (risk/status/action/priority/confidence). KpiCard with tone variants, optional sparkline, change indicator, info tooltip, skeleton. 6 KPI grid (potential, actual, net saved, AI acceptance, task completion, waste). Loss-trend ComposedChart with Daily/Weekly toggle. Sustainability card (kg saved, ≈ CO₂ avoided, parcel count, mock ESG export). Top risky stores horizontal BarChart → /operations?store=…. Top risky categories donut + legend → /products?category=…. Net-saved waterfall (potential → −discount → −transfer → −operational → net saved). Latest AI Recommendations + Critical Tasks Today feeds. Network Health Banner (avg confidence, open issues, active stores, last sync). Installed `react-is` for recharts v3 peer dep. `tsc --noEmit` clean, `next build` 19 routes (executive 134 kB first-load).
- 2026-05-15 — PHASE_4 done. Operations dashboard for COO / Store Manager. Store selector (popover combobox; locked variant for store_manager/supervisor/employee on own store; "All stores" option for leadership). 4 priority tiles (Urgent Discounts / Pending Transfers / Stock Checks / Shelf Actions) with count, total, progress bar, CTA, deep link to filtered destinations. Value at Risk Today wide card: big tone-colored figure, saved-vs-at-risk progress bar, critical/high mini-stats, live pulse. Top 10 Risky Products Today compact table (sticky, color-coded days-to-expiry chip, action badge, predicted loss, store column hidden when scoped to one store, row → /products/[id]). Task Status Lanes (Pending / In Progress / Completed Today) each with count badge + 3 latest titles + Open link. Overdue Tasks Alert banner: appears only when overdues exist, lists top 3, Handle now CTA. Actionable Now: top 5 critical/high pending recommendations sorted by priority then net saved, inline Approve (AlertDialog with recommendation summary + recovered/cost/net-saved metrics), wires through actions-store + audit-log, sonner toast with "View tasks". Mini Heat-Map: stores × top-5 categories from current scope, 6-step intensity (emerald→amber→orange→rose), each cell shows count + ₼, click → /products?store=X&category=Y, legend. Live-feel: 30s setInterval ticks ±1 jitter on tile counts; LivePulse component shared. useSearchParams wrapped in Suspense to satisfy static prerender. `tsc --noEmit` clean, `next build` 19 routes (operations 14.1 kB / 161 kB first-load).
