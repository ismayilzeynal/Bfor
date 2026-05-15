import { parseISO } from "date-fns";
import type {
  Priority,
  Product,
  Recommendation,
  Role,
  Store,
  Task,
  TaskStatus,
  TaskType,
  User,
} from "@/types";
import type { PendingApproval, TaskOverride } from "@/store/actions-store";

export interface TaskRow {
  task: Task;
  product: Product | undefined;
  store: Store | undefined;
  assignee: User | undefined;
  recommendation: Recommendation | undefined;
  override: TaskOverride | undefined;
  source: "seed" | "generated";
}

export type ManagerTab = "pending" | "in_progress" | "completed_today" | "expired" | "all";

export const MANAGER_TAB_ORDER: ManagerTab[] = [
  "pending",
  "in_progress",
  "completed_today",
  "expired",
  "all",
];

export const MANAGER_TAB_LABELS: Record<ManagerTab, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed_today: "Completed Today",
  expired: "Expired",
  all: "All",
};

export type ManagerView = "table" | "calendar" | "workload";

export interface ManagerFilters {
  search: string;
  storeIds: string[];
  assigneeIds: string[];
  priorities: Priority[];
  taskTypes: TaskType[];
  statuses: TaskStatus[];
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_MANAGER_FILTERS: ManagerFilters = {
  search: "",
  storeIds: [],
  assigneeIds: [],
  priorities: [],
  taskTypes: [],
  statuses: [],
  dateFrom: null,
  dateTo: null,
};

export function activeManagerFilterCount(f: ManagerFilters): number {
  let n = 0;
  if (f.search.trim()) n += 1;
  if (f.storeIds.length) n += 1;
  if (f.assigneeIds.length) n += 1;
  if (f.priorities.length) n += 1;
  if (f.taskTypes.length) n += 1;
  if (f.statuses.length) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  return n;
}

export function applyOverride(task: Task, override: TaskOverride | undefined): Task {
  if (!override) return task;
  return {
    ...task,
    status: override.status ?? task.status,
    priority: override.priority ?? task.priority,
    deadline: override.deadline ?? task.deadline,
    assigned_to_user_id: override.assigned_to_user_id ?? task.assigned_to_user_id,
    completed_at: override.completed_at !== undefined ? override.completed_at : task.completed_at,
    completed_by_user_id:
      override.completed_by_user_id !== undefined
        ? override.completed_by_user_id
        : task.completed_by_user_id,
    completion_note:
      override.completion_note !== undefined ? override.completion_note : task.completion_note,
    proof_image_url:
      override.proof_image_url !== undefined ? override.proof_image_url : task.proof_image_url,
  };
}

function isPastDeadline(task: Task, now: Date): boolean {
  try {
    return parseISO(task.deadline).getTime() < now.getTime();
  } catch {
    return false;
  }
}

export function withExpirySweep(task: Task, now: Date): Task {
  if (task.status === "completed" || task.status === "cancelled" || task.status === "expired") {
    return task;
  }
  if (isPastDeadline(task, now)) {
    return { ...task, status: "expired" };
  }
  return task;
}

const TASK_TYPE_FROM_REC: Record<string, TaskType> = {
  discount: "apply_discount",
  transfer: "prepare_transfer",
  stock_check: "stock_check",
  shelf_visibility: "shelf_action",
  bundle: "create_bundle",
  reorder_reduce: "supplier_followup",
  reorder_increase: "supplier_followup",
  supplier_review: "supplier_followup",
  return_to_supplier: "supplier_followup",
  campaign_add: "shelf_action",
  monitor: "stock_check",
  no_action: "stock_check",
};

const REC_TITLE_AZ: Record<string, string> = {
  apply_discount: "Endirim tətbiq et",
  prepare_transfer: "Transfer hazırla",
  stock_check: "Stok yoxlaması apar",
  shelf_action: "Rəf yerləşdirməsi düzəlt",
  create_bundle: "Paket aksiyası qur",
  record_waste: "İtkini qeydə al",
  supplier_followup: "Təchizatçı ilə əlaqə",
};

export function generatedTasksFor(
  rec: Recommendation,
  product: Product | undefined,
  decision: PendingApproval,
  defaultAssignee: string
): Task[] {
  const taskType = TASK_TYPE_FROM_REC[rec.recommendation_type] ?? "stock_check";
  const titlePrefix = REC_TITLE_AZ[taskType] ?? "Tapşırıq";
  const productName = product?.name ?? "Məhsul";
  const decidedAt = decision.decided_at;
  const deadline = new Date(parseISO(decidedAt).getTime() + 6 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: `gen-${rec.id}-1`,
      recommendation_id: rec.id,
      assigned_to_user_id: defaultAssignee,
      store_id: rec.store_id,
      product_id: rec.product_id,
      title: `${titlePrefix}: ${productName}`,
      description: rec.recommendation_text,
      task_type: taskType,
      priority: rec.priority,
      status: "pending",
      deadline,
      completed_at: null,
      completed_by_user_id: null,
      completion_note: null,
      proof_image_url: null,
      created_at: decidedAt,
    },
  ];
}

export function scopeTasksByRole(rows: TaskRow[], user: User): TaskRow[] {
  switch (user.role) {
    case "employee":
      return rows.filter((r) => r.task.assigned_to_user_id === user.id);
    case "supervisor":
    case "store_manager":
      if (!user.store_id) return rows;
      return rows.filter((r) => r.task.store_id === user.store_id);
    case "logistics_manager":
      return rows.filter(
        (r) => r.task.task_type === "prepare_transfer" || !user.store_id || r.task.store_id === user.store_id
      );
    default:
      return rows;
  }
}

export function applyManagerFilters(rows: TaskRow[], f: ManagerFilters): TaskRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(({ task, product, store, assignee }) => {
    if (q) {
      const hay = `${task.title} ${product?.name ?? ""} ${product?.sku ?? ""} ${store?.code ?? ""} ${assignee?.full_name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.storeIds.length && !f.storeIds.includes(task.store_id)) return false;
    if (f.assigneeIds.length && !f.assigneeIds.includes(task.assigned_to_user_id)) return false;
    if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
    if (f.taskTypes.length && !f.taskTypes.includes(task.task_type)) return false;
    if (f.statuses.length && !f.statuses.includes(task.status)) return false;
    if (f.dateFrom || f.dateTo) {
      const iso = task.deadline.slice(0, 10);
      if (f.dateFrom && iso < f.dateFrom) return false;
      if (f.dateTo && iso > f.dateTo) return false;
    }
    return true;
  });
}

export function matchesManagerTab(task: Task, tab: ManagerTab, now: Date): boolean {
  if (tab === "all") return true;
  if (tab === "pending") return task.status === "pending" || task.status === "assigned";
  if (tab === "in_progress") return task.status === "in_progress";
  if (tab === "completed_today") {
    if (task.status !== "completed" || !task.completed_at) return false;
    const completedISO = task.completed_at.slice(0, 10);
    const todayISO = now.toISOString().slice(0, 10);
    return completedISO === todayISO;
  }
  if (tab === "expired") return task.status === "expired";
  return true;
}

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  apply_discount: "Percent",
  prepare_transfer: "Truck",
  stock_check: "PackageSearch",
  shelf_action: "Layers",
  create_bundle: "Boxes",
  record_waste: "Trash2",
  supplier_followup: "Phone",
};

export function priorityWeight(priority: Priority): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function urgencyTone(hoursRemaining: number, status: TaskStatus): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "expired" || status === "cancelled" || status === "rejected") {
    return "bg-zinc-200 text-zinc-600";
  }
  if (hoursRemaining < 0) return "bg-red-100 text-red-700";
  if (hoursRemaining < 1) return "bg-red-100 text-red-700 animate-pulse";
  if (hoursRemaining < 4) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function priorityStripColor(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

const SHELF_AREAS = ["Süd reyonu", "Çörək rəfi", "Quru qida rəfi", "Soyuducu", "Dondurucu", "Konditer rəfi"];
const SHELF_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function deriveLocation(productId: string, storeId: string): string {
  const seed = `${productId}${storeId}`.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const area = SHELF_AREAS[seed % SHELF_AREAS.length];
  const num = SHELF_NUMBERS[(seed * 7) % SHELF_NUMBERS.length];
  return `${area}, rəf ${num}`;
}
