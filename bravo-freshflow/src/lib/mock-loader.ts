import type {
  AuditLog,
  Category,
  DataQualityIssue,
  Discount,
  InventoryBatch,
  InventorySnapshot,
  KpiSnapshot,
  Notification,
  Product,
  Recommendation,
  RecommendationScenario,
  RiskPrediction,
  SalesAggregate,
  Store,
  Supplier,
  Task,
  Transfer,
  User,
  WasteRecord,
} from "@/types";

const BASE = "/mock-data";

const EXCLUDED_CATEGORY_IDS = new Set<string>(["c-002", "c-003"]);

let productIdsCache: Set<string> | null = null;
let pendingProductIds: Promise<Set<string>> | null = null;

async function rawLoad<T>(filename: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE}/${filename}`, { cache: "force-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as T[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getValidProductIds(): Promise<Set<string>> {
  if (productIdsCache) return productIdsCache;
  if (pendingProductIds) return pendingProductIds;
  pendingProductIds = (async () => {
    const products = await rawLoad<Product>("products.json");
    const set = new Set<string>();
    for (const p of products) {
      if (!EXCLUDED_CATEGORY_IDS.has(p.category_id)) set.add(p.id);
    }
    productIdsCache = set;
    return set;
  })();
  return pendingProductIds;
}

export async function loadMockData<T>(filename: string): Promise<T[]> {
  return rawLoad<T>(filename);
}

export const loadUsers = () => rawLoad<User>("users.json");
export const loadStores = () => rawLoad<Store>("stores.json");

export async function loadCategories(): Promise<Category[]> {
  const all = await rawLoad<Category>("categories.json");
  return all.filter((c) => !EXCLUDED_CATEGORY_IDS.has(c.id));
}

export const loadSuppliers = () => rawLoad<Supplier>("suppliers.json");

export async function loadProducts(): Promise<Product[]> {
  const all = await rawLoad<Product>("products.json");
  return all.filter((p) => !EXCLUDED_CATEGORY_IDS.has(p.category_id));
}

export async function loadInventoryBatches(): Promise<InventoryBatch[]> {
  const [all, valid] = await Promise.all([
    rawLoad<InventoryBatch>("inventory-batches.json"),
    getValidProductIds(),
  ]);
  return all.filter((b) => valid.has(b.product_id));
}

export async function loadInventorySnapshots(): Promise<InventorySnapshot[]> {
  const [all, valid] = await Promise.all([
    rawLoad<InventorySnapshot>("inventory-snapshots.json"),
    getValidProductIds(),
  ]);
  return all.filter((s) => valid.has(s.product_id));
}

export async function loadSales(): Promise<SalesAggregate[]> {
  const [all, valid] = await Promise.all([
    rawLoad<SalesAggregate>("sales.json"),
    getValidProductIds(),
  ]);
  return all.filter((s) => valid.has(s.product_id));
}

export async function loadWasteRecords(): Promise<WasteRecord[]> {
  const [all, valid] = await Promise.all([
    rawLoad<WasteRecord>("waste-records.json"),
    getValidProductIds(),
  ]);
  return all.filter((w) => valid.has(w.product_id));
}

export async function loadRiskPredictions(): Promise<RiskPrediction[]> {
  const [all, valid] = await Promise.all([
    rawLoad<RiskPrediction>("risk-predictions.json"),
    getValidProductIds(),
  ]);
  return all.filter((r) => valid.has(r.product_id));
}

const EXCLUDED_RECOMMENDATION_TYPES = new Set<string>(["shelf_visibility"]);

export async function loadRecommendations(): Promise<Recommendation[]> {
  const [all, valid] = await Promise.all([
    rawLoad<Recommendation>("recommendations.json"),
    getValidProductIds(),
  ]);
  return all.filter(
    (r) =>
      valid.has(r.product_id) &&
      !EXCLUDED_RECOMMENDATION_TYPES.has(r.recommendation_type)
  );
}

export async function loadRecommendationScenarios(): Promise<RecommendationScenario[]> {
  const [all, recs] = await Promise.all([
    rawLoad<RecommendationScenario>("recommendation-scenarios.json"),
    loadRecommendations(),
  ]);
  const validRecIds = new Set(recs.map((r) => r.id));
  return all.filter(
    (s) =>
      validRecIds.has(s.recommendation_id) &&
      !EXCLUDED_RECOMMENDATION_TYPES.has(s.scenario_type)
  );
}

export async function loadTasks(): Promise<Task[]> {
  const [all, valid] = await Promise.all([
    rawLoad<Task>("tasks.json"),
    getValidProductIds(),
  ]);
  return all.filter((t) => !t.product_id || valid.has(t.product_id));
}

export async function loadTransfers(): Promise<Transfer[]> {
  const [all, valid] = await Promise.all([
    rawLoad<Transfer>("transfers.json"),
    getValidProductIds(),
  ]);
  return all.filter((t) => valid.has(t.product_id));
}

export async function loadDiscounts(): Promise<Discount[]> {
  const [all, valid] = await Promise.all([
    rawLoad<Discount>("discounts.json"),
    getValidProductIds(),
  ]);
  return all.filter((d) => valid.has(d.product_id));
}

export const loadAuditLogs = () => rawLoad<AuditLog>("audit-logs.json");

export async function loadDataQualityIssues(): Promise<DataQualityIssue[]> {
  const [all, valid] = await Promise.all([
    rawLoad<DataQualityIssue>("data-quality-issues.json"),
    getValidProductIds(),
  ]);
  return all.filter((i) => !i.product_id || valid.has(i.product_id));
}

export async function loadNotifications(): Promise<Notification[]> {
  const all = await rawLoad<Notification>("notifications.json");
  return all;
}

export async function loadKpiSnapshots(): Promise<KpiSnapshot[]> {
  const all = await rawLoad<KpiSnapshot>("kpi-snapshots.json");
  return all.filter((s) => !s.category_id || !EXCLUDED_CATEGORY_IDS.has(s.category_id));
}
