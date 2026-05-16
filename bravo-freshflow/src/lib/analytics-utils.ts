import { differenceInCalendarDays, parseISO, startOfYear, subDays, format, startOfWeek } from "date-fns";
import { MOCK_DATE } from "./constants";
import type { DateRangeKey } from "@/store/filters-store";
import type { KpiSnapshot } from "@/types";

export interface ResolvedRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
  label: string;
}

export const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  ytd: "year to date",
  custom: "custom range",
};

export function resolveRange(
  key: DateRangeKey,
  custom: { from: string | null; to: string | null }
): ResolvedRange {
  const today = parseISO(MOCK_DATE);
  let from = subDays(today, 29);
  let to = today;
  if (key === "custom" && custom.from && custom.to) {
    from = parseISO(custom.from);
    to = parseISO(custom.to);
  } else if (key === "today") {
    from = today;
    to = today;
  } else if (key === "7d") {
    from = subDays(today, 6);
  } else if (key === "30d") {
    from = subDays(today, 29);
  } else if (key === "90d") {
    from = subDays(today, 89);
  } else if (key === "ytd") {
    from = startOfYear(today);
  }
  const days = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, days - 1);
  return { from, to, prevFrom, prevTo, days, label: DATE_RANGE_LABEL[key] };
}

export function inRange(date: string, from: Date, to: Date): boolean {
  try {
    const d = parseISO(date);
    return d >= from && d <= to;
  } catch {
    return false;
  }
}

export function globalSnapshots(snapshots: KpiSnapshot[]): KpiSnapshot[] {
  return snapshots.filter((s) => s.store_id === null && s.category_id === null);
}

export function storeSnapshots(snapshots: KpiSnapshot[], storeId: string): KpiSnapshot[] {
  return snapshots.filter((s) => s.store_id === storeId && s.category_id === null);
}

export function categorySnapshots(snapshots: KpiSnapshot[], categoryId: string): KpiSnapshot[] {
  return snapshots.filter((s) => s.category_id === categoryId && s.store_id === null);
}

export interface PeriodTotals {
  potential: number;
  actual: number;
  recovered: number;
  netSaved: number;
  wasteKg: number;
  recsGenerated: number;
  recsAccepted: number;
  recsRejected: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksExpired: number;
  transfersCompleted: number;
  discountsApplied: number;
}

export function sumPeriod(snapshots: KpiSnapshot[]): PeriodTotals {
  return snapshots.reduce<PeriodTotals>(
    (acc, s) => {
      acc.potential += s.potential_loss;
      acc.actual += s.actual_loss;
      acc.recovered += s.recovered_value;
      acc.netSaved += s.net_saved_value;
      acc.wasteKg += s.waste_kg;
      acc.recsGenerated += s.recommendations_generated;
      acc.recsAccepted += s.recommendations_accepted;
      acc.recsRejected += s.recommendations_rejected;
      acc.tasksCreated += s.tasks_created;
      acc.tasksCompleted += s.tasks_completed;
      acc.tasksExpired += s.tasks_expired;
      acc.transfersCompleted += s.transfers_completed;
      acc.discountsApplied += s.discounts_applied;
      return acc;
    },
    {
      potential: 0,
      actual: 0,
      recovered: 0,
      netSaved: 0,
      wasteKg: 0,
      recsGenerated: 0,
      recsAccepted: 0,
      recsRejected: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksExpired: 0,
      transfersCompleted: 0,
      discountsApplied: 0,
    }
  );
}

export function deltaPct(curr: number, prev: number): number {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function pctSignDirection(value: number): "up" | "down" | "flat" {
  if (Math.abs(value) < 0.05) return "flat";
  return value > 0 ? "up" : "down";
}

export function bucketByDay<T>(items: T[], getDate: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getDate(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function weekKey(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonAsImage(filename: string) {
  return filename;
}

export const CO2_PER_KG_FOOD = 2.5;
export const KG_PER_PARCEL = 5;
export const KG_CO2_PER_TREE_YEAR = 21;

export const ACTION_LABELS: Record<string, string> = {
  no_action: "No Action",
  monitor: "Monitor",
  stock_check: "Stock Check",
  shelf_visibility: "Shelf Visibility",
  discount: "Discount",
  transfer: "Transfer",
  combined: "Discount + Transfer",
  bundle: "Bundle",
  reorder_reduce: "Reorder Reduce",
  reorder_increase: "Reorder Increase",
  supplier_review: "Supplier Review",
  return_to_supplier: "Return to Supplier",
  campaign_add: "Campaign Add",
};
