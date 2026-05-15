"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadDiscounts,
  loadProducts,
  loadRecommendations,
  loadStores,
} from "@/lib/mock-loader";
import { useActionsStore } from "@/store/actions-store";
import type { Discount, Product, Recommendation, Store } from "@/types";
import {
  applyDiscountOverride,
  isLive,
  isMarginBreached,
  todayMockDate,
  type DiscountRow,
} from "./types";

interface RawData {
  discounts: Discount[];
  products: Product[];
  stores: Store[];
  recommendations: Recommendation[];
}

export function useDiscountsData() {
  const [raw, setRaw] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const overrides = useActionsStore((s) => s.discountOverrides);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadDiscounts(),
      loadProducts(),
      loadStores(),
      loadRecommendations(),
    ]).then(([discounts, products, stores, recommendations]) => {
      if (cancelled) return;
      setRaw({ discounts, products, stores, recommendations });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<DiscountRow[]>(() => {
    if (!raw) return [];
    const productById = new Map(raw.products.map((p) => [p.id, p]));
    const storeById = new Map(raw.stores.map((s) => [s.id, s]));
    const recById = new Map(raw.recommendations.map((r) => [r.id, r]));
    const now = todayMockDate();
    return raw.discounts.map((d) => {
      const override = overrides[d.id];
      const discount = applyDiscountOverride(d, override);
      const product = productById.get(discount.product_id);
      return {
        discount,
        product,
        store: storeById.get(discount.store_id),
        recommendation: recById.get(discount.recommendation_id),
        override,
        marginBreached: isMarginBreached(discount, product),
        isLiveNow: isLive(discount, now),
      };
    });
  }, [raw, overrides]);

  return {
    loading,
    rows,
    stores: raw?.stores ?? [],
    products: raw?.products ?? [],
    recommendations: raw?.recommendations ?? [],
  };
}
