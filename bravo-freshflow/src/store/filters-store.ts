"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DateRangeKey = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export interface SavedView {
  id: string;
  name: string;
  storeIds: string[];
  categoryIds: string[];
  supplierIds: string[];
  riskLevels: string[];
  actionTypes: string[];
  statuses: string[];
  search: string;
}

interface FiltersState {
  dateRangeKey: DateRangeKey;
  customRange: { from: string | null; to: string | null };
  storeIds: string[];
  categoryIds: string[];
  supplierIds: string[];
  riskLevels: string[];
  actionTypes: string[];
  statuses: string[];
  search: string;
  savedViews: SavedView[];

  setDateRangeKey: (k: DateRangeKey) => void;
  setCustomRange: (r: { from: string | null; to: string | null }) => void;
  setStoreIds: (ids: string[]) => void;
  setCategoryIds: (ids: string[]) => void;
  setSupplierIds: (ids: string[]) => void;
  setRiskLevels: (ids: string[]) => void;
  setActionTypes: (ids: string[]) => void;
  setStatuses: (ids: string[]) => void;
  setSearch: (q: string) => void;
  clearAll: () => void;
  addSavedView: (v: Omit<SavedView, "id">) => SavedView;
  removeSavedView: (id: string) => void;
  applySavedView: (id: string) => void;
}

const EMPTY = {
  storeIds: [] as string[],
  categoryIds: [] as string[],
  supplierIds: [] as string[],
  riskLevels: [] as string[],
  actionTypes: [] as string[],
  statuses: [] as string[],
  search: "",
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set, get) => ({
      dateRangeKey: "30d",
      customRange: { from: null, to: null },
      ...EMPTY,
      savedViews: [],

      setDateRangeKey: (k) => set({ dateRangeKey: k }),
      setCustomRange: (r) => set({ customRange: r, dateRangeKey: "custom" }),
      setStoreIds: (ids) => set({ storeIds: ids }),
      setCategoryIds: (ids) => set({ categoryIds: ids }),
      setSupplierIds: (ids) => set({ supplierIds: ids }),
      setRiskLevels: (ids) => set({ riskLevels: ids }),
      setActionTypes: (ids) => set({ actionTypes: ids }),
      setStatuses: (ids) => set({ statuses: ids }),
      setSearch: (q) => set({ search: q }),
      clearAll: () => set({ ...EMPTY }),
      addSavedView: (v) => {
        const view: SavedView = { id: `sv-${Date.now()}`, ...v };
        set({ savedViews: [...get().savedViews, view] });
        return view;
      },
      removeSavedView: (id) => set({ savedViews: get().savedViews.filter((v) => v.id !== id) }),
      applySavedView: (id) => {
        const v = get().savedViews.find((x) => x.id === id);
        if (!v) return;
        set({
          storeIds: v.storeIds,
          categoryIds: v.categoryIds,
          supplierIds: v.supplierIds,
          riskLevels: v.riskLevels,
          actionTypes: v.actionTypes,
          statuses: v.statuses,
          search: v.search,
        });
      },
    }),
    {
      name: "bravo-filters",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
