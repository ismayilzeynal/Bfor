"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadProducts,
  loadRecommendations,
  loadStores,
  loadTransfers,
  loadUsers,
} from "@/lib/mock-loader";
import { useActionsStore } from "@/store/actions-store";
import type { Product, Recommendation, Store, Transfer, User } from "@/types";
import { applyTransferOverride, type TransferRow } from "./types";

interface RawData {
  transfers: Transfer[];
  products: Product[];
  stores: Store[];
  recommendations: Recommendation[];
  users: User[];
}

export function useTransfersData() {
  const [raw, setRaw] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const overrides = useActionsStore((s) => s.transferOverrides);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadTransfers(),
      loadProducts(),
      loadStores(),
      loadRecommendations(),
      loadUsers(),
    ]).then(([transfers, products, stores, recommendations, users]) => {
      if (cancelled) return;
      setRaw({ transfers, products, stores, recommendations, users });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<TransferRow[]>(() => {
    if (!raw) return [];
    const productById = new Map(raw.products.map((p) => [p.id, p]));
    const storeById = new Map(raw.stores.map((s) => [s.id, s]));
    const recById = new Map(raw.recommendations.map((r) => [r.id, r]));
    return raw.transfers.map((t) => {
      const override = overrides[t.id];
      const transfer = applyTransferOverride(t, override);
      return {
        transfer,
        product: productById.get(transfer.product_id),
        fromStore: storeById.get(transfer.from_store_id),
        toStore: storeById.get(transfer.to_store_id),
        recommendation: recById.get(transfer.recommendation_id),
        override,
      };
    });
  }, [raw, overrides]);

  return {
    loading,
    rows,
    stores: raw?.stores ?? [],
    users: raw?.users ?? [],
    products: raw?.products ?? [],
    recommendations: raw?.recommendations ?? [],
  };
}
