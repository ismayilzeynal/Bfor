# Demo Script — Bravo FreshFlow AI (5–7 minutes)

## Setup before the demo

- Open the app in a fresh tab. Light theme preferred for projector contrast.
- Default role is **CEO** → app lands on `/executive`.
- Confirm the pulsing **DEMO** badge is visible top-right.
- (Optional) From topbar, open **Scenarios** dropdown and run **End-of-day report** to prime the KPI values.

## Opening (30 sec)

> "Retail loss doesn't start when a product becomes waste. It starts earlier — when stock piles up, when sales slow, when expiry approaches, when one branch is overstocked while another is hungry. **Bravo FreshFlow AI** sees that moment and acts on it."

## Step 1 — Executive Dashboard (60 sec)

- Point to KPI grid: "Potential loss today **₼ 12,400**, recoverable **₼ 7,800**."
- Hover one KPI to show the sparkline + previous-period comparison.
- Scroll to **Sustainability** card → "Equivalent to **X trees** of CO₂ avoided this month."
- Mention the **Network Health Banner** at the bottom — confidence, open issues, last sync.

## Step 2 — Risky Products (60 sec)

- Sidebar → **Risky Products**.
- Apply filter chip **Critical** → table re-renders with critical items only.
- Sort by **Net Saved** descending → top row is **Qatıq 500q**.
- Click the row → enter Product Details.

## Step 3 — Product Details (90 sec)

- Walk through the **Risk Score Radial** (≈82): mostly stock pressure + expiry.
- Read the **main reason narrative** under the radial.
- Show **Sales Trend (30d)**: declining slope, today marker, rolling 7-day dashed line.
- Right side: **AI Recommendation** panel — bold action text (20% discount + 30-unit transfer to Gənclik) + Net Saved ₼ tile + Confidence chip + Approver role badge.

## Step 4 — What-If Simulator (60 sec)

- Scroll to the **What-If** section (or click **Compare alternatives**).
- Show the 5 scenario cards side-by-side.
- **Drag the discount slider** on the discount card from 20% to 30% — Net Saved updates live.
- Switch to the **transfer** card, change target store from Gənclik to Nizami, watch the cost preview update.
- The **combined** card retains the "Recommended" badge → click **Approve this scenario**.

## Step 5 — Task Creation & Employee Mobile (60 sec)

- Approve dialog opens with recovered / cost / net saved metrics + tasks-to-create list → **Confirm**.
- Sonner toast: "Approved. 2 tasks created. View tasks." → click **View tasks**.
- Switch role via topbar **Role Switcher** → pick **Employee (Bravo Nərimanov)**.
- Land on `/my-tasks` → progress ring shows the workload.
- Open the new task card → checklist visible → tick 2 steps → press **Tamamla** → confirm.
- Confetti fires when the day's tasks reach 0.

## Step 6 — Result & Audit (45 sec)

- Switch role back to **CEO** via the role switcher.
- `/executive` Sustainability tile updated → recovered value bumped, parcels increased.
- Sidebar → **Audit Log** → newest row is the approval just made; click the row → side-by-side JSON diff drawer shows the old/new recommendation status.

## Closing (30 sec)

> "Five steps: **Detect.** **Explain.** **Compare.** **Act.** **Learn.** That's Bravo FreshFlow AI — every potential loss caught and resolved before it becomes waste."

---

## Quick reference — keyboard shortcuts

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

## Fallback paths

- Demo data drift after live experimentation: Settings → **Demo Controls** → **Reset all local state** → refresh.
- Want to replay any of the 4 scripted entry points: topbar **Scenarios** dropdown.
- Want to re-watch the onboarding tour: Settings → **About** → **Replay tour**.

## Demo Scenarios (one-click entry points)

1. **Crisis: Qatıq 500q** → opens Product Details with the recommendation panel pristine.
2. **Morning approvals queue** → /recommendations filtered to pending.
3. **Employee shift starts** → switches to Employee role, lands on /my-tasks.
4. **End-of-day report** → CEO on /executive with elevated KPIs.
