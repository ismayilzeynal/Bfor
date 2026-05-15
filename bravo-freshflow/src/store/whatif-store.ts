"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ScenarioType } from "@/types";

export interface WhatIfSnapshot {
  id: string;
  saved_at: string;
  label: string;
  product_id: string | null;
  product_name: string;
  store_id: string | null;
  store_code: string;
  baseline: {
    currentStock: number;
    avgDailySales: number;
    daysToExpiry: number;
    costPrice: number;
    salePrice: number;
    minimumMarginPct: number;
    dataConfidence: number;
  };
  params: {
    discountPct: number;
    transferQty: number;
    transferTargetStoreId: string | null;
    bundleDiscountPct: number;
  };
  selected: ScenarioType;
}

interface WhatIfState {
  snapshots: WhatIfSnapshot[];
  saveSnapshot: (snap: Omit<WhatIfSnapshot, "id" | "saved_at">) => WhatIfSnapshot;
  removeSnapshot: (id: string) => void;
  clearSnapshots: () => void;
}

export const useWhatIfStore = create<WhatIfState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      saveSnapshot: (snap) => {
        const entry: WhatIfSnapshot = {
          ...snap,
          id: `wif-${Date.now()}`,
          saved_at: new Date().toISOString(),
        };
        set({ snapshots: [entry, ...get().snapshots].slice(0, 20) });
        return entry;
      },
      removeSnapshot: (id) => set({ snapshots: get().snapshots.filter((s) => s.id !== id) }),
      clearSnapshots: () => set({ snapshots: [] }),
    }),
    {
      name: "bravo-whatif",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
