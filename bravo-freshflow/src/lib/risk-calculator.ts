import { RISK_WEIGHTS } from "@/lib/constants";
import type { RiskLevel, RiskReasonFactors, SalesTrend, WasteHistory } from "@/types";

export function expiryScore(daysToExpiry: number): number {
  if (daysToExpiry <= 1) return 100;
  if (daysToExpiry <= 2) return 85;
  if (daysToExpiry <= 3) return 70;
  if (daysToExpiry <= 5) return 50;
  return 20;
}

export function stockPressureScore(predictedUnsoldQty: number, currentStock: number): number {
  if (currentStock <= 0) return 0;
  const ratio = predictedUnsoldQty / currentStock;
  if (ratio <= 0) return 0;
  if (ratio <= 0.2) return 30;
  if (ratio <= 0.4) return 55;
  if (ratio <= 0.6) return 75;
  return 95;
}

export function salesVelocityScore(trend: SalesTrend): number {
  switch (trend) {
    case "rising":
      return 20;
    case "stable":
      return 40;
    case "declining":
      return 75;
    case "very_weak":
      return 90;
  }
}

export function wasteHistoryScore(history: WasteHistory): number {
  switch (history) {
    case "none":
      return 10;
    case "low":
      return 35;
    case "medium":
      return 60;
    case "high":
      return 85;
  }
}

export interface RiskInputs {
  daysToExpiry: number;
  predictedUnsoldQty: number;
  currentStock: number;
  salesTrend: SalesTrend;
  wasteHistory: WasteHistory;
  supplierRiskScore: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskReasonFactors;
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

export function calculateRisk(input: RiskInputs): RiskResult {
  const factors: RiskReasonFactors = {
    expiry_score: expiryScore(input.daysToExpiry),
    stock_pressure_score: stockPressureScore(input.predictedUnsoldQty, input.currentStock),
    sales_velocity_score: salesVelocityScore(input.salesTrend),
    waste_history_score: wasteHistoryScore(input.wasteHistory),
    supplier_risk_score: clamp(input.supplierRiskScore, 0, 100),
  };

  const score =
    factors.expiry_score * RISK_WEIGHTS.expiry +
    factors.stock_pressure_score * RISK_WEIGHTS.stock_pressure +
    factors.sales_velocity_score * RISK_WEIGHTS.sales_velocity +
    factors.waste_history_score * RISK_WEIGHTS.waste_history +
    factors.supplier_risk_score * RISK_WEIGHTS.supplier_risk;

  const rounded = Math.round(score * 10) / 10;
  return { score: rounded, level: riskLevel(rounded), factors };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
