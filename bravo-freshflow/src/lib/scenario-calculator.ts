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

export interface ImpactView {
  potentialLoss: number;
  recoveredValue: number;
  riskBeforePct: number;
  riskAfterPct: number;
}

/**
 * Computes the same impact numbers shown in the What-If Before/After panel.
 * Used by Action Impact Animation + Rescue Mode so all surfaces are aligned.
 */
export function computeImpactView(
  baseline: ScenarioBaseline,
  result: ScenarioResult
): ImpactView {
  const stock = baseline.currentStock;
  const baselineSold = Math.min(stock, baseline.avgDailySales * baseline.daysToExpiry);
  const baselineUnsold = Math.max(0, stock - baselineSold);
  const potentialLoss = baselineUnsold * baseline.costPrice;

  const sold = result.expectedSold;
  const unsoldAfter = Math.max(0, stock - sold);

  const riskBeforePct = stock > 0 ? (baselineUnsold / stock) * 100 : 0;
  const riskAfterPct = stock > 0 ? (unsoldAfter / stock) * 100 : 0;

  return {
    potentialLoss,
    recoveredValue: result.recoveredValue,
    riskBeforePct,
    riskAfterPct,
  };
}

/**
 * Default combined scenario result mirroring What-If's defaults
 * (20% discount + optimal transfer qty + target velocity = local × 1.5).
 */
export function defaultCombinedResult(baseline: ScenarioBaseline): ScenarioResult {
  const targetVelocity = baseline.avgDailySales * 1.5;
  const optimalQty = Math.max(
    1,
    Math.min(baseline.currentStock, Math.round(targetVelocity * baseline.daysToExpiry))
  );
  return calcCombined(baseline, {
    discountPct: 0.2,
    transferQty: optimalQty,
    targetStoreAvgDailySales: targetVelocity,
  });
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
