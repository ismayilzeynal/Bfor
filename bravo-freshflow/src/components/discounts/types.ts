import { parseISO } from "date-fns";
import { MOCK_DATE } from "@/lib/constants";
import type {
  Discount,
  DiscountStatus,
  Priority,
  Product,
  Recommendation,
  Store,
  User,
} from "@/types";
import type { DiscountOverride } from "@/store/actions-store";

export interface DiscountRow {
  discount: Discount;
  product: Product | undefined;
  store: Store | undefined;
  recommendation: Recommendation | undefined;
  override: DiscountOverride | undefined;
  marginBreached: boolean;
  isLiveNow: boolean;
}

export type DiscountTab = "suggested" | "active" | "completed" | "rejected";

export const DISCOUNT_TAB_ORDER: DiscountTab[] = ["suggested", "active", "completed", "rejected"];

export const DISCOUNT_TAB_LABELS: Record<DiscountTab, string> = {
  suggested: "Suggested",
  active: "Active",
  completed: "Completed",
  rejected: "Rejected",
};

export interface DiscountFilters {
  search: string;
  storeIds: string[];
  priorities: Priority[];
  statuses: DiscountStatus[];
  marginBreachedOnly: boolean;
}

export const EMPTY_DISCOUNT_FILTERS: DiscountFilters = {
  search: "",
  storeIds: [],
  priorities: [],
  statuses: [],
  marginBreachedOnly: false,
};

export function activeDiscountFilterCount(f: DiscountFilters): number {
  let n = 0;
  if (f.search.trim()) n += 1;
  if (f.storeIds.length) n += 1;
  if (f.priorities.length) n += 1;
  if (f.statuses.length) n += 1;
  if (f.marginBreachedOnly) n += 1;
  return n;
}

export function applyDiscountOverride(d: Discount, override: DiscountOverride | undefined): Discount {
  if (!override) return d;
  return {
    ...d,
    status: override.status ?? d.status,
    discount_pct: override.discount_pct ?? d.discount_pct,
    start_datetime: override.start_datetime ?? d.start_datetime,
    end_datetime: override.end_datetime ?? d.end_datetime,
    current_margin_after_discount_pct:
      override.current_margin_after_discount_pct ?? d.current_margin_after_discount_pct,
    minimum_margin_checked: override.minimum_margin_checked ?? d.minimum_margin_checked,
  };
}

export function isLive(d: Discount, now: Date): boolean {
  if (d.status !== "active" && d.status !== "approved") return false;
  try {
    const s = parseISO(d.start_datetime).getTime();
    const e = parseISO(d.end_datetime).getTime();
    const t = now.getTime();
    return s <= t && t <= e;
  } catch {
    return false;
  }
}

export function isMarginBreached(d: Discount, product: Product | undefined): boolean {
  if (!product) return false;
  return d.current_margin_after_discount_pct < product.minimum_margin_pct;
}

export function matchesDiscountTab(d: Discount, tab: DiscountTab): boolean {
  if (tab === "suggested") return d.status === "suggested";
  if (tab === "active") return d.status === "approved" || d.status === "active";
  if (tab === "completed") return d.status === "completed" || d.status === "expired";
  if (tab === "rejected") return d.status === "rejected";
  return true;
}

export function applyDiscountFilters(rows: DiscountRow[], f: DiscountFilters): DiscountRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(({ discount, product, store, recommendation, marginBreached }) => {
    if (q) {
      const hay = `${product?.name ?? ""} ${product?.sku ?? ""} ${store?.code ?? ""} ${store?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.storeIds.length && !f.storeIds.includes(discount.store_id)) return false;
    if (f.priorities.length) {
      const p = recommendation?.priority ?? "medium";
      if (!f.priorities.includes(p)) return false;
    }
    if (f.statuses.length && !f.statuses.includes(discount.status)) return false;
    if (f.marginBreachedOnly && !marginBreached) return false;
    return true;
  });
}

export function scopeDiscountsByRole(rows: DiscountRow[], user: User): DiscountRow[] {
  switch (user.role) {
    case "store_manager":
    case "supervisor":
      if (!user.store_id) return rows;
      return rows.filter((r) => r.discount.store_id === user.store_id);
    case "employee":
    case "logistics_manager":
      return [];
    default:
      return rows;
  }
}

export function discountedPrice(product: Product, discountPct: number): number {
  return product.sale_price * (1 - discountPct);
}

export function marginAfter(product: Product, discountPct: number): number {
  const dp = discountedPrice(product, discountPct);
  if (dp <= 0) return -1;
  return (dp - product.cost_price) / dp;
}

export function todayMockDate(): Date {
  return new Date(`${MOCK_DATE}T12:00:00Z`);
}
