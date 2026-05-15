import type {
  Priority,
  Product,
  Recommendation,
  Store,
  Transfer,
  TransferStatus,
  User,
} from "@/types";
import type { TransferOverride } from "@/store/actions-store";

export interface TransferRow {
  transfer: Transfer;
  product: Product | undefined;
  fromStore: Store | undefined;
  toStore: Store | undefined;
  recommendation: Recommendation | undefined;
  override: TransferOverride | undefined;
}

export type TransferTab = "suggested" | "approved" | "completed" | "cancelled" | "all";

export const TRANSFER_TAB_ORDER: TransferTab[] = [
  "suggested",
  "approved",
  "completed",
  "cancelled",
  "all",
];

export const TRANSFER_TAB_LABELS: Record<TransferTab, string> = {
  suggested: "Suggested",
  approved: "In Flight",
  completed: "Completed",
  cancelled: "Cancelled",
  all: "All",
};

export interface TransferFilters {
  search: string;
  fromStoreIds: string[];
  toStoreIds: string[];
  priorities: Priority[];
  statuses: TransferStatus[];
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_TRANSFER_FILTERS: TransferFilters = {
  search: "",
  fromStoreIds: [],
  toStoreIds: [],
  priorities: [],
  statuses: [],
  dateFrom: null,
  dateTo: null,
};

export function activeTransferFilterCount(f: TransferFilters): number {
  let n = 0;
  if (f.search.trim()) n += 1;
  if (f.fromStoreIds.length) n += 1;
  if (f.toStoreIds.length) n += 1;
  if (f.priorities.length) n += 1;
  if (f.statuses.length) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  return n;
}

export function applyTransferOverride(transfer: Transfer, override: TransferOverride | undefined): Transfer {
  if (!override) return transfer;
  return {
    ...transfer,
    status: override.status ?? transfer.status,
    completed_at: override.completed_at !== undefined ? override.completed_at : transfer.completed_at,
  };
}

export function matchesTransferTab(t: Transfer, tab: TransferTab): boolean {
  if (tab === "all") return true;
  if (tab === "suggested") return t.status === "suggested";
  if (tab === "approved") {
    return t.status === "approved" || t.status === "preparing" || t.status === "in_transit" || t.status === "received";
  }
  if (tab === "completed") return t.status === "completed";
  if (tab === "cancelled") return t.status === "cancelled" || t.status === "failed";
  return true;
}

export function applyTransferFilters(rows: TransferRow[], f: TransferFilters): TransferRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(({ transfer, product, fromStore, toStore, recommendation }) => {
    if (q) {
      const hay = `${product?.name ?? ""} ${product?.sku ?? ""} ${fromStore?.code ?? ""} ${fromStore?.name ?? ""} ${toStore?.code ?? ""} ${toStore?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.fromStoreIds.length && !f.fromStoreIds.includes(transfer.from_store_id)) return false;
    if (f.toStoreIds.length && !f.toStoreIds.includes(transfer.to_store_id)) return false;
    if (f.priorities.length) {
      const p = recommendation?.priority ?? "medium";
      if (!f.priorities.includes(p)) return false;
    }
    if (f.statuses.length && !f.statuses.includes(transfer.status)) return false;
    if (f.dateFrom || f.dateTo) {
      const iso = transfer.created_at.slice(0, 10);
      if (f.dateFrom && iso < f.dateFrom) return false;
      if (f.dateTo && iso > f.dateTo) return false;
    }
    return true;
  });
}

export function scopeTransfersByRole(rows: TransferRow[], user: User): TransferRow[] {
  switch (user.role) {
    case "store_manager":
    case "supervisor":
      if (!user.store_id) return rows;
      return rows.filter(
        (r) => r.transfer.from_store_id === user.store_id || r.transfer.to_store_id === user.store_id
      );
    case "employee":
      return [];
    default:
      return rows;
  }
}

export interface TransferStep {
  key: "prepare" | "pickup" | "transit" | "receive" | "confirm";
  label: string;
  done: boolean;
  active: boolean;
}

export function transferSteps(status: TransferStatus): TransferStep[] {
  const order: TransferStep["key"][] = ["prepare", "pickup", "transit", "receive", "confirm"];
  const labels: Record<TransferStep["key"], string> = {
    prepare: "Prepare",
    pickup: "Pickup",
    transit: "In transit",
    receive: "Receive",
    confirm: "Confirm",
  };
  const stageIndex: Record<TransferStatus, number> = {
    suggested: -1,
    approved: 0,
    preparing: 0,
    in_transit: 2,
    received: 3,
    completed: 4,
    cancelled: -2,
    failed: -2,
  };
  const stage = stageIndex[status];
  return order.map((key, i) => ({
    key,
    label: labels[key],
    done: stage > i || status === "completed",
    active: stage === i,
  }));
}

export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function etaHours(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 35) * 10) / 10);
}
