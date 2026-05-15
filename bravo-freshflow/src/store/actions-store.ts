"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Task,
  TaskStatus,
  Transfer,
  Discount,
  AuditLog,
  Priority,
  TransferStatus,
  DiscountStatus,
  DataQualityStatus,
} from "@/types";

export type ApprovalDecision = "approved" | "rejected";

export interface PendingApproval {
  recommendation_id: string;
  decision: ApprovalDecision;
  user_id: string;
  note: string | null;
  reason_codes?: string[];
  decided_at: string;
}

export interface AppliedAction {
  id: string;
  recommendation_id: string;
  product_id: string;
  store_id: string;
  action_type: string;
  decided_by: string;
  decided_at: string;
  generated_tasks: Task[];
  generated_transfers: Transfer[];
  generated_discounts: Discount[];
}

export interface TaskOverride {
  status?: TaskStatus;
  priority?: Priority;
  deadline?: string;
  assigned_to_user_id?: string;
  completed_at?: string | null;
  completed_by_user_id?: string | null;
  completion_note?: string | null;
  proof_image_url?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type TransferApprovalRole = "source_manager" | "target_manager" | "logistics";

export interface TransferApproval {
  role: TransferApprovalRole;
  user_id: string;
  approved_at: string;
}

export interface TransferOverride {
  status?: TransferStatus;
  completed_at?: string | null;
  rejection_reason?: string | null;
  approvals?: TransferApproval[];
}

export interface DiscountOverride {
  status?: DiscountStatus;
  discount_pct?: number;
  start_datetime?: string;
  end_datetime?: string;
  current_margin_after_discount_pct?: number;
  minimum_margin_checked?: boolean;
  override_below_margin?: boolean;
  rejection_reason?: string | null;
}

export interface IssueOverride {
  status?: DataQualityStatus;
  resolved_at?: string | null;
  resolution_note?: string | null;
  resolved_by_user_id?: string | null;
}

interface ActionsState {
  decisions: PendingApproval[];
  appliedActions: AppliedAction[];
  auditEntries: AuditLog[];
  taskOverrides: Record<string, TaskOverride>;
  taskComments: Record<string, TaskComment[]>;
  transferOverrides: Record<string, TransferOverride>;
  discountOverrides: Record<string, DiscountOverride>;
  issueOverrides: Record<string, IssueOverride>;

  approve: (input: Omit<PendingApproval, "decision" | "decided_at"> & { decided_at?: string }) => PendingApproval;
  reject: (input: Omit<PendingApproval, "decision" | "decided_at"> & { decided_at?: string }) => PendingApproval;
  recordAction: (a: Omit<AppliedAction, "id" | "decided_at"> & { decided_at?: string }) => AppliedAction;
  appendAudit: (entry: AuditLog) => void;
  decisionFor: (recommendationId: string) => PendingApproval | undefined;
  updateTaskStatus: (
    taskId: string,
    status: TaskStatus,
    extras?: { note?: string | null; proofUrl?: string | null; userId?: string }
  ) => void;
  setTaskOverride: (taskId: string, patch: TaskOverride) => void;
  addTaskComment: (input: Omit<TaskComment, "id" | "created_at"> & { id?: string; created_at?: string }) => TaskComment;
  setTransferOverride: (transferId: string, patch: TransferOverride) => void;
  approveTransferStep: (transferId: string, role: TransferApprovalRole, userId: string) => void;
  setTransferStatus: (
    transferId: string,
    status: TransferStatus,
    extras?: { completedAt?: string | null; rejectionReason?: string | null }
  ) => void;
  setDiscountOverride: (discountId: string, patch: DiscountOverride) => void;
  setDiscountStatus: (
    discountId: string,
    status: DiscountStatus,
    extras?: { rejectionReason?: string | null }
  ) => void;
  setIssueOverride: (issueId: string, patch: IssueOverride) => void;
  setIssueStatus: (
    issueId: string,
    status: DataQualityStatus,
    extras?: { note?: string | null; userId?: string }
  ) => void;
  reset: () => void;
}

export const useActionsStore = create<ActionsState>()(
  persist(
    (set, get) => ({
      decisions: [],
      appliedActions: [],
      auditEntries: [],
      taskOverrides: {},
      taskComments: {},
      transferOverrides: {},
      discountOverrides: {},
      issueOverrides: {},

      approve: (input) => {
        const entry: PendingApproval = {
          ...input,
          decision: "approved",
          decided_at: input.decided_at ?? new Date().toISOString(),
        };
        set({
          decisions: [...get().decisions.filter((d) => d.recommendation_id !== entry.recommendation_id), entry],
        });
        return entry;
      },
      reject: (input) => {
        const entry: PendingApproval = {
          ...input,
          decision: "rejected",
          decided_at: input.decided_at ?? new Date().toISOString(),
        };
        set({
          decisions: [...get().decisions.filter((d) => d.recommendation_id !== entry.recommendation_id), entry],
        });
        return entry;
      },
      recordAction: (a) => {
        const action: AppliedAction = {
          id: `act-${Date.now()}`,
          decided_at: a.decided_at ?? new Date().toISOString(),
          ...a,
        };
        set({ appliedActions: [...get().appliedActions, action] });
        return action;
      },
      appendAudit: (entry) => set({ auditEntries: [...get().auditEntries, entry] }),
      decisionFor: (recommendationId) =>
        get().decisions.find((d) => d.recommendation_id === recommendationId),
      updateTaskStatus: (taskId, status, extras) => {
        const now = new Date().toISOString();
        const prev = get().taskOverrides[taskId] ?? {};
        const patch: TaskOverride = { ...prev, status };
        if (status === "completed") {
          patch.completed_at = now;
          if (extras?.userId) patch.completed_by_user_id = extras.userId;
          if (extras?.note !== undefined) patch.completion_note = extras.note;
          if (extras?.proofUrl !== undefined) patch.proof_image_url = extras.proofUrl;
        }
        if (status !== "completed") {
          patch.completed_at = null;
          patch.completed_by_user_id = null;
        }
        set({ taskOverrides: { ...get().taskOverrides, [taskId]: patch } });
      },
      setTaskOverride: (taskId, patch) => {
        const prev = get().taskOverrides[taskId] ?? {};
        set({ taskOverrides: { ...get().taskOverrides, [taskId]: { ...prev, ...patch } } });
      },
      addTaskComment: (input) => {
        const entry: TaskComment = {
          id: input.id ?? `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: input.created_at ?? new Date().toISOString(),
          task_id: input.task_id,
          user_id: input.user_id,
          body: input.body,
        };
        const list = get().taskComments[entry.task_id] ?? [];
        set({
          taskComments: { ...get().taskComments, [entry.task_id]: [...list, entry] },
        });
        return entry;
      },
      setTransferOverride: (transferId, patch) => {
        const prev = get().transferOverrides[transferId] ?? {};
        set({
          transferOverrides: {
            ...get().transferOverrides,
            [transferId]: { ...prev, ...patch },
          },
        });
      },
      approveTransferStep: (transferId, role, userId) => {
        const prev = get().transferOverrides[transferId] ?? {};
        const existing = prev.approvals ?? [];
        if (existing.some((a) => a.role === role)) return;
        const approvals: TransferApproval[] = [
          ...existing,
          { role, user_id: userId, approved_at: new Date().toISOString() },
        ];
        set({
          transferOverrides: {
            ...get().transferOverrides,
            [transferId]: { ...prev, approvals },
          },
        });
      },
      setTransferStatus: (transferId, status, extras) => {
        const prev = get().transferOverrides[transferId] ?? {};
        const patch: TransferOverride = { ...prev, status };
        if (status === "completed") patch.completed_at = extras?.completedAt ?? new Date().toISOString();
        if (status === "cancelled" || status === "failed") {
          patch.rejection_reason = extras?.rejectionReason ?? null;
        }
        set({
          transferOverrides: { ...get().transferOverrides, [transferId]: patch },
        });
      },
      setDiscountOverride: (discountId, patch) => {
        const prev = get().discountOverrides[discountId] ?? {};
        set({
          discountOverrides: {
            ...get().discountOverrides,
            [discountId]: { ...prev, ...patch },
          },
        });
      },
      setDiscountStatus: (discountId, status, extras) => {
        const prev = get().discountOverrides[discountId] ?? {};
        const patch: DiscountOverride = { ...prev, status };
        if (status === "rejected") patch.rejection_reason = extras?.rejectionReason ?? null;
        set({
          discountOverrides: { ...get().discountOverrides, [discountId]: patch },
        });
      },
      setIssueOverride: (issueId, patch) => {
        const prev = get().issueOverrides[issueId] ?? {};
        set({
          issueOverrides: { ...get().issueOverrides, [issueId]: { ...prev, ...patch } },
        });
      },
      setIssueStatus: (issueId, status, extras) => {
        const prev = get().issueOverrides[issueId] ?? {};
        const patch: IssueOverride = { ...prev, status };
        if (status === "resolved") {
          patch.resolved_at = new Date().toISOString();
          if (extras?.note !== undefined) patch.resolution_note = extras.note;
          if (extras?.userId) patch.resolved_by_user_id = extras.userId;
        } else if (status === "ignored") {
          patch.resolved_at = new Date().toISOString();
          if (extras?.userId) patch.resolved_by_user_id = extras.userId;
        } else {
          patch.resolved_at = null;
          patch.resolution_note = null;
          patch.resolved_by_user_id = null;
        }
        set({ issueOverrides: { ...get().issueOverrides, [issueId]: patch } });
      },
      reset: () =>
        set({
          decisions: [],
          appliedActions: [],
          auditEntries: [],
          taskOverrides: {},
          taskComments: {},
          transferOverrides: {},
          discountOverrides: {},
          issueOverrides: {},
        }),
    }),
    {
      name: "bravo-actions",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
