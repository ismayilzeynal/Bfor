import type {
  Category,
  Product,
  Recommendation,
  RecommendationStatus,
  RecommendationType,
  RiskLevel,
  RiskPrediction,
  Store,
  Supplier,
} from "@/types";

export interface RiskyRow {
  id: string;
  prediction: RiskPrediction;
  product: Product;
  store: Store;
  category: Category | undefined;
  supplier: Supplier | undefined;
  recommendation: Recommendation | undefined;
}

export interface RiskyFilters {
  search: string;
  riskLevels: RiskLevel[];
  storeIds: string[];
  categoryIds: string[];
  supplierIds: string[];
  actionTypes: RecommendationType[];
  statuses: RecommendationStatus[];
  expiryFrom: string | null;
  expiryTo: string | null;
  riskMin: number;
  riskMax: number;
  confMin: number;
  confMax: number;
}

export const EMPTY_FILTERS: RiskyFilters = {
  search: "",
  riskLevels: [],
  storeIds: [],
  categoryIds: [],
  supplierIds: [],
  actionTypes: [],
  statuses: [],
  expiryFrom: null,
  expiryTo: null,
  riskMin: 0,
  riskMax: 100,
  confMin: 0,
  confMax: 100,
};

export type ViewMode = "table" | "grid" | "heatmap";

export function isFilterActive(f: RiskyFilters): number {
  let n = 0;
  if (f.search.trim()) n += 1;
  if (f.riskLevels.length) n += 1;
  if (f.storeIds.length) n += 1;
  if (f.categoryIds.length) n += 1;
  if (f.supplierIds.length) n += 1;
  if (f.actionTypes.length) n += 1;
  if (f.statuses.length) n += 1;
  if (f.expiryFrom || f.expiryTo) n += 1;
  if (f.riskMin > 0 || f.riskMax < 100) n += 1;
  if (f.confMin > 0 || f.confMax < 100) n += 1;
  return n;
}

export function applyFilters(rows: RiskyRow[], f: RiskyFilters): RiskyRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (q) {
      const hay = `${r.product.name} ${r.product.sku} ${r.product.barcode} ${r.store.code} ${r.store.name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.riskLevels.length && !f.riskLevels.includes(r.prediction.risk_level)) return false;
    if (f.storeIds.length && !f.storeIds.includes(r.store.id)) return false;
    if (f.categoryIds.length && !f.categoryIds.includes(r.product.category_id)) return false;
    if (f.supplierIds.length && !f.supplierIds.includes(r.product.supplier_id)) return false;
    if (f.actionTypes.length) {
      if (!r.recommendation || !f.actionTypes.includes(r.recommendation.recommendation_type)) return false;
    }
    if (f.statuses.length) {
      if (!r.recommendation || !f.statuses.includes(r.recommendation.status)) return false;
    }
    if (f.expiryFrom || f.expiryTo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + r.prediction.days_to_expiry);
      const iso = expiryDate.toISOString().slice(0, 10);
      if (f.expiryFrom && iso < f.expiryFrom) return false;
      if (f.expiryTo && iso > f.expiryTo) return false;
    }
    if (r.prediction.risk_score < f.riskMin || r.prediction.risk_score > f.riskMax) return false;
    if (
      r.prediction.data_confidence_score < f.confMin ||
      r.prediction.data_confidence_score > f.confMax
    )
      return false;
    return true;
  });
}

export function buildRows(
  predictions: RiskPrediction[],
  products: Product[],
  stores: Store[],
  categories: Category[],
  suppliers: Supplier[],
  recommendations: Recommendation[]
): RiskyRow[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const supMap = new Map(suppliers.map((s) => [s.id, s]));
  const recByProduct = new Map<string, Recommendation>();
  for (const r of recommendations) {
    const existing = recByProduct.get(r.product_id);
    if (!existing || r.created_at > existing.created_at) recByProduct.set(r.product_id, r);
  }

  const rows: RiskyRow[] = [];
  for (const p of predictions) {
    const product = productMap.get(p.product_id);
    const store = storeMap.get(p.store_id);
    if (!product || !store) continue;
    rows.push({
      id: p.id,
      prediction: p,
      product,
      store,
      category: catMap.get(product.category_id),
      supplier: supMap.get(product.supplier_id),
      recommendation: recByProduct.get(p.product_id),
    });
  }
  return rows;
}
