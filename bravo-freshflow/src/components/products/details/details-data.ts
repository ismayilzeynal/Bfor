import { parseISO } from "date-fns";
import {
  loadAuditLogs,
  loadCategories,
  loadInventoryBatches,
  loadInventorySnapshots,
  loadProducts,
  loadRecommendationScenarios,
  loadRecommendations,
  loadRiskPredictions,
  loadSales,
  loadStores,
  loadSuppliers,
  loadUsers,
  loadWasteRecords,
} from "@/lib/mock-loader";
import { MOCK_DATE } from "@/lib/constants";
import type {
  AuditLog,
  Category,
  InventoryBatch,
  InventorySnapshot,
  Product,
  Recommendation,
  RecommendationScenario,
  RiskPrediction,
  SalesAggregate,
  Store,
  Supplier,
  User,
  WasteRecord,
} from "@/types";

export interface CandidateTargetStore {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  avg_daily_sales: number;
}

export interface CandidateCompanion {
  id: string;
  name: string;
}

export interface ProductDetailsBundle {
  product: Product;
  store: Store;
  category: Category | undefined;
  supplier: Supplier | undefined;
  prediction: RiskPrediction | undefined;
  recommendation: Recommendation | undefined;
  scenarios: RecommendationScenario[];
  activeBatches: InventoryBatch[];
  snapshots: InventorySnapshot[];
  sales: SalesAggregate[];
  waste: WasteRecord[];
  audit: AuditLog[];
  users: User[];
  relatedProducts: Product[];
  relatedPredictionsByProduct: Map<string, RiskPrediction>;
  candidateTargetStores: CandidateTargetStore[];
  candidateCompanions: CandidateCompanion[];
}

const MOCK_TODAY = parseISO(`${MOCK_DATE}T00:00:00.000Z`);

export async function loadProductDetailsBundle(
  productId: string
): Promise<ProductDetailsBundle | null> {
  const [
    products,
    stores,
    categories,
    suppliers,
    predictions,
    recommendations,
    scenarios,
    batches,
    snapshots,
    sales,
    waste,
    audit,
    users,
  ] = await Promise.all([
    loadProducts(),
    loadStores(),
    loadCategories(),
    loadSuppliers(),
    loadRiskPredictions(),
    loadRecommendations(),
    loadRecommendationScenarios(),
    loadInventoryBatches(),
    loadInventorySnapshots(),
    loadSales(),
    loadWasteRecords(),
    loadAuditLogs(),
    loadUsers(),
  ]);

  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  const productPredictions = predictions.filter((p) => p.product_id === productId);
  const prediction = mostRecent(productPredictions, (p) => p.created_at);
  const productRecs = recommendations.filter((r) => r.product_id === productId);
  const recommendation = mostRecent(productRecs, (r) => r.created_at);
  const storeId = prediction?.store_id ?? recommendation?.store_id;
  const store =
    stores.find((s) => s.id === storeId) ?? stores.find((s) => s.is_active) ?? stores[0];
  if (!store) return null;

  const category = categories.find((c) => c.id === product.category_id);
  const supplier = suppliers.find((s) => s.id === product.supplier_id);

  const scenariosList = recommendation
    ? scenarios.filter((s) => s.recommendation_id === recommendation.id)
    : [];

  const activeBatches = batches.filter(
    (b) => b.product_id === productId && b.store_id === store.id && b.status === "active"
  );

  const productSnapshots = snapshots
    .filter((s) => s.product_id === productId && s.store_id === store.id)
    .sort((a, b) => a.snapshot_datetime.localeCompare(b.snapshot_datetime));

  const productSales = sales
    .filter((s) => s.product_id === productId && s.store_id === store.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const ninetyDaysAgo = new Date(MOCK_TODAY);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const productWaste = waste.filter((w) => {
    if (w.product_id !== productId) return false;
    try {
      return parseISO(w.recorded_at).getTime() >= ninetyDaysAgo.getTime();
    } catch {
      return false;
    }
  });

  const productAudit = audit
    .filter((a) => {
      if (a.entity_type === "product" && a.entity_id === productId) return true;
      if (a.entity_type === "recommendation" && recommendation && a.entity_id === recommendation.id)
        return true;
      return false;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const sameCategoryPredictions = predictions
    .filter((p) => p.product_id !== productId)
    .filter((p) => {
      const prod = products.find((x) => x.id === p.product_id);
      return prod?.category_id === product.category_id;
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  const seen = new Set<string>();
  const relatedProducts: Product[] = [];
  const relatedPredictionsByProduct = new Map<string, RiskPrediction>();
  for (const p of sameCategoryPredictions) {
    if (seen.has(p.product_id)) continue;
    seen.add(p.product_id);
    const prod = products.find((x) => x.id === p.product_id);
    if (!prod) continue;
    relatedProducts.push(prod);
    relatedPredictionsByProduct.set(prod.id, p);
    if (relatedProducts.length >= 6) break;
  }

  const candidateTargetStores: CandidateTargetStore[] = [];
  const sevenDaysAgo = new Date(MOCK_TODAY);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  for (const otherStore of stores) {
    if (otherStore.id === store.id || !otherStore.is_active) continue;
    const otherSales = sales.filter(
      (s) => s.product_id === productId && s.store_id === otherStore.id,
    );
    const recent = otherSales.filter((s) => {
      try {
        return parseISO(s.date).getTime() >= sevenDaysAgo.getTime();
      } catch {
        return false;
      }
    });
    const totalQty = recent.reduce((acc, s) => acc + s.quantity_sold, 0);
    const avgDaily = recent.length > 0 ? totalQty / 7 : 0;
    const latestSnap = snapshots
      .filter((s) => s.product_id === productId && s.store_id === otherStore.id)
      .sort((a, b) => b.snapshot_datetime.localeCompare(a.snapshot_datetime))[0];
    candidateTargetStores.push({
      id: otherStore.id,
      code: otherStore.code,
      name: otherStore.name,
      current_stock: latestSnap?.current_stock ?? 0,
      avg_daily_sales: round1(avgDaily || (prediction?.avg_daily_sales_7d ?? 0) * 1.5),
    });
  }
  candidateTargetStores.sort((a, b) => b.avg_daily_sales - a.avg_daily_sales);

  const candidateCompanions: CandidateCompanion[] = products
    .filter((p) => p.id !== productId && p.category_id === product.category_id && p.is_active)
    .slice(0, 8)
    .map((p) => ({ id: p.id, name: p.name }));

  return {
    product,
    store,
    category,
    supplier,
    prediction,
    recommendation,
    scenarios: scenariosList,
    activeBatches,
    snapshots: productSnapshots,
    sales: productSales,
    waste: productWaste,
    audit: productAudit,
    users,
    relatedProducts,
    relatedPredictionsByProduct,
    candidateTargetStores: candidateTargetStores.slice(0, 6),
    candidateCompanions,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mostRecent<T>(list: T[], getDate: (item: T) => string): T | undefined {
  if (list.length === 0) return undefined;
  return list.reduce((acc, cur) =>
    getDate(cur).localeCompare(getDate(acc)) > 0 ? cur : acc
  );
}

export function userById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}
