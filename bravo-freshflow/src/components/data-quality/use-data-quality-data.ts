"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadDataQualityIssues,
  loadInventorySnapshots,
  loadKpiSnapshots,
  loadProducts,
  loadStores,
} from "@/lib/mock-loader";
import { useActionsStore } from "@/store/actions-store";
import type {
  DataQualityIssue,
  InventorySnapshot,
  KpiSnapshot,
  Product,
  Store,
} from "@/types";
import type { IssueRow } from "./types";

interface State {
  loading: boolean;
  issues: DataQualityIssue[];
  products: Product[];
  stores: Store[];
  snapshots: InventorySnapshot[];
  kpiSnapshots: KpiSnapshot[];
}

export function useDataQualityData() {
  const [state, setState] = useState<State>({
    loading: true,
    issues: [],
    products: [],
    stores: [],
    snapshots: [],
    kpiSnapshots: [],
  });
  const issueOverrides = useActionsStore((s) => s.issueOverrides);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadDataQualityIssues(),
      loadProducts(),
      loadStores(),
      loadInventorySnapshots(),
      loadKpiSnapshots(),
    ]).then(([issues, products, stores, snapshots, kpiSnapshots]) => {
      if (cancelled) return;
      setState({ loading: false, issues, products, stores, snapshots, kpiSnapshots });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<IssueRow[]>(() => {
    const productById = new Map(state.products.map((p) => [p.id, p]));
    const storeById = new Map(state.stores.map((s) => [s.id, s]));
    return state.issues.map((issue) => {
      const override = issueOverrides[issue.id];
      const effectiveStatus = override?.status ?? issue.status;
      const effectiveResolvedAt = override?.resolved_at ?? issue.resolved_at ?? null;
      return {
        issue,
        override,
        effectiveStatus,
        effectiveResolvedAt,
        product: issue.product_id ? productById.get(issue.product_id) ?? null : null,
        store: issue.store_id ? storeById.get(issue.store_id) ?? null : null,
      };
    });
  }, [state.issues, state.products, state.stores, issueOverrides]);

  return {
    loading: state.loading,
    rows,
    products: state.products,
    stores: state.stores,
    snapshots: state.snapshots,
    kpiSnapshots: state.kpiSnapshots,
  };
}
