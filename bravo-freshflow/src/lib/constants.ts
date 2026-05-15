import type {
  Role,
  RiskLevel,
  Priority,
  RecommendationStatus,
  RecommendationType,
  TaskStatus,
  TaskType,
  TransferStatus,
  DiscountStatus,
  ScenarioType,
  DataQualitySeverity,
  DataQualityStatus,
  DataQualityIssueType,
  NotificationType,
  SalesTrend,
  StorageType,
  Unit,
  StoreType,
} from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  ceo: "CEO",
  coo: "COO",
  cfo: "CFO",
  cio: "CIO",
  category_manager: "Category Manager",
  purchase_manager: "Purchase Manager",
  logistics_manager: "Logistics Manager",
  store_manager: "Store Manager",
  supervisor: "Supervisor",
  employee: "Employee",
};

export const ROLE_GROUPS = {
  leadership: ["ceo", "coo", "cfo", "cio"] as Role[],
  management: ["category_manager", "purchase_manager", "logistics_manager"] as Role[],
  store_operations: ["store_manager", "supervisor", "employee"] as Role[],
};

export const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  ceo: "/executive",
  coo: "/executive",
  cfo: "/analytics",
  cio: "/data-quality",
  category_manager: "/products",
  purchase_manager: "/recommendations",
  logistics_manager: "/transfers",
  store_manager: "/operations",
  supervisor: "/tasks",
  employee: "/my-tasks",
};

const ALL_ROUTES = [
  "/executive",
  "/operations",
  "/products",
  "/recommendations",
  "/tasks",
  "/my-tasks",
  "/transfers",
  "/discounts",
  "/analytics",
  "/data-quality",
  "/whatif-lab",
  "/notifications",
  "/audit-log",
  "/settings",
];

export const ROLE_ALLOWED_ROUTES: Record<Role, string[]> = {
  ceo: ALL_ROUTES,
  coo: ALL_ROUTES,
  cfo: ALL_ROUTES,
  cio: ALL_ROUTES,
  category_manager: [
    "/products",
    "/recommendations",
    "/whatif-lab",
    "/analytics",
    "/notifications",
    "/audit-log",
    "/settings",
  ],
  purchase_manager: [
    "/recommendations",
    "/analytics",
    "/notifications",
    "/audit-log",
    "/settings",
  ],
  logistics_manager: [
    "/transfers",
    "/tasks",
    "/notifications",
    "/audit-log",
    "/settings",
  ],
  store_manager: [
    "/operations",
    "/products",
    "/recommendations",
    "/tasks",
    "/transfers",
    "/discounts",
    "/notifications",
    "/settings",
  ],
  supervisor: [
    "/operations",
    "/tasks",
    "/my-tasks",
    "/notifications",
    "/settings",
  ],
  employee: ["/my-tasks", "/notifications", "/settings"],
};

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  roles: Role[] | "all";
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    roles: "all",
    items: [
      { href: "/executive", label: "Executive", icon: "LayoutDashboard" },
      { href: "/operations", label: "Operations", icon: "Activity" },
    ],
  },
  {
    label: "Loss Prevention",
    roles: "all",
    items: [
      { href: "/products", label: "Risky Products", icon: "PackageSearch" },
      { href: "/recommendations", label: "Recommendations", icon: "Sparkles" },
      { href: "/whatif-lab", label: "What-If Lab", icon: "FlaskConical" },
    ],
  },
  {
    label: "Action Queue",
    roles: "all",
    items: [
      { href: "/tasks", label: "Tasks", icon: "ListTodo" },
      { href: "/my-tasks", label: "My Tasks", icon: "ClipboardCheck" },
      { href: "/transfers", label: "Transfers", icon: "Truck" },
      { href: "/discounts", label: "Discounts", icon: "Percent" },
    ],
  },
  {
    label: "Insights",
    roles: "all",
    items: [
      { href: "/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/data-quality", label: "Data Quality", icon: "Database" },
    ],
  },
  {
    label: "System",
    roles: "all",
    items: [
      { href: "/notifications", label: "Notifications", icon: "Bell" },
      { href: "/audit-log", label: "Audit Log", icon: "ScrollText" },
      { href: "/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const RISK_LEVEL_CLASSES: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  generated: "Generated",
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  converted_to_task: "Task Created",
  completed: "Completed",
  expired: "Expired",
  failed: "Failed",
};

export const RECOMMENDATION_STATUS_CLASSES: Record<RecommendationStatus, string> = {
  generated: "bg-slate-100 text-slate-700",
  pending_approval: "bg-slate-100 text-slate-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  converted_to_task: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  expired: "bg-zinc-200 text-zinc-600",
  failed: "bg-rose-100 text-rose-700",
};

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  no_action: "No Action",
  monitor: "Monitor",
  stock_check: "Stock Check",
  shelf_visibility: "Shelf Visibility",
  discount: "Discount",
  transfer: "Transfer",
  bundle: "Bundle",
  reorder_reduce: "Reduce Reorder",
  reorder_increase: "Increase Reorder",
  supplier_review: "Supplier Review",
  return_to_supplier: "Return to Supplier",
  campaign_add: "Add to Campaign",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  expired: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  apply_discount: "Apply Discount",
  prepare_transfer: "Prepare Transfer",
  stock_check: "Stock Check",
  shelf_action: "Shelf Action",
  create_bundle: "Create Bundle",
  record_waste: "Record Waste",
  supplier_followup: "Supplier Follow-up",
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  suggested: "Suggested",
  approved: "Approved",
  preparing: "Preparing",
  in_transit: "In Transit",
  received: "Received",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const TRANSFER_STATUS_CLASSES: Record<TransferStatus, string> = {
  suggested: "bg-slate-100 text-slate-700",
  approved: "bg-blue-100 text-blue-700",
  preparing: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  received: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-200 text-zinc-600",
  failed: "bg-rose-100 text-rose-700",
};

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  suggested: "Suggested",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  rejected: "Rejected",
  expired: "Expired",
};

export const DISCOUNT_STATUS_CLASSES: Record<DiscountStatus, string> = {
  suggested: "bg-slate-100 text-slate-700",
  approved: "bg-blue-100 text-blue-700",
  active: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  expired: "bg-zinc-200 text-zinc-600",
};

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  no_action: "No Action",
  discount: "Discount",
  transfer: "Transfer",
  bundle: "Bundle",
  shelf_visibility: "Shelf Visibility",
  combined: "Combined",
};

export const DATA_QUALITY_SEVERITY_LABELS: Record<DataQualitySeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const DATA_QUALITY_STATUS_LABELS: Record<DataQualityStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  ignored: "Ignored",
};

export const DATA_QUALITY_ISSUE_TYPE_LABELS: Record<DataQualityIssueType, string> = {
  missing_expiry: "Missing Expiry",
  stock_mismatch: "Stock Mismatch",
  stale_inventory: "Stale Inventory",
  no_sales_high_stock: "No Sales / High Stock",
  inconsistent_batch: "Inconsistent Batch",
  low_confidence_recommendation: "Low Confidence",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  critical_risk: "Critical Risk",
  approval_needed: "Approval Needed",
  task_assigned: "Task Assigned",
  task_deadline_approaching: "Deadline Approaching",
  task_expired: "Task Expired",
  transfer_pending: "Transfer Pending",
  stock_mismatch: "Stock Mismatch",
  low_data_confidence: "Low Data Confidence",
  supplier_issue: "Supplier Issue",
  result_ready: "Result Ready",
};

export const SALES_TREND_LABELS: Record<SalesTrend, string> = {
  rising: "Rising",
  stable: "Stable",
  declining: "Declining",
  very_weak: "Very Weak",
};

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  ambient: "Ambient",
  chilled: "Chilled",
  frozen: "Frozen",
};

export const UNIT_LABELS: Record<Unit, string> = {
  piece: "pc",
  kg: "kg",
  liter: "L",
  pack: "pack",
};

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  hypermarket: "Hypermarket",
  supermarket: "Supermarket",
  express: "Express",
};

export const MOCK_DATE = "2026-05-15";

export const RISK_WEIGHTS = {
  expiry: 0.35,
  stock_pressure: 0.3,
  sales_velocity: 0.2,
  waste_history: 0.1,
  supplier_risk: 0.05,
} as const;

export const DISCOUNT_UPLIFT_MAP: Record<number, number> = {
  0.1: 1.3,
  0.15: 1.6,
  0.2: 1.9,
  0.25: 2.1,
  0.3: 2.4,
  0.4: 2.8,
  0.5: 3.2,
};

export const HISTORICAL_ACTION_SUCCESS_RATE: Record<ScenarioType, number> = {
  no_action: 0.7,
  discount: 0.85,
  transfer: 0.8,
  bundle: 0.78,
  shelf_visibility: 0.72,
  combined: 0.88,
};
