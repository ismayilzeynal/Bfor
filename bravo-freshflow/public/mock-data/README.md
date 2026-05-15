# Bravo FreshFlow AI — Mock Data

Synthetic data for the hackathon demo. Generated on 2026-05-15 from `bravo-data/generate.py`.
All schemas conform to BRAVO_FRESHFLOW_SPEC.md section 7.

| File | Records | Description |
|---|---|---|
| users.json | 12 | 12 demo users covering all 10 roles, Azerbaijani names |
| stores.json | 8 | 8 Bravo stores (7 in Bakı, 1 in Sumqayıt) with lat/lng |
| categories.json | 10 | 10 product categories, first 6 perishable |
| suppliers.json | 14 | Suppliers with risk scores 15–90 |
| products.json | 80 | Includes 5 spotlight products (Qatıq 500q, Toyuq Filesi, Banan, Hazır Salat, Süd 1L) |
| inventory-batches.json | 286 | Active/depleted/expired batches across stores |
| inventory-snapshots.json | 352 | Latest stock state per product × store |
| sales.json | 2226 | Daily aggregates for last 30 days |
| waste-records.json | 105 | Historical waste with reason + recorded_by |
| risk-predictions.json | 55 | Risk-scored product × store records (formula-verified) |
| recommendations.json | 55 | AI recommendations, mixed status distribution |
| recommendation-scenarios.json | 247 | 3–5 scenarios per recommendation, exactly one is_recommended |
| tasks.json | 87 | Manager + employee tasks, mixed statuses |
| transfers.json | 21 | Inter-store transfer suggestions and history |
| discounts.json | 29 | Discount campaigns with margin checks |
| audit-logs.json | 301 | Action history for recommendations/tasks/transfers/discounts |
| data-quality-issues.json | 18 | Open and resolved data integrity issues |
| notifications.json | 40 | Per-user notification feed |
| kpi-snapshots.json | 270 | Daily KPI rollups (network-wide + per-store) |

## Spotlight demo products
All five spotlight products from spec section 8 exist with the exact specs:
- `p-demo-yogurt`  Qatıq 500q     @ Bravo Nərimanov (s-001) — combined recommendation
- `p-demo-chicken` Toyuq Filesi   @ Bravo 28 May    (s-003) — urgent 30% discount
- `p-demo-banana`  Banan          @ Bravo Yasamal   (s-005) — bundle + shelf
- `p-demo-salad`   Hazır Salat    @ Bravo Gənclik   (s-002) — 25% discount
- `p-demo-milk`    Süd 1L         @ Bravo Elmlər    (s-004) — transfer to Sumqayıt

## Regenerate
From `bravo-data/`: `python generate.py` (deterministic seed = 20260515).
