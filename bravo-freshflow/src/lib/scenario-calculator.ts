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
 *  Action satış məbləği     = actionSold × salePrice × (1 − discountPct)
 *
 * Each scenario derives `actionSold` correctly:
 *  - discount: lifted velocity × days, all units locally
 *  - transfer: remaining local that still sells + units sold at target (full price)
 *  - combined: target sales + remaining local with discount
 *  - no_action: baseline local sales only
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
  // Money
  K: number; // Action olmazsa itki = baselineUnsold × costPrice
  G: number; // Action sonrası ziyan = actionUnsold × costPrice
  /**
   * Action ziyan azaltması (loss reduction) = K − (G + actionCost)
   * — money we keep by acting, net of any hard action cost like transfer fees.
   */
  lossReduction: number;
  /**
   * Action satış məbləği = actionSold × salePrice × (1 − discountPct)
   * For transfer-only (no discount applied) the discount factor is 0.
   */
  actionRevenue: number;
  actionCost: number; // hard cost of action (transfer fees etc.)
  effectiveDiscountPct: number; // discount applied to actionSold (0 for pure transfer / no_action)
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
  const baselineSold = Math.min(stock, baseline.avgDailySales * baseline.daysToExpiry);
  const baselineUnsold = Math.max(0, stock - baselineSold);

  let actionSold = baselineSold;
  let actionCost = 0;
  let effectiveDiscountPct = 0; // applied to actionSold for revenue

  if (scenario === "discount") {
    const lift = liftFor(p.discountPct);
    const liftedVelocity = baseline.avgDailySales * lift;
    actionSold = Math.min(stock, liftedVelocity * baseline.daysToExpiry);
    actionCost = 0;
    effectiveDiscountPct = p.discountPct;
  } else if (scenario === "transfer") {
    const transferQty = Math.min(p.transferQty, stock);
    const localRemain = Math.max(0, stock - transferQty);
    const localSoldAfter = Math.min(localRemain, baseline.avgDailySales * baseline.daysToExpiry);
    const targetSold = Math.min(transferQty, p.targetVelocity * baseline.daysToExpiry);
    actionSold = localSoldAfter + targetSold;
    actionCost = 8 + 0.05 * transferQty; // freight
    effectiveDiscountPct = 0; // no discount in pure transfer
  } else if (scenario === "combined") {
    const transferQty = Math.min(p.transferQty, stock);
    const localRemain = Math.max(0, stock - transferQty);
    const lift = liftFor(p.discountPct);
    const liftedVelocity = baseline.avgDailySales * lift;
    const localSoldDiscount = Math.min(localRemain, liftedVelocity * baseline.daysToExpiry);
    const targetSold = Math.min(transferQty, p.targetVelocity * baseline.daysToExpiry);
    actionSold = localSoldDiscount + targetSold;
    actionCost = 8 + 0.05 * transferQty;
    // Apply discount factor to the total sold for a single unified formula
    effectiveDiscountPct = p.discountPct;
  } else {
    actionSold = baselineSold;
    actionCost = 0;
    effectiveDiscountPct = 0;
  }

  // Unified Action satış məbləği = actionSold × salePrice × (1 − effectiveDiscountPct)
  const actionRevenue = actionSold * baseline.salePrice * (1 - effectiveDiscountPct);

  const actionUnsold = Math.max(0, stock - actionSold);
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
