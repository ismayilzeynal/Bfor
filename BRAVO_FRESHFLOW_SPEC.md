# Bravo FreshFlow AI — Master Specification

> This is the single source of truth for the Bravo FreshFlow AI hackathon project. Claude Code reads this end-to-end before doing any work. Subsequent sessions also read this plus `docs/PROGRESS.md` to continue from the last completed phase.

---

## 0. How Claude Code uses this document

1. **First session** — read this file fully, then execute Phase 0 (Bootstrap) only. Phase 0 will copy this file into `docs/SPEC.md` inside the repo so future sessions can read it without re-attaching.
2. **Every subsequent session** — read `docs/SPEC.md` and `docs/PROGRESS.md` first. Then execute exactly the phase the user requests (or the next pending phase if the user says "continue").
3. **One phase per turn.** Never bundle phases. Update `docs/PROGRESS.md` at the end of each phase. Stop and report.
4. **Use TodoWrite** to break each phase into sub-tasks as you go.
5. **The spec wins.** If the user asks for something that contradicts this spec, ask before deviating.
6. **Language rule** — all code, comments, file names, and UI chrome (menus, buttons, headers, page titles) are in **English**. All data content (product names, store names, person names, recommendation text, reason text, notifications, task titles/descriptions) is in **Azerbaijani**, because Bravo is an Azerbaijani retail chain.
7. **No backend.** Every screen reads from static JSON files in `public/mock-data/`. State mutations live in Zustand and persist to localStorage where appropriate.
8. **No login.** A prominent Role Switcher in the top bar lets anyone instantly become any of 10 demo roles.

---

## 1. Product Context

**Name**: Bravo FreshFlow AI
**Tagline**: Decide before product becomes waste.
**Category**: Retail loss prevention & operational waste intelligence.

**Problem**: At large retail chains like Bravo, products near expiry, slow-moving items, overstocked SKUs, damaged goods, and items poorly distributed between branches turn into waste before they can be sold. Inventory and sales data exist separately; discounts, transfers, shelf re-layouts, and reorder adjustments arrive too late.

**Solution — 5-stage loop**:
1. **Detect** — risk-score every product × store using stock, expiry, sales velocity, waste history, supplier risk.
2. **Explain** — surface the dominant reason in plain language.
3. **Compare** — evaluate 4-6 candidate actions (no_action, discount, transfer, bundle, shelf_visibility, combined) with full financial math.
4. **Act** — convert the best action into a concrete task assigned to a specific person with a deadline.
5. **Learn** — measure outcome (real vs. predicted) and adjust future confidence.

---

## 2. Tech Stack & Conventions

### Stack (non-negotiable)
- **Framework**: Next.js 14 (App Router, src/ directory, TypeScript strict)
- **Styling**: Tailwind CSS + shadcn/ui (slate base color, CSS variables)
- **Charts**: Recharts
- **State**: Zustand (with persist middleware where appropriate)
- **Forms**: React Hook Form + Zod
- **Tables**: @tanstack/react-table
- **Icons**: lucide-react
- **Animation**: framer-motion
- **Date**: date-fns (with az locale where dates display in Azerbaijani context)
- **Toasts**: sonner
- **Theme**: next-themes (light/dark/system)
- **Data**: static JSON in `/public/mock-data/`

### File & code conventions
- File naming: kebab-case
- Components: PascalCase
- Hooks: camelCase, prefixed `use`
- Imports: absolute via `@/`
- Money formatted via `formatAZN` (az-AZ locale, ₼ suffix)
- Dates display as "dd MMM yyyy" by default
- All TypeScript types live in `src/types/index.ts` mirroring section 7
- Mock data loaded via `@/lib/mock-loader` (fetch with cache 'force-cache'); missing files return `[]` instead of throwing

### Color tokens (Tailwind class strings)

Risk:
- Low: `bg-emerald-100 text-emerald-700 border-emerald-200`
- Medium: `bg-amber-100 text-amber-700 border-amber-200`
- High: `bg-orange-100 text-orange-700 border-orange-200`
- Critical: `bg-red-100 text-red-700 border-red-200`

Status:
- Pending: `bg-slate-100 text-slate-700`
- Approved: `bg-blue-100 text-blue-700`
- InProgress: `bg-indigo-100 text-indigo-700`
- Completed: `bg-emerald-100 text-emerald-700`
- Rejected: `bg-rose-100 text-rose-700`
- Expired: `bg-zinc-200 text-zinc-600`

### Layout tokens
- Page padding: `p-6 md:p-8`
- Card padding: `p-5`
- Section gap: `space-y-6`
- Grid gap: `gap-4 md:gap-6`
- Max content width: `max-w-screen-2xl mx-auto`

### Typography
- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-medium`
- KPI value: `text-3xl font-bold tabular-nums`
- KPI label: `text-sm text-muted-foreground`
- Body: `text-sm`

### Folder structure (target)

```
src/
  app/
    layout.tsx                   # ThemeProvider, fonts, Sonner toaster
    page.tsx                     # redirect to /executive
    globals.css
    (app)/
      layout.tsx                 # app shell: sidebar + topbar + route guard
      executive/page.tsx
      operations/page.tsx
      products/page.tsx          # risky products list
      products/[id]/page.tsx     # product details
      recommendations/page.tsx
      tasks/page.tsx             # manager view
      my-tasks/page.tsx          # employee mobile view
      transfers/page.tsx
      discounts/page.tsx
      analytics/page.tsx
      data-quality/page.tsx
      whatif-lab/page.tsx
      notifications/page.tsx
      audit-log/page.tsx
      settings/page.tsx
  components/
    ui/                          # shadcn primitives
    layout/                      # Sidebar, Topbar, Breadcrumbs, RoleSwitcher, ThemeToggle,
                                 #   CommandPalette, NotificationsPopover, Brand
    cards/                       # KpiCard, ProductCard, StoreRiskCard, RecommendationCard,
                                 #   ScenarioCard, SustainabilityCard
    badges/                      # RiskBadge, StatusBadge, ActionBadge, PriorityBadge, ConfidenceBadge
    charts/                      # LossTrendChart, StoreRiskBar, CategoryDonut, NetSavedWaterfall,
                                 #   ExpiryTimeline, RiskRadial, SalesTrendChart, InventoryTrendChart
    tables/                      # RiskyProductsTable, TasksTable, etc.
    modals/                      # ApproveDialog, RejectSheet, BulkActionModal, etc.
    common/                      # PageHeader, EmptyState, ErrorState, LoadingSkeleton, ConfirmDialog
    whatif/                      # WhatIfSimulator
  lib/
    utils.ts                     # cn()
    formatters.ts                # money, date, percent
    constants.ts                 # all enums + label maps + route maps
    mock-loader.ts               # fetch JSON
    risk-calculator.ts           # risk formula (pure)
    scenario-calculator.ts       # what-if math (pure)
    permissions.ts               # role helpers
    demo-scenarios.ts            # scripted state snapshots (Phase 14)
  store/
    auth-store.ts                # currentUser, switchRole (persisted)
    filters-store.ts             # global filters (persisted)
    notifications-store.ts       # in-memory notifications
    actions-store.ts             # pending approvals + applied actions (mock state updates)
    ui-store.ts                  # sidebar collapsed, onboarding seen
  types/
    index.ts                     # All TS types mirroring section 7
  hooks/
    use-mock-data.ts
    use-role.ts
    use-permissions.ts
    use-keyboard-shortcut.ts
public/
  mock-data/                     # 19 JSON files (data team produces)
docs/
  SPEC.md                        # this file (copied here in Phase 0)
  PROGRESS.md                    # phase tracker
  DECISIONS.md                   # architectural decisions log
  DEMO_SCRIPT.md                 # written in Phase 14
```

---

## 3. Auth & Roles (no login)

There is no login page. On first load, the app lands directly on the default route for the currently selected role (default: CEO). A prominent Role Switcher in the top bar instantly switches roles.

### Roles and access

| Role | Default route | Allowed routes |
|---|---|---|
| ceo | `/executive` | all |
| coo | `/executive` | all |
| cfo | `/analytics` | all |
| cio | `/data-quality` | all |
| category_manager | `/products` | `/products`, `/products/[id]`, `/recommendations`, `/whatif-lab`, `/analytics`, `/notifications`, `/audit-log`, `/settings` |
| purchase_manager | `/recommendations` | `/recommendations`, `/analytics`, `/notifications`, `/audit-log`, `/settings` |
| logistics_manager | `/transfers` | `/transfers`, `/tasks`, `/notifications`, `/audit-log`, `/settings` |
| store_manager | `/operations` | `/operations`, `/products`, `/products/[id]`, `/recommendations`, `/tasks`, `/transfers`, `/discounts`, `/notifications`, `/settings` (data filtered to own store) |
| supervisor | `/tasks` | `/operations`, `/tasks`, `/my-tasks`, `/notifications`, `/settings` (data filtered to own store) |
| employee | `/my-tasks` | `/my-tasks`, `/notifications`, `/settings` |

### Role Switcher behavior
- Pill button in top bar showing current user avatar + name + role label + chevron.
- Click → wide Popover with search and grouped list:
  - Leadership: CEO, COO, CFO, CIO
  - Management: Category Manager, Purchase Manager, Logistics Manager
  - Store Operations: Store Manager (Bravo Nərimanov), Store Manager (Bravo Gənclik), Supervisor, Employee
- Each row shows avatar + name + role badge + small route preview.
- On select: update auth-store, sonner toast, navigate to that role's default route, close popover.
- Keyboard: ⌘⇧R opens role switcher.
- Persistent "DEMO" pulsing badge next to brand makes context clear.

### Route guard
The `(app)/layout.tsx` includes a client island that, on path change, verifies the current pathname is in the role's allowed routes. If not, redirects to the role's default route with a sonner warning.

---

## 4. Risk Score Formula

`days_to_expiry` → **expiry_score**:
- ≤ 1 day: 100
- ≤ 2 days: 85
- ≤ 3 days: 70
- ≤ 5 days: 50
- > 5 days: 20

`unsold_ratio = predicted_unsold_quantity / current_stock` → **stock_pressure_score**:
- ≤ 0: 0
- 0.0–0.2: 30
- 0.21–0.4: 55
- 0.41–0.6: 75
- > 0.6: 95

`sales_trend` → **sales_velocity_score**:
- rising: 20
- stable: 40
- declining: 75
- very_weak: 90

`waste_history` → **waste_history_score**:
- none: 10
- low: 35
- medium: 60
- high: 85

`supplier_risk_score`: 0–100 (read directly from supplier object)

**Final**:
```
risk_score = expiry_score * 0.35
           + stock_pressure_score * 0.30
           + sales_velocity_score * 0.20
           + waste_history_score * 0.10
           + supplier_risk_score * 0.05
```

**Risk level mapping**:
- 0–30: low
- 31–60: medium
- 61–80: high
- 81–100: critical

---

## 5. What-If Scenario Math

All scenarios return `{ expected_sold, recovered_value, discount_cost, transfer_cost, operational_cost, net_saved, confidence_score }`. `net_saved` is the DELTA vs. doing nothing (so "no_action" always has net_saved = 0; positive values represent rescue).

### no_action (baseline)
```
expected_sold       = avg_daily_sales * days_to_expiry
expected_unsold     = max(0, current_stock - expected_sold)
expected_loss       = expected_unsold * cost_price
recovered_value     = expected_sold * sale_price
net_saved           = 0
```

### discount (input: discount_pct)
Uplift multiplier by discount_pct:
- 10% → 1.3
- 15% → 1.6
- 20% → 1.9
- 25% → 2.1
- 30% → 2.4
- 40% → 2.8
- 50% → 3.2

```
effective_velocity   = avg_daily_sales * uplift_multiplier
expected_sold        = min(current_stock, effective_velocity * days_to_expiry)
discounted_price     = sale_price * (1 - discount_pct)
gross_revenue        = expected_sold * discounted_price
discount_cost        = expected_sold * sale_price * discount_pct
operational_cost     = 2.0 * (expected_sold / 100)
baseline_revenue     = (avg_daily_sales * days_to_expiry) * sale_price
net_saved            = (gross_revenue - discount_cost - operational_cost) - baseline_revenue
```

Margin guard: if `(discounted_price - cost_price) / discounted_price < minimum_margin_pct`, mark the scenario `margin_breached: true`.

### transfer (input: transfer_qty, target_store_id)
```
target_velocity         = target_store_avg_daily_sales
expected_sold_at_target = min(transfer_qty, target_velocity * days_to_expiry)
gross_revenue           = expected_sold_at_target * sale_price
transfer_cost           = 8.0 + 0.05 * transfer_qty
operational_cost        = 3.0
baseline_revenue_local  = min(transfer_qty, avg_daily_sales * days_to_expiry) * sale_price
net_saved               = (gross_revenue - transfer_cost - operational_cost) - baseline_revenue_local
```

Disable transfer if `days_to_expiry <= 1` or `transfer_cost > gross_revenue`.

### bundle (input: bundle_discount_pct ~ 10%)
Similar to discount with `uplift_multiplier = 1.4`, lower discount_cost (only on bundled portion).

### shelf_visibility (no inputs)
```
uplift_multiplier   = 1.2
expected_sold       = min(current_stock, avg_daily_sales * 1.2 * days_to_expiry)
gross_revenue       = expected_sold * sale_price
operational_cost    = 1.0
baseline_revenue    = (avg_daily_sales * days_to_expiry) * sale_price
net_saved           = (gross_revenue - operational_cost) - baseline_revenue
```

### combined (discount + transfer)
Split current_stock: transfer_qty units go to the target store; the remainder gets the local discount. Sum recovered, sum costs, sum net_saved.

### confidence_score
```
confidence_score = 0.6 * data_confidence + 0.4 * historical_action_success_rate
```
Mock `historical_action_success_rate` as 70–95 per action type.

---

## 6. Recommendation Engine Decision Rules

| Condition | Recommendation |
|---|---|
| data_confidence < 50 | stock_check |
| risk_score < 30 | no_action or monitor |
| days_to_expiry ≤ 1 | urgent_discount or bundle (NO transfer) |
| transfer_cost > gross_revenue | exclude transfer |
| discount breaks minimum_margin | reduce discount or switch to bundle/shelf |
| stock high + sales = 0 + good confidence | shelf_visibility |
| persistent overstock + waste_history ≥ medium | reorder_reduce |
| supplier delivers consistently near-expiry | supplier_review |

### Approval hierarchy

| Action | Approver |
|---|---|
| shelf_visibility, stock_check | none (auto) |
| discount ≤ 10% | store_manager |
| discount > 10% | category_manager |
| transfer | store_manager + logistics_manager |
| reorder_change | purchase_manager |
| supplier_review | category_manager + purchase_manager |

---

## 7. Data Contracts (full schemas)

All entities have a string `id` (e.g., "u-001"). Dates are ISO 8601. Money is a plain number in AZN.

### users.json
```typescript
interface User {
  id: string;
  full_name: string;        // Azerbaijani
  email: string;
  role: "ceo" | "coo" | "cfo" | "cio" | "category_manager" | "purchase_manager" |
        "logistics_manager" | "store_manager" | "supervisor" | "employee";
  store_id: string | null;
  department: string;
  avatar_url: string | null;
  is_active: boolean;
}
```

### stores.json
```typescript
interface Store {
  id: string;
  name: string;              // "Bravo Nərimanov"
  code: string;              // "BR-NRM"
  address: string;
  region: string;
  latitude: number;
  longitude: number;
  store_type: "hypermarket" | "supermarket" | "express";
  size_sqm: number;
  avg_daily_customers: number;
  is_active: boolean;
}
```

### categories.json
```typescript
interface Category {
  id: string;
  name: string;              // Azerbaijani
  parent_category_id: string | null;
  risk_weight: number;       // 0..1
  is_perishable_category: boolean;
  icon: string;              // lucide icon name
}
```

### suppliers.json
```typescript
interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  return_policy: "full" | "partial" | "none";
  avg_delivery_days: number;
  damage_rate_pct: number;
  expiry_issue_rate_pct: number;
  on_time_delivery_pct: number;
  supplier_risk_score: number;  // 0..100
  is_active: boolean;
}
```

### products.json
```typescript
interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;              // Azerbaijani
  category_id: string;
  supplier_id: string;
  brand: string;
  unit: "piece" | "kg" | "liter" | "pack";
  shelf_life_days: number;
  storage_type: "ambient" | "chilled" | "frozen";
  cost_price: number;
  sale_price: number;
  minimum_margin_pct: number;
  is_perishable: boolean;
  image_url: string | null;
  is_active: boolean;
}
```

### inventory-batches.json
```typescript
interface InventoryBatch {
  id: string;
  product_id: string;
  store_id: string;
  supplier_id: string;
  batch_code: string;
  received_date: string;
  expiry_date: string;
  received_quantity: number;
  remaining_quantity: number;
  cost_price: number;
  status: "active" | "depleted" | "expired" | "returned";
}
```

### inventory-snapshots.json (latest per product × store)
```typescript
interface InventorySnapshot {
  id: string;
  product_id: string;
  store_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  snapshot_datetime: string;
  source_system: "pos" | "erp" | "manual";
  confidence_score: number;  // 0..100
}
```

### sales.json (daily aggregates, last 30 days)
```typescript
interface SalesAggregate {
  id: string;
  product_id: string;
  store_id: string;
  date: string;              // YYYY-MM-DD
  quantity_sold: number;
  avg_unit_price: number;
  total_amount: number;
  transactions_count: number;
}
```

### waste-records.json
```typescript
interface WasteRecord {
  id: string;
  product_id: string;
  store_id: string;
  batch_id: string;
  quantity: number;
  reason: "expired" | "damaged" | "spoiled" | "shrinkage" | "supplier_return" | "other";
  value: number;
  recorded_by_user_id: string;
  recorded_at: string;
  note: string;
}
```

### risk-predictions.json
```typescript
interface RiskPrediction {
  id: string;
  product_id: string;
  store_id: string;
  batch_id: string | null;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  predicted_unsold_quantity: number;
  predicted_loss_value: number;
  main_reason: string;       // Azerbaijani human-readable
  reason_factors: {
    expiry_score: number;
    stock_pressure_score: number;
    sales_velocity_score: number;
    waste_history_score: number;
    supplier_risk_score: number;
  };
  data_confidence_score: number;
  days_to_expiry: number;
  current_stock: number;
  avg_daily_sales_7d: number;
  sales_trend: "rising" | "stable" | "declining" | "very_weak";
  created_at: string;
}
```

### recommendations.json
```typescript
interface Recommendation {
  id: string;
  risk_prediction_id: string;
  product_id: string;
  store_id: string;
  recommendation_type:
    | "no_action" | "monitor" | "stock_check" | "shelf_visibility"
    | "discount" | "transfer" | "bundle" | "reorder_reduce"
    | "reorder_increase" | "supplier_review" | "return_to_supplier" | "campaign_add";
  recommendation_text: string;    // Azerbaijani
  reason_text: string;             // Azerbaijani
  expected_recovered_value: number;
  expected_cost: number;
  net_saved_value: number;
  confidence_score: number;
  priority: "low" | "medium" | "high" | "critical";
  status: "generated" | "pending_approval" | "approved" | "rejected"
        | "converted_to_task" | "completed" | "expired" | "failed";
  requires_approval_by_role:
    "store_manager" | "category_manager" | "logistics_manager" | "purchase_manager" | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}
```

### recommendation-scenarios.json
```typescript
interface RecommendationScenario {
  id: string;
  recommendation_id: string;
  scenario_type: "no_action" | "discount" | "transfer" | "bundle" | "shelf_visibility" | "combined";
  parameters: Record<string, unknown>;
  expected_sold_quantity: number;
  expected_recovered_value: number;
  discount_cost: number;
  transfer_cost: number;
  operational_cost: number;
  net_saved_value: number;
  confidence_score: number;
  is_recommended: boolean;
}
```

### tasks.json
```typescript
interface Task {
  id: string;
  recommendation_id: string;
  assigned_to_user_id: string;
  store_id: string;
  product_id: string;
  title: string;             // Azerbaijani
  description: string;        // Azerbaijani
  task_type: "apply_discount" | "prepare_transfer" | "stock_check" | "shelf_action"
           | "create_bundle" | "record_waste" | "supplier_followup";
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "assigned" | "in_progress" | "completed" | "rejected" | "expired" | "cancelled";
  deadline: string;
  completed_at: string | null;
  completed_by_user_id: string | null;
  completion_note: string | null;
  proof_image_url: string | null;
  created_at: string;
}
```

### transfers.json
```typescript
interface Transfer {
  id: string;
  recommendation_id: string;
  product_id: string;
  from_store_id: string;
  to_store_id: string;
  quantity: number;
  transfer_cost: number;
  expected_sales_value: number;
  net_saved_value: number;
  status: "suggested" | "approved" | "preparing" | "in_transit" | "received"
        | "completed" | "cancelled" | "failed";
  created_at: string;
  completed_at: string | null;
}
```

### discounts.json
```typescript
interface Discount {
  id: string;
  recommendation_id: string;
  product_id: string;
  store_id: string;
  discount_pct: number;            // 0.2 for 20%
  start_datetime: string;
  end_datetime: string;
  expected_sales_uplift_pct: number;
  minimum_margin_checked: boolean;
  current_margin_after_discount_pct: number;
  status: "suggested" | "approved" | "active" | "completed" | "rejected" | "expired";
}
```

### audit-logs.json
```typescript
interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: "recommendation" | "task" | "transfer" | "discount" | "product" | "data_issue";
  entity_id: string;
  old_value: unknown | null;
  new_value: unknown | null;
  created_at: string;
  ip_address: string;
}
```

### data-quality-issues.json
```typescript
interface DataQualityIssue {
  id: string;
  issue_type: "missing_expiry" | "stock_mismatch" | "stale_inventory"
            | "no_sales_high_stock" | "inconsistent_batch" | "low_confidence_recommendation";
  severity: "low" | "medium" | "high";
  product_id: string | null;
  store_id: string | null;
  batch_id: string | null;
  description: string;        // Azerbaijani
  status: "open" | "investigating" | "resolved" | "ignored";
  created_at: string;
  resolved_at: string | null;
}
```

### notifications.json
```typescript
interface Notification {
  id: string;
  user_id: string;
  type: "critical_risk" | "approval_needed" | "task_assigned" | "task_deadline_approaching"
      | "task_expired" | "transfer_pending" | "stock_mismatch" | "low_data_confidence"
      | "supplier_issue" | "result_ready";
  priority: "low" | "medium" | "high" | "critical";
  title: string;              // Azerbaijani
  message: string;             // Azerbaijani
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}
```

### kpi-snapshots.json (daily aggregates)
```typescript
interface KpiSnapshot {
  id: string;
  date: string;
  store_id: string | null;     // null = network-wide
  category_id: string | null;
  potential_loss: number;
  actual_loss: number;
  recovered_value: number;
  net_saved_value: number;
  waste_kg: number;
  recommendations_generated: number;
  recommendations_accepted: number;
  recommendations_rejected: number;
  tasks_created: number;
  tasks_completed: number;
  tasks_expired: number;
  transfers_completed: number;
  discounts_applied: number;
  avg_data_confidence: number;
  avg_stock_accuracy_pct: number;
}
```

---

## 8. Demo Spotlight Products

These five products are the on-stage heroes. They must exist in the dataset with the exact specs below and have matching risk_predictions + recommendations + scenarios.

### Today's date for all calculations: **2026-05-15**

### 1. Qatıq 500q (the DEMO STAR)
- `product_id`: "p-demo-yogurt"
- store: Bravo Nərimanov (s-001)
- current_stock: 120
- expiry_date: 2026-05-18 (3 days out)
- avg_daily_sales_7d: 22
- sales_trend: declining
- cost_price: 1.20, sale_price: 1.80
- minimum_margin_pct: 0.15
- risk_score: 82 (high)
- main_reason (Az): "Stok satış sürətindən 5x yüksəkdir və son istifadə tarixinə 3 gün qalıb. Eyni məhsul Bravo Gənclik filialında daha sürətli satılır."
- AI recommendation: combined (20% discount + 30 unit transfer to Bravo Gənclik s-002)
- Scenarios (target values):
  - no_action: net_saved ≈ 0
  - discount_20: net_saved ≈ 34
  - transfer_30: net_saved ≈ 29.80
  - combined: net_saved ≈ 48 (**is_recommended = true**)
  - shelf_visibility: net_saved ≈ 12

### 2. Toyuq Filesi
- store: Bravo 28 May (s-003)
- current_stock: 45, expiry: 2026-05-16 (1 day)
- avg_daily_sales_7d: 12, sales_trend: stable
- cost_price: 5.50, sale_price: 8.00
- risk: 94 (critical)
- AI: urgent 30% discount (no transfer — expiry too close)

### 3. Banan
- store: Bravo Yasamal (s-005)
- current_stock: 90 kg, expiry: 2026-05-17 (2 days)
- avg_daily_sales: 28 kg
- cost: 0.85, sale: 1.40
- risk: 76 (high)
- AI: bundle (with kiwi or yoghurt) + shelf visibility

### 4. Hazır Salat
- store: Bravo Gənclik (s-002)
- current_stock: 60, expiry: 2026-05-16 (1 day)
- avg_sales: 18, cost: 2.10, sale: 3.50
- risk: 91 (critical)
- AI: immediate 25% discount

### 5. Süd 1L
- store: Bravo Elmlər (s-004)
- current_stock: 200, expiry: 2026-05-19 (4 days)
- avg_sales: 35, cost: 1.00, sale: 1.50
- risk: 68 (high)
- AI: transfer 80 units to Bravo Sumqayıt (s-007) + reorder reduction

### Other essentials
**Stores (8 exactly)**:
| id | name | code | region |
|---|---|---|---|
| s-001 | Bravo Nərimanov | BR-NRM | Bakı |
| s-002 | Bravo Gənclik | BR-GNC | Bakı |
| s-003 | Bravo 28 May | BR-28M | Bakı |
| s-004 | Bravo Elmlər | BR-ELM | Bakı |
| s-005 | Bravo Yasamal | BR-YSM | Bakı |
| s-006 | Bravo Xətai | BR-XTI | Bakı |
| s-007 | Bravo Sumqayıt | BR-SMG | Sumqayıt |
| s-008 | Bravo Əhmədli | BR-AHM | Bakı |

**Categories**: Süd məhsulları, Ət və toyuq, Meyvə-tərəvəz, Çörək və un məmulatları, Hazır yeməklər, Dondurulmuş məhsullar, İçkilər, Qənnadı məhsulları, Tərəvəz konservləri. First six are perishable.

**Users (10–12)** with Azerbaijani names: Aysel, Rəşad, Nigar, Elnur, Lalə, Rüfət, Səbinə, Vüqar, Türkan, Rəhim, Kamran, Ülviyyə. One per role; the employee user lives at s-001.

---

## 9. Tracking Files (templates)

### docs/PROGRESS.md
```markdown
# Progress Tracker

Last updated: [date]
Current phase: PHASE_1_FOUNDATION
Status: IN_PROGRESS

## Phases
- [x] PHASE_0_BOOTSTRAP — Scaffold, tracking files, types, utilities
- [ ] PHASE_1_FOUNDATION — Design system, formatters, calculators, mock loader
- [ ] PHASE_2_APP_SHELL — Role switcher, sidebar, topbar, command palette
- [ ] PHASE_3_EXECUTIVE_DASHBOARD
- [ ] PHASE_4_OPERATIONS_DASHBOARD
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
[Append a short note after each completed phase]
```

### docs/DECISIONS.md
```markdown
# Architectural Decisions

## Stack
[copy from section 2 of SPEC.md]

## Conventions
[copy from section 2]

## Auth strategy
No login; topbar role switcher; 10 demo roles; routes guarded client-side.

## Decisions log
[append as we go]
```

---

## 10. Phase Plan

Every phase below lists: **goal**, **deliverables** (files + behaviors), and **acceptance criteria**.

---

### PHASE 0 — BOOTSTRAP

**Goal**: project scaffolded, tracking files in place, type system + foundational utilities ready.

**Deliverables**:
1. Run `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm`
2. Initialize shadcn/ui (default style, slate base color, CSS variables yes).
3. Install: `recharts zustand date-fns clsx class-variance-authority tailwind-merge react-hook-form zod sonner @tanstack/react-table framer-motion next-themes lucide-react`. Dev: `@types/node`.
4. Add shadcn components in one batch: `button card badge table dialog sheet dropdown-menu select input label tabs tooltip popover command separator scroll-area skeleton switch toggle toggle-group slider progress alert alert-dialog avatar breadcrumb calendar checkbox radio-group textarea accordion hover-card sonner`.
5. Create folder structure from section 2.
6. **Copy this SPEC into `docs/SPEC.md`** so future sessions can read it without re-attaching.
7. Create `docs/PROGRESS.md` and `docs/DECISIONS.md` from the templates in section 9.
8. Write `src/types/index.ts` — every interface from section 7 as a strict TS interface (no `any`); also export the union types (`Role`, `RiskLevel`, etc.).
9. Write `src/lib/constants.ts` exporting every enum, label map (English UI labels), color-class map, `ROLE_DEFAULT_ROUTES`, `ROLE_ALLOWED_ROUTES`, and `NAV_GROUPS` (sidebar structure with role visibility).
10. Write `src/lib/utils.ts` — `cn()` using clsx + tailwind-merge.
11. Write `src/lib/formatters.ts`: `formatAZN`, `formatNumber`, `formatPercent`, `formatDate`, `formatDateTime`, `formatRelative`, `daysUntil`, `formatDaysToExpiry`, `truncate`.
12. Write `src/lib/risk-calculator.ts` implementing the formula from section 4 as a pure function with sub-functions per factor.
13. Write `src/lib/scenario-calculator.ts` implementing all 6 scenarios from section 5 as pure functions.
14. Write `src/lib/mock-loader.ts` with `loadMockData<T>(filename)` and typed helpers (`loadProducts`, `loadStores`, etc.). Missing files → return `[]`.
15. Write `src/lib/permissions.ts` with `canAccessRoute`, `filterByStoreScope`, etc.
16. Write `src/app/globals.css` with Tailwind base + shadcn vars + CSS variables for risk tokens (--risk-low, --risk-medium, --risk-high, --risk-critical) + `.tabular-nums`.
17. Write `src/app/layout.tsx` — HTML lang="en", Inter font, ThemeProvider, Sonner toaster.
18. Write `src/app/page.tsx` — server-side redirect to `/executive`.
19. Create placeholder `page.tsx` for every route under `(app)/`, each rendering `<PageHeader title="..." />` + an Alert "This page is built in PHASE_N".
20. Create `(app)/layout.tsx` as a minimal shell for now (full sidebar/topbar in PHASE 2).

**Acceptance criteria**:
- `npm run dev` starts without errors.
- `/` redirects to `/executive` which shows an Alert.
- TypeScript compiles (`tsc --noEmit`).
- `docs/SPEC.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md` exist.
- `PROGRESS.md` shows PHASE_0 as `[x]` and Current phase set to PHASE_1_FOUNDATION.

After completion: report a short summary and **stop**. Wait for user to ask for next phase.

---

### PHASE 1 — FOUNDATION (only if anything from PHASE 0 step 8-19 was skipped)

**Goal**: complete any foundation gaps. If PHASE 0 was fully done, mark PHASE_1 as `[x]` immediately and tell the user to move to PHASE 2.

**Deliverables (only if missing)**:
- Any formatter / calculator function not yet present
- Any constants map missing
- Any placeholder page missing
- Custom risk CSS variables in globals.css

**Acceptance criteria**:
- Every utility from section 2's stack is importable
- No type errors

---

### PHASE 2 — APP SHELL & ROLE SWITCHER

**Goal**: working app shell with role switcher (no login).

**Deliverables**:

1. `src/store/auth-store.ts` — Zustand store with persist (key: "bravo-auth"). Holds `currentUser: User` (never null; defaults to CEO on first load by reading `users.json`). Methods: `switchRole(userId)`.
2. `src/store/ui-store.ts` — sidebar collapsed state, onboarding seen flag.
3. `src/store/filters-store.ts` — global filters (date range, store, category) with persist.
4. `src/store/notifications-store.ts` — in-memory; hydrates from `notifications.json` filtered by current user.
5. `src/store/actions-store.ts` — pending approvals & recently-applied actions (mock writes).
6. `src/app/(app)/layout.tsx` — server-component shell: grid (sidebar + main), embeds Topbar, includes a client `<RouteGuard>` island that redirects to default route if current path not in `currentUser.allowedRoutes`.
7. `src/components/layout/brand.tsx` — wordmark; variants full / icon-only.
8. `src/components/layout/sidebar.tsx`:
   - Collapsible (persisted)
   - Brand at top
   - Nav groups (Overview / Loss Prevention / Action Queue / Insights / System) filtered by role
   - Active route highlight; mobile becomes Sheet
   - Bottom: mini user card with avatar + role label + small "⌘K" hint
9. `src/components/layout/topbar.tsx`:
   - Left: hamburger (mobile), Breadcrumbs
   - Right: Search trigger pill ("Search... ⌘K") → opens Command Palette; Date range picker; Notifications bell; Theme toggle; **Role Switcher (most prominent)**; Avatar dropdown
10. `src/components/layout/role-switcher.tsx` — exactly as described in section 3. Keyboard shortcut ⌘⇧R.
11. `src/components/layout/breadcrumbs.tsx` — parses pathname; detail routes resolve to entity names (e.g., product name).
12. `src/components/layout/command-palette.tsx` — cmdk; sections: Pages, Risky Products (top 5 by risk score), My Tasks, Quick Actions.
13. `src/components/layout/notifications-popover.tsx` — Popover with unread count; tabs All / Unread; click navigates to entity.
14. `src/components/layout/theme-toggle.tsx` — sun/moon dropdown.
15. `src/components/common/page-header.tsx` — `title`, `description?`, `actions?`, `breadcrumb?` slots.
16. Add a small pulsing "DEMO" badge next to the brand in the topbar (z-50).

**Acceptance criteria**:
- App opens on `/executive` as CEO by default.
- Role Switcher dropdown lists 10 demo users grouped (Leadership / Management / Store Operations).
- Switching to "Employee" navigates to `/my-tasks` and shrinks sidebar to allowed items only.
- ⌘K opens the command palette; ⌘⇧R opens role switcher; Esc closes either.
- Theme toggle switches light/dark.
- Mobile (≤ 768px) shows hamburger and sheet sidebar.
- Notifications bell shows unread badge and lists last 10.

---

### PHASE 3 — EXECUTIVE DASHBOARD (`/executive`)

**Goal**: hero dashboard for CEO/COO/CFO with KPIs, trends, AI feed.

**Deliverables**:

**Shared components**:
- `cards/kpi-card.tsx` — props: label, value, unit?, change? `{value, direction, isGood}`, trend? (sparkline), icon?, tooltip?, onClick?, loading?, tone? `default|primary|success|warning|danger`. Layout: label + info tooltip + icon top-right; huge value tabular-nums; change badge + sparkline in footer.
- `badges/risk-badge.tsx`, `status-badge.tsx`, `action-badge.tsx`, `priority-badge.tsx`, `confidence-badge.tsx`

**Page layout** (`src/app/(app)/executive/page.tsx`):

**Section 1 — Header**: title "Executive Dashboard", description, right slot = Period pill + Export PDF (mock toast).

**Section 2 — KPI grid (6 cards)** computed from `kpi-snapshots.json` over selected period:
1. Potential Loss (danger tone)
2. Actual Loss (danger)
3. Net Saved Value (success, brand color)
4. AI Acceptance Rate
5. Task Completion Rate
6. Waste Reduction (% change vs prior period)

Each card clickable → relevant analytics drill-down.

**Section 3 — 2-column row**:
- **Left (col-span-2)**: Loss Trend Chart — Recharts ComposedChart; bars: potential (gray) + actual (rose); line: net_saved (brand blue). Toggle Daily/Weekly.
- **Right (col-span-1)**: Sustainability Card — leaf icon; kg saved, ≈ kg CO₂ avoided, donated parcels mock; "Download ESG report" CTA.

**Section 4 — 3-column row**:
- Top Risky Stores — horizontal bar chart of top 5 stores by sum(predicted_loss_value); click → `/operations?store=<id>`.
- Top Risky Categories — donut, top 5 categories; click slice → `/products?category=<id>`.
- Net Saved Value Waterfall — Potential Loss → −Discount → −Transfer → −Operational → = Net Saved.

**Section 5 — 2-column feeds**:
- Latest AI Recommendations (5 most recent pending) — each row: thumbnail, name, store, action badge, net saved chip, View button.
- Critical Tasks Today (5 due today, critical priority) — each row: title, assignee avatar, countdown.

**Section 6 — Network Health Banner**: avg Data Confidence pill, Open Data Issues, Active Stores 8/8, Last Sync mock.

**Acceptance criteria**:
- All 6 KPIs populate from mock data.
- All charts use ResponsiveContainer and animate on mount.
- Date range from filters-store flows through.
- Loading skeletons render for slow data.
- Empty states for charts with no data.
- Mobile: KPIs stack 2-per-row, charts stack vertically.

---

### PHASE 4 — OPERATIONS DASHBOARD (`/operations`)

**Goal**: today-focused operational view for Store Manager / COO.

**Deliverables**:

**Section 1 — Header**: "Operations Dashboard"; right = Store selector (COO sees all stores; Store Manager locked to own).

**Section 2 — Priority Tiles (4 large cards)**:
1. Urgent Discounts (count of pending discount recommendations, priority high+)
2. Pending Transfers (suggested + approved + preparing)
3. Stock Checks Required
4. Shelf Actions

Each tile: count, micro-progress, CTA, deep link.

**Section 3 — "Value at risk today"** wide card: big number left, progress bar middle (saved vs at-risk), mini-stats right.

**Section 4 — Top 10 Risky Products today** compact table; "Only my store" toggle for COO; "View all" → `/products`.

**Section 5 — Task Status Overview** 3 lanes: Pending, In Progress, Completed Today; each with count + 3 latest titles.

**Section 6 — Overdue Tasks Alert** conditional destructive banner if any tasks past deadline; lists offenders; "Handle now" button.

**Section 7 — "Actionable Now" AI Suggestions** — 5 high-priority pending recommendations; each row has inline [Approve] (AlertDialog → mock state update + sonner toast) and [View].

**Section 8 — Mini Heat-Map** store × top-5-categories grid colored by intensity; click cell → `/products?store=X&category=Y`.

**Section 9 — Live-feel pseudo-refresh** — setInterval(30s) tweaks counts by ±1; pulse "Live" dot.

**Acceptance criteria**:
- Store Manager sees only own store; COO/Supervisor see all (filtered by selector).
- Inline approve flow updates the AI suggestions list immediately.
- Overdue banner appears only when applicable.

---

### PHASE 5 — RISKY PRODUCTS LIST (`/products`)

**Goal**: power-user dashboard with 3 views and rich filtering.

**Deliverables**:

**Header**: title; right = Export CSV (current filtered rows → CSV blob download), Bulk approve (disabled until selection), View toggle (Table / Grid / Heatmap).

**Filters toolbar** (sticky, URL-synced): Search, Risk Level chips, Store multi-select, Category multi-select, Supplier multi-select, Action type multi-select, Status multi-select, Expiry date range, Risk score slider, Confidence slider. Footer: active filter count + Clear all + Saved Views dropdown (prebuilt: All Critical / Expiring Today / Dairy / My Store; plus user-saved via filters-store).

**TABLE view** (`components/tables/risky-products-table.tsx`) using @tanstack/react-table:
- Columns: checkbox, Product (thumb+name+SKU), Store (code+name), Category, Stock, Days to Expiry (color-coded badge + date), Avg Daily Sales 7d, Risk Score (number + tiny bar), Risk Level, Recommended Action, Net Saved (potential), Confidence, Status, Actions (kebab: View details / Approve / Reject / Create manual task / Audit log).
- Sticky header; sticky first two columns; row click opens preview drawer (right Sheet); pagination 25/50/100/200; row hover highlight; selection bar (sticky bottom when ≥1 selected).
- Empty state: SVG illustration + "No risky products match your filters" + Clear filters CTA.

**Inline approve flow**: AlertDialog showing recommendation card + tasks-to-create list + optional approval note; on confirm: mutate actions-store, push audit log, toast "Recommendation approved" with View tasks action button.

**Inline reject flow**: right Sheet with reason multi-select (Already sold / Discount too aggressive / Transfer not feasible / Will manage manually / Other) + optional textarea.

**Bulk action modal**: list of selected + cumulative metrics + Approve all / Reject all + animated progress 800ms + outcome toast.

**GRID view**: ProductCard grid (`components/cards/product-card.tsx`): image with risk badge overlay; name + store + category; 3-stat row (stock/expiry/risk); action badge; net saved chip; View button + quick actions kebab.

**HEATMAP view**: grid (rows = stores, cols = categories); each cell shows count + sum predicted_loss_value; click → switch to Table view with that filter applied.

**Saved Views**: "Save current filters" → name modal → stored in filters-store; dropdown lists prebuilt + user-saved.

**Acceptance criteria**:
- All filters persist to URL search params.
- Hard refresh restores filter state.
- Three views switchable and show the same underlying filtered data.
- CSV export downloads correctly.
- Bulk approve/reject updates rows immediately.

---

### PHASE 6 — PRODUCT DETAILS (`/products/[id]`) — DEMO CENTERPIECE

**Goal**: the single most important screen. Spend extra polish here.

**Deliverables**:

Server component loads: product, store, category, supplier, latest risk_prediction, recommendation + scenarios, last-30-day sales aggregates, active inventory_batches, inventory_snapshots history, waste_records last 90 days, audit_logs filtered to this product, related products (same category top 6 by risk).

**Sticky header**: breadcrumb Products › {name}; row with thumbnail + h1 product name + SKU + barcode; right side = large Risk Badge + Audit Log button (opens drawer) + Share icon (mock copy URL + toast).

**Main 3-column layout (lg:grid-cols-12)**:

**Column 1 (col-span-4) — Product context** stack of cards:
- Product Info (image, name, SKU/barcode mono, category link, brand, supplier link, storage pill, unit, shelf life)
- Branch & Stock (store name + address, current/available/reserved stock, confidence pill with sync tooltip)
- Financials (cost / sale / margin ₼ + %, minimum margin badge, predicted loss large in red)
- Dates (received earliest active batch, expiry color-coded, days to expiry countdown badge, expected sellout date calc)
- Batches accordion (each active batch: code/received/expiry/qty/status)

**Column 2 (col-span-5) — Trends & risk** cards:
- **Risk Score Breakdown**: Recharts RadialBar (single arc, color by level, center text = score + level); right side = 5 stacked horizontal factor bars with values and weight labels; below = narrative paragraph rendering `risk_prediction.main_reason`.
- **Sales Trend (last 30 days)**: AreaChart; rolling 7d avg line; today vertical line; mini-stats (7d avg, 30d avg, trend arrow %); toggle Quantity / Revenue; campaign-day annotations.
- **Inventory Trend**: LineChart; replenishment markers; today highlighted; expiry vertical dashed line; tooltip shows daily breakdown.
- **Expiry Timeline (visual)**: horizontal timeline (custom); markers for today / expected sellout / expiry; color zones; stacked bar segments visualizing "X units expected to sell" vs "Y units at risk".
- **Data Confidence Panel**: big confidence score; checklist (expiry present, batch consistent, last stock sync, sales fresh, last physical check) with ✅/⚠️; "Create stock check task" button.

**Column 3 (col-span-3, sticky top-20) — AI Recommendation Panel**:
- Glowing brand-border card: AI sparkle + "AI Recommendation"; action badge; recommendation text bold; reason italic; confidence progress bar; metrics: Expected Recovered, Cost, **Net Saved (large emerald)**; approval-required role badge.
- Buttons: [✓ Approve] (primary, full width), [✗ Reject] (outline, full width), "⚖ Compare alternatives" smooth-scrolls to What-If section below.
- Collapsible "Manual Action" card: action type combobox + dynamic params + Create button.

**Below main — What-If section**: placeholder section id="whatif" rendering 5 static scenario cards from `recommendation-scenarios` (no interactivity yet). Banner: "Interactive simulator unlocks in PHASE 7".

**Audit Trail Section** (full width): vertical timeline; each event shows timestamp + user avatar/name + action description; color-coded by action type.

**Related Products**: horizontal scroll of 6 ProductCards; each click → that product detail.

**Approve flow**: AlertDialog showing recommendation summary + "Following will happen" tasks-list + optional note → on confirm: mutate actions-store, push audit log, sonner toast with "View tasks" button; the AI panel transforms to ✓ Approved state with link to created tasks.

**Reject flow**: right Sheet with reason multi-select + textarea → status=rejected → toast → AI panel updates to rejected state.

**Audit Log drawer** (from header button): filterable list; each entry expandable to old/new diff.

**Empty/error states**: product not found → custom empty + Back to products; no risk prediction → friendly notice.

**Mobile**: columns stack; right panel becomes fixed bottom action bar with [Approve][Reject][Details].

**Acceptance criteria**:
- For spotlight `p-demo-yogurt` (Qatıq 500q), every section renders with realistic data.
- Risk radial shows 82 and "high" badge.
- AI panel shows the combined recommendation with net saved ≈ ₼48.
- Approve flow creates 2 mock tasks visible in `/tasks` and triggers an audit log entry.
- Mobile layout works.

---

### PHASE 7 — WHAT-IF SIMULATOR

**Goal**: interactive scenario comparison embedded in product details + standalone lab.

**Deliverables**:

`src/components/whatif/whatif-simulator.tsx` with props: product, store, baseline `{currentStock, avgDailySales7d, daysToExpiry, costPrice, salePrice, minimumMarginPct}`, candidateTargetStores list, onApply callback.

**Layout**:

**Header**: title, description, Reset to defaults button, Save snapshot button (mock).

**Section A — Scenario Cards (5)** in grid (lg:5 / md:2 / sm:1). Each card:
- Header: icon, title, short description
- Live-computed metrics: expected sold, recovered value, cost (with breakdown tooltip), Net Saved (huge, color-coded), confidence bar
- Card-specific interactive params:
  - no_action: none
  - discount: slider 5–50% step 5 (default 20%); margin warning if breached
  - transfer: target store Combobox (shows current stock + sales velocity per option) + qty slider; live transfer cost preview
  - bundle: companion product combobox + bundle discount slider (5–25%)
  - shelf_visibility: none
  - combined: discount slider + transfer qty + target combobox
- "Recommended" badge moves to whichever scenario has the highest net_saved (transitions smoothly)
- "Select this scenario" button

**Section B — Comparison Chart**: Recharts BarChart with X = scenario, Y = net_saved; best bar emerald, others muted; value labels.

**Section C — Detail Panel (for selected scenario)**: waterfall chart (baseline → +recovered → −costs → final); 3 mini cards (Revenue impact / Cost breakdown / Margin & confidence); narrative paragraph rendered from template.

**Section D — Action Bar (sticky bottom of section)**: left = selected scenario summary; right = [Reset] + [Approve this scenario] which triggers the same approve flow as the AI panel (AlertDialog → tasks created).

**Reactivity & validation**:
- Slider changes debounced 100ms; metrics tween over ~250ms
- Margin breach: red row in card
- Transfer cost > recovery: card greyed with "Transfer not viable" overlay
- Days to expiry ≤ 1 + transfer selected: red warning
- Confidence < 50: yellow banner suggesting stock check

**Tooltips**: every metric has an info icon → HoverCard with formula + plain-English explanation.

**Standalone /whatif-lab**: same UI; top section = Product search Combobox → hydrate baseline from latest snapshot + sales aggregates; "Override baseline" toggle reveals manual input fields; sandbox warning banner; saved snapshots persist in Zustand list shown in sidebar.

**Acceptance criteria**:
- Spotlight Qatıq 500q shows 5 scenarios; combined has highest net_saved ≈ ₼48; Recommended badge sits on combined.
- Moving discount slider updates metrics smoothly without jank.
- Approve flow ties back to product details page state.

---

### PHASE 8 — RECOMMENDATIONS (`/recommendations`)

**Goal**: triage inbox for managers; card-based feed.

**Deliverables**:

**Header**: title; right slot = inline acceptance rate pill + Export CSV + Bulk approve / Bulk reject.

**Tabs**: Pending (default) / Approved / Rejected / Completed / Expired / All. Count badges.

**Filters**: store, category, action type, priority, date range, confidence range, net saved range. Plus "Requires my approval" toggle (filters where `requires_approval_by_role === currentUser.role`).

**Card feed** (not table). Each recommendation:
- Row 1 — Identity: product image + name + category + store badges | created_at relative + Priority badge
- Row 2 — Recommendation: action badge + text (Az, bold) + reason (Az, italic muted)
- Row 3 — Financial: Recovered chip + Cost chip + **Net Saved chip (emphasized)** + Confidence chip + Approver role chip
- Row 4 — Alternatives (collapsible): "Show 3 alternative scenarios" → mini side-by-side bar comparison + "Open in What-If Lab" link
- Row 5 — Actions: checkbox (bulk) + [Approve] [Reject] [View details] [⚖ Open in What-If] + Status badge

**Inline approve / reject** flows: same AlertDialog / Sheet patterns from PHASE 5.

**Bulk approve modal**: sticky bottom selection bar with cumulative net saved; modal shows scrollable selected list + Approve all button + 1s progress + outcome toast.

**Completed tab outcome block** per card: "Real recovered value: ₼58.80 (vs ₼48 expected)" + outcome badge (✅ Successful / ⚠️ Partial / ❌ Failed) + "Why" narrative + "Improves future AI confidence" caption.

**Sort options**: Net Saved desc (default), Priority + created_at, Confidence, Days to expiry.

**Empty states** per tab (e.g., "All caught up — no pending recommendations 🎉").

**Acceptance criteria**:
- Card animations on tab transition (framer-motion AnimatePresence).
- Inline approve mutates state; card animates out and into the Approved tab.
- Bulk flow handles 10+ selected items smoothly.

---

### PHASE 9 — TASKS (manager + employee)

**Goal**: two UIs — power manager view and mobile-first employee view.

**Deliverables**:

#### `/tasks` Manager View

**Header**: title + filters + bulk actions.

**View toggle (top right)**: Table / Calendar / Workload.

**Tabs**: Pending / In Progress / Completed Today / Expired / All.

**TABLE view**: checkbox, title, product (image+name), store, assignee (avatar+name), task type badge, priority, deadline (countdown for urgent), status, source recommendation (link), actions (kebab: View details (drawer), Update status (sub-menu), Reassign (combobox), Extend deadline (date picker popover), Cancel).

**Task Detail Drawer**: title + description; product mini-card; source recommendation link; status timeline (vertical); comments thread (pre-populated + add-comment textarea); bottom actions (Mark in progress / Mark completed with optional note + mock photo upload).

**CALENDAR view**: custom calendar with date-fns; tasks plotted by deadline; chips color-coded by priority; click chip → drawer; drag-to-reschedule (mock).

**WORKLOAD view**: per assignee row with avatar + today's task counts (stacked horizontal bar by status) + this-week pending; bottleneck flag if >5 high-priority pending.

**Bulk actions**: reassign, change priority, cancel.

#### `/my-tasks` Employee View (mobile-first)

Centered viewport (max-w-md mx-auto) so even on desktop it looks like a phone preview.

**Header**: "Hello, {firstName} 👋" + "You have {N} tasks today" + circular progress ring `{completed}/{total}` + percentage; toggle Today only / All; sort by deadline.

**Task card** (vertical stack, large touch targets):
- 4px priority strip on left edge (color-coded)
- Product image medium
- Product name + qty (text-xl font-semibold)
- Location chip (mock derived: "Süd reyonu, rəf 3")
- Task type icon + short instruction (Az)
- Deadline pill color-coded by urgency (>4h muted, 1–4h amber, <1h red + pulse)
- Bottom action row full-width: [✓ Complete] (primary, big), [Details] (ghost), [⋯] kebab (Skip / Report problem)

**Task detail (full-screen)** route `/my-tasks/[id]`:
- Hero product image
- Step-by-step checklist (interactive checkboxes)
- "Add photo" button (mock camera UI placing placeholder image)
- "Add note" textarea
- Sticky bottom [Complete task] big button
- Confirmation dialog on complete → toast + back to list + appended to completed feed

**Empty state**: "No tasks left today 🎉" + framer-motion confetti.

**Completed feed** (collapsible bottom): "Today's completed tasks" count + read-only faded cards.

#### Cross-screen sync
Status transitions: pending → assigned → in_progress → completed; any → expired (deadline passed; useEffect setInterval(60000) checks deadlines and updates actions-store); any → cancelled (manager only). Each transition: audit log + notification + toast.

Manager drawer changes reflect immediately in employee list (both read actions-store).

**Acceptance criteria**:
- New tasks from PHASE 6/8 approve flows appear in both views.
- Employee view feels native-mobile even in desktop browser.
- Photo proof flow works.

---

### PHASE 10 — TRANSFERS & DISCOUNTS

**Goal**: dedicated approval queues for transfers and discounts.

**Deliverables**:

#### `/transfers`

**Header**: title; Tabs: Suggested / Approved (preparing + in_transit) / Completed / Cancelled / All.

**Network Map** (top, large card): SVG map of Baku with store pins positioned by lat/lng; pins colored by transfer involvement (source = blue, target = green, both = purple); animated dashed lines between active source/target; hover pin → popover; click pin filters list.

**Transfer cards** (list below map): top row from-store → arrow → to-store + created relative + status badge; middle product image + name + qty; 3-stat row (cost / expected sales value / net saved); expiry window text; reason text (Az); buttons [Approve] [Reject] [View details].

**Detail Modal/Drawer**: from/to store cards (capacity, distance mock, ETA); product info; side-by-side source-risk vs target-demand mini-bars; cost breakdown; status stepper (prepare → pickup → transit → receive → confirm); multi-step approval visual (source manager ✓ → target manager ⌛ → logistics ⌛); audit trail snippet.

**Bulk approve** for logistics_manager.

#### `/discounts`

**Header**: title; Tabs: Suggested / Active / Completed / Rejected.

**Stats strip**: Active today count, Total revenue at discount today, Avg discount %, Effectiveness score (mock).

**Discount cards**: product image + name + store badge; pricing row (original strike-through → discounted price + discount % badge); margin badge (red if below min); expected uplift chip; duration (start → end); status; actions [Approve] [Reject] [Adjust] [Details].

**Adjust modal**: discount % slider with live margin recalc; time window pickers; "Effective immediately" checkbox.

**Active Discounts Live section**: sales counter increments via setInterval mock; ETA to depletion; pulse Live dot.

**Margin Alarm floating alert** if any active discount currently breaks min margin.

**Acceptance criteria**:
- Map renders 8 stores at plausible positions.
- Multi-step approval visual reflects actions-store state.
- Margin guard prevents saving below-threshold discounts unless overridden with warning.

---

### PHASE 11 — ANALYTICS (`/analytics`)

**Goal**: deep-dive with 6 tabs.

**Deliverables**:

**Header**: title; Right slot = date range, Export PDF, "Compare to previous period" overlay toggle.

**Tabs (segmented control)**:

**1. Loss & Saved** (default): 4-card KPI strip (Total Potential Loss / Total Actual Loss / Total Net Saved / Saved-to-Loss ratio); Stacked area chart (potential/actual/recovered over time); Waterfall (net saved by action type); ROI bar chart (action-type comparison); Cost donut (discount/transfer/operational); auto-generated narrative insights panel.

**2. Store Performance**: heatmap (store × date intensity); ranking table; comparison chart (top 3 vs bottom 3); narrative.

**3. Category Insights**: donut by category; heatmap (category × week); top-10 SKUs table; seasonality line per category; recommendation widget.

**4. Supplier Performance**: table (supplier / volume / damage / on-time / expiry issues / risk / Review); quadrant scatter; per-supplier trend.

**5. AI Performance**: funnel (generated → approved → completed → successful); acceptance over time line; confidence vs success scatter; reject reasons donut; effectiveness card; improvement suggestions widget.

**6. Sustainability**: kg saved big number; CO₂ saved (kg × 2.5); equivalent comparison (trees); donation-ready count; monthly trend line; "Generate ESG report" CTA → mock modal with PDF placeholder SVG.

**Cross-cutting**: all charts respect global date range; compare-previous overlay; each chart has Export image + Export data CSV mini-actions; clickable drill-down where meaningful.

**Acceptance criteria**:
- Each tab loads independently with proper loading state.
- Narrative widgets render template text from data.

---

### PHASE 12 — DATA QUALITY (`/data-quality`)

**Goal**: integrity and integration health view for CIO/Admin.

**Deliverables**:

**Header** + **Health Score** (top, prominent radial 0..100 = avg data confidence) + KPI strip (Active issues / High severity / Resolved this week / Avg time to resolve) + Issue Types donut (clickable filters list).

**Active Issues table**: issue type icon+label, severity badge, product link, store link, description (Az), created_at, status, actions (Resolve / Ignore / Investigate).

**Detail drawer**: full issue narrative + affected entities + suggested fix checklist + "Create stock check task" button + Mark resolved with required note.

**Integration Status Panel**: POS / ERP / Supplier portal / Inventory scanner mock connection cards with last sync + Refresh button + View logs (modal mock).

**Trends**: confidence score line (30d); issues created vs resolved grouped bar; top 5 stores with most issues.

**Bulk actions**: "Run network-wide stock check" → confirm → create N stock-check tasks; "Refresh all integrations" → fake 3s progress + toast.

**Acceptance criteria**:
- Health score reflects average confidence from snapshots.
- Resolve action requires a note.

---

### PHASE 13 — NOTIFICATIONS, AUDIT LOG, SETTINGS

**Goal**: notification center, full audit trail with diff viewer, settings page.

**Deliverables**:

#### `/notifications`
Tabs (All / Unread / Mentions); filters (priority, type, date range); grouped list by date (Today / Yesterday / This week / Earlier); each notification card has type icon + title + message + priority dot + relative time + mark-read toggle + click navigates to entity; bulk: Mark all read, Delete read; per-tab empty states; footer link → Notification preferences (Settings).

#### `/audit-log`
Table: timestamp / user (avatar+name+role) / action (badge) / entity type / entity ID (link) / diff summary / IP (mock); filters: user, action type, entity type, date range, free text; kebab → View diff → drawer with side-by-side JSON diff (pretty-printed, green added / red removed); Export to CSV; pagination 50; "Compliance mode" toggle (adds immutable banner).

#### `/settings`
Cards:
- Profile (avatar mock upload, name, email, role, store, Save)
- Notification Preferences (per-type email/push/in-app toggles, quiet hours)
- Appearance (theme light/dark/system, density comfortable/compact)
- Localization (language English default / Azerbaijani disabled "Coming soon", currency locked AZN, date format)
- Data Preferences (default date range, auto-approve threshold slider for low-stakes actions)
- **Demo Controls** (Reset demo data with confirmation; Replay demo scenario dropdown; Demo mode toggle showing DEMO badge site-wide)
- Security (Change password mock disabled, Active sessions mock list with Revoke mock)
- About (version 1.0.0, tech stack, team credits)

**Acceptance criteria**:
- Notification click navigates correctly per entity.
- Audit log diff drawer shows readable JSON diff.
- Reset demo data fully resets actions-store and notifications-store.

---

### PHASE 14 — POLISH & DEMO MODE

**Goal**: hackathon-ready polish; final sweep across all screens.

**Deliverables**:

**14.1 Universal states sweep** every page:
- Loading states with skeletons matching final layout; `loading.tsx` per route.
- Empty states with inline SVG illustration + heading + description + CTA on every list/table/feed.
- Error states: global `error.tsx`, per-section ErrorBoundary, friendly messages with Reload button.
- Custom `app/not-found.tsx`.

**14.2 Animations & microinteractions**:
- AnimatePresence on layout for page transitions.
- Card hover lift; button click scale-95.
- KPI number counter animations on mount.
- Chart entrance animations.
- Drawer/sheet slide; modal scale+fade.

**14.3 Keyboard shortcuts** registered globally:
- ⌘K command palette; ⌘⇧R role switcher
- G→D /executive; G→P /products; G→T /tasks; G→R /recommendations
- N new task (manager only)
- ? shortcuts cheat-sheet modal
- Esc closes any modal/drawer

**14.4 Accessibility**: ARIA labels on icon buttons, visible focus rings, WCAG AA contrast, keyboard nav with focus trap in modals, screen-reader announcements for route changes + toasts, alt text everywhere, skip-to-content link.

**14.5 Responsive polish**: verify every page at 375px width; sidebar Sheet on mobile; tables become horizontal scroll OR mobile cards; charts use ResponsiveContainer; touch targets ≥ 44px.

**14.6 Demo Mode toggle** in Settings → Demo Controls: when on, adds pulsing "🎬 DEMO" badge top-right (z-50) and enables debug overlays; "Reset demo data" clears actions-store + notifications-store + hard JSON reload; "Replay demo scenario" dropdown to apply snapshots.

**14.7 Demo Scenarios** in `src/lib/demo-scenarios.ts` — 4 scripted state snapshots:
1. **Crisis: Qatıq 500q** — navigates to `/products/p-demo-yogurt` with all panels pristine, AI panel highlighted, what-if defaulted to "combined"
2. **Morning approvals queue** — navigates to `/recommendations?tab=pending` with 5 pending high-priority items
3. **Employee shift starts** — switches role to employee, navigates to `/my-tasks` with 3 queued tasks
4. **End of day report** — switches to CEO, navigates to `/executive` with elevated saved-value KPIs

Top-bar dropdown "🎬 Demo Scenarios" lists these.

**14.8 Onboarding Tour** (first visit, gated by ui-store.hasSeenOnboarding):
- Welcome modal "Welcome to Bravo FreshFlow AI! Take a 30-second tour?"
- 5 tooltip steps (Sidebar / KPI grid / Notifications bell / Role switcher / Cmd+K)
- Final "You're all set 🚀"
- Replayable from Settings → About

**14.9 Performance**:
- Dynamic imports for heavy charts (`dynamic(() => import('./loss-trend-chart'), { ssr: false })`)
- next/image for all images
- React.memo on chart components
- Tree-shaken recharts imports
- Suspense boundaries

**14.10 Brand polish**: SVG favicon with brand mark; OG image 1200×630; loading screen with brand mark on initial load; optional sound effects toggle (default off); easter egg 5 fast clicks on brand → confetti burst.

**14.11 Write `docs/DEMO_SCRIPT.md`** — the 5–7 minute walkthrough:

```markdown
# Demo Script (5–7 minutes)

## Setup
- Open the app, light mode preferred for projector
- Default role: CEO → lands on /executive
- DEMO badge visible top-right

## Opening (30 sec)
"Retail loss doesn't start when a product becomes waste. It starts earlier — when
stock piles up, when sales slow, when expiry approaches, when one branch is
overstocked while another is hungry."

## Step 1 — Executive Dashboard (60 sec)
- Point to KPI grid: "₼ 12,400 potential loss, but ₼ 7,800 recoverable today"
- Sustainability card: "Equivalent to X trees of CO₂"

## Step 2 — Risky Products (60 sec)
- Click Risky Products → filter to Critical → sort by Net Saved → click "Qatıq 500q"

## Step 3 — Product Details (90 sec)
- Walk through risk breakdown radial (82, mostly stock pressure + expiry)
- Read narrative
- Show sales trend
- Show AI Recommendation: 20% discount + 30-unit transfer to Gənclik

## Step 4 — What-If Simulator (60 sec)
- Show 5 scenarios side-by-side
- Drag discount slider — net saved updates live
- Combined wins → Recommended badge
- Click Approve this scenario

## Step 5 — Task Creation (45 sec)
- Confirm dialog → 2 tasks created
- Switch role to Employee → mobile task card → checklist → Add photo → Complete

## Step 6 — Result (45 sec)
- Switch back to CEO → Sustainability tile updated → audit log entry visible

## Closing (30 sec)
"Detect. Explain. Compare. Act. Learn. Bravo FreshFlow AI."
```

**14.12 Write root README.md**: project description, demo URL (placeholder), local setup, "no auth — pick a role from the topbar" note, tech stack, folder structure summary, available scripts, demo scenarios list, team credits.

**Acceptance criteria**:
- Walk through the entire DEMO_SCRIPT end-to-end without any rough edge.
- All 14 phases marked `[x]` in PROGRESS.md.
- Status: COMPLETE.

---

## 11. Mock Data Generation Brief (for the data team member)

The data team works in a separate Claude Code session in parallel. They deliver 19 JSON files into `public/mock-data/` matching section 7 exactly. Hand them this same SPEC file plus the Data Team Kickoff Prompt provided alongside this file.

Record-count targets:

| File | Min | Max |
|---|---|---|
| users.json | 10 | 12 |
| stores.json | 8 | 8 |
| categories.json | 9 | 12 |
| suppliers.json | 12 | 18 |
| products.json | 80 | 120 |
| inventory-batches.json | 200 | 400 |
| inventory-snapshots.json | 300 | 500 |
| sales.json | 2000 | 3500 |
| waste-records.json | 80 | 150 |
| risk-predictions.json | 40 | 60 |
| recommendations.json | 40 | 60 |
| recommendation-scenarios.json | 160 | 300 |
| tasks.json | 60 | 100 |
| transfers.json | 15 | 25 |
| discounts.json | 20 | 35 |
| audit-logs.json | 200 | 400 |
| data-quality-issues.json | 12 | 20 |
| notifications.json | 30 | 50 |
| kpi-snapshots.json | 240 | 360 |

Status distributions:
- recommendations: 50% pending_approval, 25% approved/converted_to_task, 15% rejected, 10% completed
- tasks: 30% pending, 25% in_progress, 30% completed, 10% expired, 5% cancelled
- discounts: 30% suggested, 40% active/approved, 25% completed, 5% rejected

Mandatory data integrity:
- Every FK resolves
- Risk math verified on 5 random risk_predictions (manual recompute)
- Each recommendation has 3–5 scenarios; exactly ONE has `is_recommended = true`
- Spotlight products exist with exact specs from section 8
- All Azerbaijani diacritics correct (ə, ı, ş, ç, ğ, ö, ü)
- UTF-8; pretty-printed (2-space indent)
- Files saved with exact filenames from section 7

The data team also creates `public/mock-data/README.md` listing each file + record counts and `public/mock-data/_meta.json` with `{version, generated_at, source: "synthetic-v1", counts}`.
