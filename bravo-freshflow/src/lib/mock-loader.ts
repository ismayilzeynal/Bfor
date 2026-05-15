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

export async function loadMockData<T>(filename: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE}/${filename}`, { cache: "force-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as T[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const loadUsers = () => loadMockData<User>("users.json");
export const loadStores = () => loadMockData<Store>("stores.json");
export const loadCategories = () => loadMockData<Category>("categories.json");
export const loadSuppliers = () => loadMockData<Supplier>("suppliers.json");
export const loadProducts = () => loadMockData<Product>("products.json");
export const loadInventoryBatches = () => loadMockData<InventoryBatch>("inventory-batches.json");
export const loadInventorySnapshots = () =>
  loadMockData<InventorySnapshot>("inventory-snapshots.json");
export const loadSales = () => loadMockData<SalesAggregate>("sales.json");
export const loadWasteRecords = () => loadMockData<WasteRecord>("waste-records.json");
export const loadRiskPredictions = () => loadMockData<RiskPrediction>("risk-predictions.json");
export const loadRecommendations = () => loadMockData<Recommendation>("recommendations.json");
export const loadRecommendationScenarios = () =>
  loadMockData<RecommendationScenario>("recommendation-scenarios.json");
export const loadTasks = () => loadMockData<Task>("tasks.json");
export const loadTransfers = () => loadMockData<Transfer>("transfers.json");
export const loadDiscounts = () => loadMockData<Discount>("discounts.json");
export const loadAuditLogs = () => loadMockData<AuditLog>("audit-logs.json");
export const loadDataQualityIssues = () =>
  loadMockData<DataQualityIssue>("data-quality-issues.json");
export const loadNotifications = () => loadMockData<Notification>("notifications.json");
export const loadKpiSnapshots = () => loadMockData<KpiSnapshot>("kpi-snapshots.json");
