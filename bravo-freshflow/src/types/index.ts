export type Role =
  | "ceo"
  | "coo"
  | "cfo"
  | "cio"
  | "category_manager"
  | "purchase_manager"
  | "logistics_manager"
  | "store_manager"
  | "supervisor"
  | "employee";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type Priority = "low" | "medium" | "high" | "critical";

export type SalesTrend = "rising" | "stable" | "declining" | "very_weak";

export type WasteHistory = "none" | "low" | "medium" | "high";

export type StoreType = "hypermarket" | "supermarket" | "express";

export type Unit = "piece" | "kg" | "liter" | "pack";

export type StorageType = "ambient" | "chilled" | "frozen";

export type ReturnPolicy = "full" | "partial" | "none";

export type SourceSystem = "pos" | "erp" | "manual";

export type BatchStatus = "active" | "depleted" | "expired" | "returned";

export type WasteReason =
  | "expired"
  | "damaged"
  | "spoiled"
  | "shrinkage"
  | "supplier_return"
  | "other";

export type RecommendationType =
  | "no_action"
  | "monitor"
  | "stock_check"
  | "shelf_visibility"
  | "discount"
  | "transfer"
  | "combined"
  | "bundle"
  | "reorder_reduce"
  | "reorder_increase"
  | "supplier_review"
  | "return_to_supplier"
  | "campaign_add";

export type RecommendationStatus =
  | "generated"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "converted_to_task"
  | "completed"
  | "expired"
  | "failed";

export type ApprovalRole =
  | "store_manager"
  | "category_manager"
  | "logistics_manager"
  | "purchase_manager";

export type ScenarioType =
  | "no_action"
  | "discount"
  | "transfer"
  | "bundle"
  | "shelf_visibility"
  | "combined";

export type TaskType =
  | "apply_discount"
  | "prepare_transfer"
  | "stock_check"
  | "shelf_action"
  | "create_bundle"
  | "record_waste"
  | "supplier_followup";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected"
  | "expired"
  | "cancelled";

export type TransferStatus =
  | "suggested"
  | "approved"
  | "preparing"
  | "in_transit"
  | "received"
  | "completed"
  | "cancelled"
  | "failed";

export type DiscountStatus =
  | "suggested"
  | "approved"
  | "active"
  | "completed"
  | "rejected"
  | "expired";

export type AuditEntityType =
  | "recommendation"
  | "task"
  | "transfer"
  | "discount"
  | "product"
  | "data_issue";

export type DataQualityIssueType =
  | "missing_expiry"
  | "stock_mismatch"
  | "stale_inventory"
  | "no_sales_high_stock"
  | "inconsistent_batch"
  | "low_confidence_recommendation";

export type DataQualitySeverity = "low" | "medium" | "high";

export type DataQualityStatus = "open" | "investigating" | "resolved" | "ignored";

export type NotificationType =
  | "critical_risk"
  | "approval_needed"
  | "task_assigned"
  | "task_deadline_approaching"
  | "task_expired"
  | "transfer_pending"
  | "stock_mismatch"
  | "low_data_confidence"
  | "supplier_issue"
  | "result_ready";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  store_id: string | null;
  department: string;
  avatar_url: string | null;
  is_active: boolean;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  region: string;
  latitude: number;
  longitude: number;
  store_type: StoreType;
  size_sqm: number;
  avg_daily_customers: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
  risk_weight: number;
  is_perishable_category: boolean;
  icon: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  return_policy: ReturnPolicy;
  avg_delivery_days: number;
  damage_rate_pct: number;
  expiry_issue_rate_pct: number;
  on_time_delivery_pct: number;
  supplier_risk_score: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category_id: string;
  supplier_id: string;
  brand: string;
  unit: Unit;
  shelf_life_days: number;
  storage_type: StorageType;
  cost_price: number;
  sale_price: number;
  minimum_margin_pct: number;
  is_perishable: boolean;
  image_url: string | null;
  is_active: boolean;
}

export interface InventoryBatch {
  id: string;
  product_id: string;
  store_id: string;
  supplier_id: string;
  batch_code: string;
  received_date: string;
  expiry_date: string;
  received_quantity: number;
  remaining_quantity: number;
  cost_price: number;
  status: BatchStatus;
}

export interface InventorySnapshot {
  id: string;
  product_id: string;
  store_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  snapshot_datetime: string;
  source_system: SourceSystem;
  confidence_score: number;
}

export interface SalesAggregate {
  id: string;
  product_id: string;
  store_id: string;
  date: string;
  quantity_sold: number;
  avg_unit_price: number;
  total_amount: number;
  transactions_count: number;
}

export interface WasteRecord {
  id: string;
  product_id: string;
  store_id: string;
  batch_id: string;
  quantity: number;
  reason: WasteReason;
  value: number;
  recorded_by_user_id: string;
  recorded_at: string;
  note: string;
}

export interface RiskReasonFactors {
  expiry_score: number;
  stock_pressure_score: number;
  sales_velocity_score: number;
  waste_history_score: number;
  supplier_risk_score: number;
}

export interface RiskPrediction {
  id: string;
  product_id: string;
  store_id: string;
  batch_id: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  predicted_unsold_quantity: number;
  predicted_loss_value: number;
  main_reason: string;
  reason_factors: RiskReasonFactors;
  data_confidence_score: number;
  days_to_expiry: number;
  current_stock: number;
  avg_daily_sales_7d: number;
  sales_trend: SalesTrend;
  created_at: string;
}

export interface Recommendation {
  id: string;
  risk_prediction_id: string;
  product_id: string;
  store_id: string;
  recommendation_type: RecommendationType;
  recommendation_text: string;
  reason_text: string;
  expected_recovered_value: number;
  expected_cost: number;
  net_saved_value: number;
  confidence_score: number;
  priority: Priority;
  status: RecommendationStatus;
  requires_approval_by_role: ApprovalRole | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface RecommendationScenario {
  id: string;
  recommendation_id: string;
  scenario_type: ScenarioType;
  parameters: Record<string, unknown>;
  expected_sold_quantity: number;
  expected_recovered_value: number;
  discount_cost: number;
  transfer_cost: number;
  operational_cost: number;
  net_saved_value: number;
  confidence_score: number;
  is_recommended: boolean;
}

export interface Task {
  id: string;
  recommendation_id: string;
  assigned_to_user_id: string;
  store_id: string;
  product_id: string;
  title: string;
  description: string;
  task_type: TaskType;
  priority: Priority;
  status: TaskStatus;
  deadline: string;
  completed_at: string | null;
  completed_by_user_id: string | null;
  completion_note: string | null;
  proof_image_url: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  recommendation_id: string;
  product_id: string;
  from_store_id: string;
  to_store_id: string;
  quantity: number;
  transfer_cost: number;
  expected_sales_value: number;
  net_saved_value: number;
  status: TransferStatus;
  created_at: string;
  completed_at: string | null;
}

export interface Discount {
  id: string;
  recommendation_id: string;
  product_id: string;
  store_id: string;
  discount_pct: number;
  start_datetime: string;
  end_datetime: string;
  expected_sales_uplift_pct: number;
  minimum_margin_checked: boolean;
  current_margin_after_discount_pct: number;
  status: DiscountStatus;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  old_value: unknown | null;
  new_value: unknown | null;
  created_at: string;
  ip_address: string;
}

export interface DataQualityIssue {
  id: string;
  issue_type: DataQualityIssueType;
  severity: DataQualitySeverity;
  product_id: string | null;
  store_id: string | null;
  batch_id: string | null;
  description: string;
  status: DataQualityStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: Priority;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface KpiSnapshot {
  id: string;
  date: string;
  store_id: string | null;
  category_id: string | null;
  potential_loss: number;
  actual_loss: number;
  recovered_value: number;
  net_saved_value: number;
  waste_kg: number;
  recommendations_generated: number;
  recommendations_accepted: number;
  recommendations_rejected: number;
  tasks_created: number;
  tasks_completed: number;
  tasks_expired: number;
  transfers_completed: number;
  discounts_applied: number;
  avg_data_confidence: number;
  avg_stock_accuracy_pct: number;
}
