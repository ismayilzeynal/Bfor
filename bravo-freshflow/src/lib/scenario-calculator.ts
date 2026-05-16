import { DISCOUNT_UPLIFT_MAP, HISTORICAL_ACTION_SUCCESS_RATE } from "@/lib/constants";
import type { ScenarioType } from "@/types";

export interface ScenarioBaseline {
  currentStock: number;
  avgDailySales: number;
  daysToExpiry: number;
  costPrice: number;
  salePrice: number;
  minimumMarginPct: number;
  dataConfidence: number;
}

export interface ScenarioResult {
  scenarioType: ScenarioType;
  expectedSold: number;
  recoveredValue: number;
  discountCost: number;
  transferCost: number;
  operationalCost: number;
  netSaved: number;
  confidenceScore: number;
  marginBreached?: boolean;
  notViable?: boolean;
  notViableReason?: string;
}

function baselineRevenue(b: ScenarioBaseline): number {
  return b.avgDailySales * b.daysToExpiry * b.salePrice;
}

/**
 * Single source of truth for all displayed numbers across the app:
 *
 *  K = Action olmazsa itki  = baselineUnsold × costPrice
 *  G = Action sonrası ziyan = actionUnsold × costPrice
 *  Action ziyan azaltması   = K − (G + actionCost)
 *
 * Per-scenario formulas (integer counts → formula text matches values exactly):
 *  - discount:
 *      actionSold     = floor(min(stock, liftedVelocity × days))
 *      actionUnsold   = stock − actionSold
 *      actionRevenue  = actionSold × salePrice × (1 − discountPct)
 *  - transfer:
 *      actionUnsold   = max(0, baselineUnsold − transferQty)
 *      actionSold     = stock − actionUnsold          (= baselineSold + transferQty, capped)
 *      actionRevenue  = actionSold × salePrice
 *  - combined:
 *      actionUnsold   = max(0, baselineUnsold − transferQty)
 *      actionSold     = transferQty + localSoldDiscount
 *      actionRevenue  = transferQty × salePrice + localSoldDiscount × discountedPrice
 *  - no_action:
 *      actionSold     = baselineSold
 *      actionRevenue  = baselineSold × salePrice
 */
export interface ScenarioImpact {
  scenario: ScenarioType;
  // Stock-level
  stock: number;
  baselineSold: number;
  baselineUnsold: number;
  actionSold: number;
  actionUnsold: number;
  productsSaved: number; // actionSold − baselineSold (units we rescued)
  // Per-scenario breakdown (for revenue formula display)
  transferQty: number;        // 0 for discount / no_action
  localSoldDiscount: number;  // 0 for transfer / no_action; for combined = local units sold with discount
  discountedPrice: number;    // salePrice × (1 − effectiveDiscountPct)
  // Money
  K: number; // Action olmazsa itki = baselineUnsold × costPrice
  G: number; // Action sonrası ziyan = actionUnsold × costPrice
  /**
   * Action ziyan azaltması (loss reduction) = K − (G + actionCost)
   * — money we keep by acting, net of any hard action cost like transfer fees.
   */
  lossReduction: number;
  actionRevenue: number;
  actionCost: number; // hard cost of action (transfer fees etc.)
  effectiveDiscountPct: number; // discount applied (0 for pure transfer / no_action)
  // Risk %
  riskBeforePct: number;
  riskAfterPct: number;
  riskReductionPct: number;
}

export interface ScenarioParams {
  discountPct?: number; // 0..1
  transferQty?: number;
  targetVelocity?: number;
}

const DEFAULT_DISCOUNT_PCT = 0.2;
const TRANSFER_TARGET_MULTIPLIER = 1.5;

export function defaultParams(baseline: ScenarioBaseline): Required<ScenarioParams> {
  const targetVelocity = baseline.avgDailySales * TRANSFER_TARGET_MULTIPLIER;
  const optimalQty = Math.max(
    1,
    Math.min(
      baseline.currentStock,
      Math.round(targetVelocity * baseline.daysToExpiry)
    )
  );
  return {
    discountPct: DEFAULT_DISCOUNT_PCT,
    transferQty: optimalQty,
    targetVelocity,
  };
}

export function computeScenarioImpact(
  baseline: ScenarioBaseline,
  scenario: ScenarioType,
  paramsIn?: ScenarioParams
): ScenarioImpact {
  const p = { ...defaultParams(baseline), ...paramsIn };
  const stock = baseline.currentStock;
  // Integer counts so the displayed formula matches the computed value exactly.
  const baselineSold = Math.min(stock, Math.floor(baseline.avgDailySales * baseline.daysToExpiry));
  const baselineUnsold = Math.max(0, stock - baselineSold);

  let actionSold: number;
  let actionUnsold: number;
  let actionRevenue = 0;
  let actionCost = 0;
  let effectiveDiscountPct = 0;
  let transferQtyOut = 0;
  let localSoldDiscount = 0;

  if (scenario === "discount") {
    const lift = liftFor(p.discountPct);
    const liftedVelocity = baseline.avgDailySales * lift;
    actionSold = Math.min(stock, Math.floor(liftedVelocity * baseline.daysToExpiry));
    actionUnsold = Math.max(0, stock - actionSold);
    actionRevenue = actionSold * baseline.salePrice * (1 - p.discountPct);
    actionCost = 0;
    effectiveDiscountPct = p.discountPct;
  } else if (scenario === "transfer") {
    const transferQty = Math.min(p.transferQty, stock);
    // User formula: G uses (baselineUnsold − transferQty) × cost
    actionUnsold = Math.max(0, baselineUnsold - transferQty);
    actionSold = stock - actionUnsold; // = baselineSold + transferQty when transferQty ≤ baselineUnsold
    actionRevenue = actionSold * baseline.salePrice; // no discount in pure transfer
    actionCost = 8 + 0.05 * transferQty;
    effectiveDiscountPct = 0;
    transferQtyOut = transferQty;
  } else if (scenario === "combined") {
    const transferQty = Math.min(p.transferQty, stock);
    const localRemain = Math.max(0, stock - transferQty);
    const lift = liftFor(p.discountPct);
    const liftedVelocity = baseline.avgDailySales * lift;
    localSoldDiscount = Math.min(localRemain, Math.floor(liftedVelocity * baseline.daysToExpiry));
    // User formula: G uses (baselineUnsold − transferQty) × cost (transfer is the unsold-saver)
    actionUnsold = Math.max(0, baselineUnsold - transferQty);
    // Total sold displayed = transferred + locally sold under discount
    actionSold = transferQty + localSoldDiscount;
    // User revenue formula: transferQty × salePrice + localSoldDiscount × discountedPrice
    const discountedPrice = baseline.salePrice * (1 - p.discountPct);
    actionRevenue = transferQty * baseline.salePrice + localSoldDiscount * discountedPrice;
    actionCost = 8 + 0.05 * transferQty;
    effectiveDiscountPct = p.discountPct;
    transferQtyOut = transferQty;
  } else {
    actionSold = baselineSold;
    actionUnsold = baselineUnsold;
    actionRevenue = baselineSold * baseline.salePrice;
    actionCost = 0;
    effectiveDiscountPct = 0;
  }

  const discountedPrice = baseline.salePrice * (1 - effectiveDiscountPct);
  const K = baselineUnsold * baseline.costPrice;
  const G = actionUnsold * baseline.costPrice;
  // Action ziyan azaltması = K − (G + actionCost)
  const lossReduction = K - (G + actionCost);
  const productsSaved = Math.max(0, actionSold - baselineSold);
  const riskBeforePct = stock > 0 ? (baselineUnsold / stock) * 100 : 0;
  const riskAfterPct = stock > 0 ? (actionUnsold / stock) * 100 : 0;
  const riskReductionPct = Math.max(0, riskBeforePct - riskAfterPct);

  return {
    scenario,
    stock,
    baselineSold,
    baselineUnsold,
    actionSold,
    actionUnsold,
    productsSaved,
    transferQty: transferQtyOut,
    localSoldDiscount,
    discountedPrice,
    K,
    G,
    lossReduction,
    actionRevenue,
    actionCost,
    effectiveDiscountPct,
    riskBeforePct,
    riskAfterPct,
    riskReductionPct,
  };
}

/** Pick the scenario with the highest net gain across discount/transfer/combined. */
export function recommendedScenarioFor(
  baseline: ScenarioBaseline,
  paramsIn?: ScenarioParams
): "discount" | "transfer" | "combined" {
  const types: Array<"discount" | "transfer" | "combined"> = [
    "discount",
    "transfer",
    "combined",
  ];
  let best: "discount" | "transfer" | "combined" = "combined";
  let bestVal = -Infinity;
  // Transfer not viable if days_to_expiry <= 1 — skip
  const skipTransfer = baseline.daysToExpiry <= 1;
  for (const t of types) {
    if (skipTransfer && (t === "transfer" || t === "combined")) continue;
    const i = computeScenarioImpact(baseline, t, paramsIn);
    if (i.lossReduction > bestVal) {
      bestVal = i.lossReduction;
      best = t;
    }
  }
  return best;
}

function confidence(scenario: ScenarioType, dataConfidence: number): number {
  const success = HISTORICAL_ACTION_SUCCESS_RATE[scenario];
  return Math.round((0.6 * (dataConfidence / 100) + 0.4 * success) * 100);
}

function liftFor(pct: number): number {
  if (pct in DISCOUNT_UPLIFT_MAP) return DISCOUNT_UPLIFT_MAP[pct];
  const keys = Object.keys(DISCOUNT_UPLIFT_MAP)
    .map(Number)
    .sort((a, b) => a - b);
  for (const k of keys) {
    if (pct <= k) return DISCOUNT_UPLIFT_MAP[k];
  }
  return DISCOUNT_UPLIFT_MAP[0.5];
}

export function calcNoAction(b: ScenarioBaseline): ScenarioResult {
  const expectedSold = b.avgDailySales * b.daysToExpiry;
  const recovered = expectedSold * b.salePrice;
  return {
    scenarioType: "no_action",
    expectedSold,
    recoveredValue: round2(recovered),
    discountCost: 0,
    transferCost: 0,
    operationalCost: 0,
    netSaved: 0,
    confidenceScore: confidence("no_action", b.dataConfidence),
  };
}

export interface DiscountParams {
  discountPct: number;
}

export function calcDiscount(b: ScenarioBaseline, p: DiscountParams): ScenarioResult {
  const uplift = liftFor(p.discountPct);
  const effectiveVelocity = b.avgDailySales * uplift;
  const expectedSold = Math.min(b.currentStock, effectiveVelocity * b.daysToExpiry);
  const discountedPrice = b.salePrice * (1 - p.discountPct);
  const grossRevenue = expectedSold * discountedPrice;
  const discountCost = expectedSold * b.salePrice * p.discountPct;
  const operationalCost = 2.0 * (expectedSold / 100);
  const baseline = baselineRevenue(b);
  const netSaved = grossRevenue - discountCost - operationalCost - baseline;

  const margin = (discountedPrice - b.costPrice) / discountedPrice;
  const marginBreached = margin < b.minimumMarginPct;

  return {
    scenarioType: "discount",
    expectedSold: round2(expectedSold),
    recoveredValue: round2(grossRevenue),
    discountCost: round2(discountCost),
    transferCost: 0,
    operationalCost: round2(operationalCost),
    netSaved: round2(netSaved),
    confidenceScore: confidence("discount", b.dataConfidence),
    marginBreached,
  };
}

export interface TransferParams {
  transferQty: number;
  targetStoreAvgDailySales: number;
}

export function calcTransfer(b: ScenarioBaseline, p: TransferParams): ScenarioResult {
  const expectedSoldAtTarget = Math.min(p.transferQty, p.targetStoreAvgDailySales * b.daysToExpiry);
  const grossRevenue = expectedSoldAtTarget * b.salePrice;
  const transferCost = 8.0 + 0.05 * p.transferQty;
  const operationalCost = 3.0;
  const baselineLocal =
    Math.min(p.transferQty, b.avgDailySales * b.daysToExpiry) * b.salePrice;
  const netSaved = grossRevenue - transferCost - operationalCost - baselineLocal;

  const notViable = b.daysToExpiry <= 1 || transferCost > grossRevenue;
  const reason =
    b.daysToExpiry <= 1
      ? "Expiry too close for transfer"
      : transferCost > grossRevenue
      ? "Transfer cost exceeds recovery"
      : undefined;

  return {
    scenarioType: "transfer",
    expectedSold: round2(expectedSoldAtTarget),
    recoveredValue: round2(grossRevenue),
    discountCost: 0,
    transferCost: round2(transferCost),
    operationalCost: round2(operationalCost),
    netSaved: round2(netSaved),
    confidenceScore: confidence("transfer", b.dataConfidence),
    notViable,
    notViableReason: reason,
  };
}

export interface BundleParams {
  bundleDiscountPct: number;
}

export function calcBundle(b: ScenarioBaseline, p: BundleParams): ScenarioResult {
  const uplift = 1.4;
  const effectiveVelocity = b.avgDailySales * uplift;
  const expectedSold = Math.min(b.currentStock, effectiveVelocity * b.daysToExpiry);
  const discountedPrice = b.salePrice * (1 - p.bundleDiscountPct);
  const grossRevenue = expectedSold * discountedPrice;
  const discountCost = expectedSold * b.salePrice * p.bundleDiscountPct * 0.5;
  const operationalCost = 1.5 * (expectedSold / 100);
  const baseline = baselineRevenue(b);
  const netSaved = grossRevenue - discountCost - operationalCost - baseline;

  const margin = (discountedPrice - b.costPrice) / discountedPrice;
  const marginBreached = margin < b.minimumMarginPct;

  return {
    scenarioType: "bundle",
    expectedSold: round2(expectedSold),
    recoveredValue: round2(grossRevenue),
    discountCost: round2(discountCost),
    transferCost: 0,
    operationalCost: round2(operationalCost),
    netSaved: round2(netSaved),
    confidenceScore: confidence("bundle", b.dataConfidence),
    marginBreached,
  };
}

export function calcShelfVisibility(b: ScenarioBaseline): ScenarioResult {
  const uplift = 1.2;
  const expectedSold = Math.min(b.currentStock, b.avgDailySales * uplift * b.daysToExpiry);
  const grossRevenue = expectedSold * b.salePrice;
  const operationalCost = 1.0;
  const baseline = baselineRevenue(b);
  const netSaved = grossRevenue - operationalCost - baseline;

  return {
    scenarioType: "shelf_visibility",
    expectedSold: round2(expectedSold),
    recoveredValue: round2(grossRevenue),
    discountCost: 0,
    transferCost: 0,
    operationalCost: round2(operationalCost),
    netSaved: round2(netSaved),
    confidenceScore: confidence("shelf_visibility", b.dataConfidence),
  };
}

export interface CombinedParams {
  discountPct: number;
  transferQty: number;
  targetStoreAvgDailySales: number;
}

export function calcCombined(b: ScenarioBaseline, p: CombinedParams): ScenarioResult {
  const transferQty = Math.min(p.transferQty, b.currentStock);
  const localStock = Math.max(0, b.currentStock - transferQty);

  const transferRes = calcTransfer(
    { ...b, currentStock: transferQty },
    { transferQty, targetStoreAvgDailySales: p.targetStoreAvgDailySales },
  );

  const discountRes = calcDiscount(
    { ...b, currentStock: localStock },
    { discountPct: p.discountPct },
  );

  const recoveredValue = transferRes.recoveredValue + discountRes.recoveredValue;
  const discountCost = discountRes.discountCost;
  const transferCost = transferRes.transferCost;
  const operationalCost = transferRes.operationalCost + discountRes.operationalCost;
  const expectedSold = transferRes.expectedSold + discountRes.expectedSold;
  const baseline = baselineRevenue(b);
  const netSaved = recoveredValue - discountCost - transferCost - operationalCost - baseline;

  return {
    scenarioType: "combined",
    expectedSold: round2(expectedSold),
    recoveredValue: round2(recoveredValue),
    discountCost: round2(discountCost),
    transferCost: round2(transferCost),
    operationalCost: round2(operationalCost),
    netSaved: round2(netSaved),
    confidenceScore: confidence("combined", b.dataConfidence),
    marginBreached: discountRes.marginBreached,
    notViable: transferRes.notViable,
    notViableReason: transferRes.notViableReason,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
