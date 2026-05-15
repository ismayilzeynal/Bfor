"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadProducts,
  loadRecommendations,
  loadStores,
  loadTasks,
  loadUsers,
} from "@/lib/mock-loader";
import type { Product, Recommendation, Store, Task, User } from "@/types";
import { useActionsStore } from "@/store/actions-store";
import {
  applyOverride,
  generatedTasksFor,
  withExpirySweep,
  type TaskRow,
} from "./types";

interface RawData {
  tasks: Task[];
  products: Product[];
  stores: Store[];
  users: User[];
  recommendations: Recommendation[];
}

export function useTasksData() {
  const [raw, setRaw] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  const decisions = useActionsStore((s) => s.decisions);
  const taskOverrides = useActionsStore((s) => s.taskOverrides);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [tasks, products, stores, users, recommendations] = await Promise.all([
        loadTasks(),
        loadProducts(),
        loadStores(),
        loadUsers(),
        loadRecommendations(),
      ]);
      if (!alive) return;
      setRaw({ tasks, products, stores, users, recommendations });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo<TaskRow[]>(() => {
    if (!raw) return [];
    const productMap = new Map(raw.products.map((p) => [p.id, p]));
    const storeMap = new Map(raw.stores.map((s) => [s.id, s]));
    const userMap = new Map(raw.users.map((u) => [u.id, u]));
    const recMap = new Map(raw.recommendations.map((r) => [r.id, r]));

    const baseRows: TaskRow[] = raw.tasks.map((task) => {
      const override = taskOverrides[task.id];
      const merged = withExpirySweep(applyOverride(task, override), now);
      return {
        task: merged,
        product: productMap.get(task.product_id),
        store: storeMap.get(task.store_id),
        assignee: userMap.get(task.assigned_to_user_id),
        recommendation: recMap.get(task.recommendation_id),
        override,
        source: "seed",
      };
    });

    const seedIds = new Set(raw.tasks.map((t) => t.id));
    const generatedRows: TaskRow[] = [];
    for (const decision of decisions) {
      if (decision.decision !== "approved") continue;
      const rec = recMap.get(decision.recommendation_id);
      if (!rec) continue;
      const product = productMap.get(rec.product_id);
      const store = storeMap.get(rec.store_id);
      const fallbackAssignee = pickAssignee(raw.users, store);
      const tasks = generatedTasksFor(rec, product, decision, fallbackAssignee);
      for (const task of tasks) {
        if (seedIds.has(task.id)) continue;
        const override = taskOverrides[task.id];
        const merged = withExpirySweep(applyOverride(task, override), now);
        generatedRows.push({
          task: merged,
          product,
          store,
          assignee: userMap.get(merged.assigned_to_user_id),
          recommendation: rec,
          override,
          source: "generated",
        });
      }
    }

    return [...generatedRows, ...baseRows];
  }, [raw, decisions, taskOverrides, now]);

  return { rows, loading, now, raw };
}

function pickAssignee(users: User[], store: Store | undefined): string {
  if (store) {
    const inStore = users.find((u) => u.store_id === store.id && u.role === "employee");
    if (inStore) return inStore.id;
    const supervisor = users.find((u) => u.store_id === store.id && u.role === "supervisor");
    if (supervisor) return supervisor.id;
    const manager = users.find((u) => u.store_id === store.id && u.role === "store_manager");
    if (manager) return manager.id;
  }
  const anyEmployee = users.find((u) => u.role === "employee");
  return anyEmployee?.id ?? users[0]?.id ?? "u-001";
}
