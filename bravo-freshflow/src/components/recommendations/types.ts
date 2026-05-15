import type {
  Priority,
  Recommendation,
  RecommendationScenario,
  RecommendationStatus,
  RecommendationType,
  Role,
} from "@/types";
import type { RiskyRow } from "@/components/products/types";
import type { PendingApproval } from "@/store/actions-store";

export type RecommendationTab =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "expired"
  | "all";

export type RecommendationSort =
  | "net_saved_desc"
  | "priority_created"
  | "confidence_desc"
  | "days_to_expiry_asc";

export interface RecommendationFilters {
  storeIds: string[];
  categoryIds: string[];
  actionTypes: RecommendationType[];
  priorities: Priority[];
  dateFrom: string | null;
  dateTo: string | null;
  confMin: number;
  confMax: number;
  netMin: number;
  netMax: number;
  requiresMyApproval: boolean;
}

export const EMPTY_REC_FILTERS: RecommendationFilters = {
  storeIds: [],
  categoryIds: [],
  actionTypes: [],
  priorities: [],
  dateFrom: null,
  dateTo: null,
  confMin: 0,
  confMax: 100,
  netMin: -10000,
  netMax: 10000,
  requiresMyApproval: false,
};

export const NET_RANGE_FLOOR = -10000;
export const NET_RANGE_CEILING = 10000;

export interface RecommendationRow {
  row: RiskyRow;
  recommendation: Recommendation;
  effectiveStatus: RecommendationStatus;
  decision: PendingApproval | undefined;
  scenarios: RecommendationScenario[];
}

export function effectiveStatus(
  rec: Recommendation,
  decision: PendingApproval | undefined
): RecommendationStatus {
  if (decision?.decision === "approved") return "approved";
  if (decision?.decision === "rejected") return "rejected";
  return rec.status;
}

export function matchesTab(status: RecommendationStatus, tab: RecommendationTab): boolean {
  switch (tab) {
    case "pending":
      return status === "generated" || status === "pending_approval";
    case "approved":
      return status === "approved" || status === "converted_to_task";
    case "rejected":
      return status === "rejected";
    case "completed":
      return status === "completed";
    case "expired":
      return status === "expired" || status === "failed";
    case "all":
      return true;
  }
}

export function activeFilterCount(f: RecommendationFilters): number {
  let n = 0;
  if (f.storeIds.length) n += 1;
  if (f.categoryIds.length) n += 1;
  if (f.actionTypes.length) n += 1;
  if (f.priorities.length) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  if (f.confMin > 0 || f.confMax < 100) n += 1;
  if (f.netMin > NET_RANGE_FLOOR || f.netMax < NET_RANGE_CEILING) n += 1;
  if (f.requiresMyApproval) n += 1;
  return n;
}

export function applyRecFilters(
  rows: RecommendationRow[],
  f: RecommendationFilters,
  role: Role
): RecommendationRow[] {
  return rows.filter(({ row, recommendation }) => {
    if (f.storeIds.length && !f.storeIds.includes(row.store.id)) return false;
    if (f.categoryIds.length && !f.categoryIds.includes(row.product.category_id)) return false;
    if (f.actionTypes.length && !f.actionTypes.includes(recommendation.recommendation_type)) {
      return false;
    }
    if (f.priorities.length && !f.priorities.includes(recommendation.priority)) return false;
    if (f.dateFrom || f.dateTo) {
      const iso = recommendation.created_at.slice(0, 10);
      if (f.dateFrom && iso < f.dateFrom) return false;
      if (f.dateTo && iso > f.dateTo) return false;
    }
    if (
      recommendation.confidence_score < f.confMin ||
      recommendation.confidence_score > f.confMax
    ) {
      return false;
    }
    if (recommendation.net_saved_value < f.netMin || recommendation.net_saved_value > f.netMax) {
      return false;
    }
    if (f.requiresMyApproval) {
      if (recommendation.requires_approval_by_role !== role) return false;
    }
    return true;
  });
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function sortRows(
  rows: RecommendationRow[],
  sort: RecommendationSort
): RecommendationRow[] {
  const copy = rows.slice();
  switch (sort) {
    case "net_saved_desc":
      copy.sort((a, b) => b.recommendation.net_saved_value - a.recommendation.net_saved_value);
      break;
    case "priority_created":
      copy.sort((a, b) => {
        const pw = PRIORITY_WEIGHT[b.recommendation.priority] - PRIORITY_WEIGHT[a.recommendation.priority];
        if (pw !== 0) return pw;
        return b.recommendation.created_at.localeCompare(a.recommendation.created_at);
      });
      break;
    case "confidence_desc":
      copy.sort((a, b) => b.recommendation.confidence_score - a.recommendation.confidence_score);
      break;
    case "days_to_expiry_asc":
      copy.sort((a, b) => a.row.prediction.days_to_expiry - b.row.prediction.days_to_expiry);
      break;
  }
  return copy;
}

export const REC_SORT_LABELS: Record<RecommendationSort, string> = {
  net_saved_desc: "Net Saved (high → low)",
  priority_created: "Priority + Newest",
  confidence_desc: "Confidence (high → low)",
  days_to_expiry_asc: "Days to Expiry (soonest)",
};

export const TAB_LABELS: Record<RecommendationTab, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  expired: "Expired",
  all: "All",
};

export const TAB_ORDER: RecommendationTab[] = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "expired",
  "all",
];

export const APPROVAL_ROLE_LABELS: Record<string, string> = {
  store_manager: "Store Manager",
  category_manager: "Category Manager",
  logistics_manager: "Logistics Manager",
  purchase_manager: "Purchase Manager",
};

export interface CompletedOutcome {
  realRecovered: number;
  expectedRecovered: number;
  deltaPct: number;
  tier: "success" | "partial" | "failed";
  narrative: string;
}

export function deriveOutcome(
  rec: Recommendation,
  decision: PendingApproval | undefined
): CompletedOutcome {
  const expected = Math.max(rec.expected_recovered_value, 0.01);
  const seedBase =
    Number.parseInt(rec.id.replace(/\D+/g, ""), 10) ||
    rec.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const seed = (seedBase * 9301 + 49297) % 233280;
  const ratio = 0.65 + (seed / 233280) * 0.75;
  const realRecovered = decision ? expected * ratio : expected * 0.95;
  const delta = (realRecovered - expected) / expected;
  let tier: CompletedOutcome["tier"] = "partial";
  if (delta >= -0.1) tier = "success";
  else if (delta >= -0.4) tier = "partial";
  else tier = "failed";
  let narrative = "";
  if (tier === "success") {
    narrative = "Müştəri reaksiyası gözləntini qarşıladı; məhsul vaxtında satıldı.";
  } else if (tier === "partial") {
    narrative = "Qismən uğur — bir hissəsi satıldı, qalanı ya itki, ya da uzanan stok.";
  } else {
    narrative = "Hədəf çatmadı; növbəti modellərdə bu məhsul üçün etiket dəyişdiriləcək.";
  }
  return {
    realRecovered,
    expectedRecovered: expected,
    deltaPct: delta,
    tier,
    narrative,
  };
}
