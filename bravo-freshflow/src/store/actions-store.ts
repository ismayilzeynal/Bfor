"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Task, Transfer, Discount, AuditLog } from "@/types";

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

interface ActionsState {
  decisions: PendingApproval[];
  appliedActions: AppliedAction[];
  auditEntries: AuditLog[];

  approve: (input: Omit<PendingApproval, "decision" | "decided_at"> & { decided_at?: string }) => PendingApproval;
  reject: (input: Omit<PendingApproval, "decision" | "decided_at"> & { decided_at?: string }) => PendingApproval;
  recordAction: (a: Omit<AppliedAction, "id" | "decided_at"> & { decided_at?: string }) => AppliedAction;
  appendAudit: (entry: AuditLog) => void;
  decisionFor: (recommendationId: string) => PendingApproval | undefined;
  reset: () => void;
}

export const useActionsStore = create<ActionsState>()(
  persist(
    (set, get) => ({
      decisions: [],
      appliedActions: [],
      auditEntries: [],

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
      reset: () => set({ decisions: [], appliedActions: [], auditEntries: [] }),
    }),
    {
      name: "bravo-actions",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
