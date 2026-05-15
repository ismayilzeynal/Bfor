"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EMPTY_FILTERS, type RiskyFilters, type ViewMode } from "./types";
import type { RecommendationStatus, RecommendationType, RiskLevel } from "@/types";

function csv(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseFilters(params: URLSearchParams): RiskyFilters {
  return {
    search: params.get("q") ?? "",
    riskLevels: csv(params.get("risk")) as RiskLevel[],
    storeIds: csv(params.get("store")),
    categoryIds: csv(params.get("category")),
    supplierIds: csv(params.get("supplier")),
    actionTypes: csv(params.get("action")) as RecommendationType[],
    statuses: csv(params.get("status")) as RecommendationStatus[],
    expiryFrom: params.get("expFrom"),
    expiryTo: params.get("expTo"),
    riskMin: Number(params.get("riskMin") ?? "0"),
    riskMax: Number(params.get("riskMax") ?? "100"),
    confMin: Number(params.get("confMin") ?? "0"),
    confMax: Number(params.get("confMax") ?? "100"),
  };
}

function serializeFilters(f: RiskyFilters, view: ViewMode): string {
  const params = new URLSearchParams();
  if (view !== "table") params.set("view", view);
  if (f.search.trim()) params.set("q", f.search.trim());
  if (f.riskLevels.length) params.set("risk", f.riskLevels.join(","));
  if (f.storeIds.length) params.set("store", f.storeIds.join(","));
  if (f.categoryIds.length) params.set("category", f.categoryIds.join(","));
  if (f.supplierIds.length) params.set("supplier", f.supplierIds.join(","));
  if (f.actionTypes.length) params.set("action", f.actionTypes.join(","));
  if (f.statuses.length) params.set("status", f.statuses.join(","));
  if (f.expiryFrom) params.set("expFrom", f.expiryFrom);
  if (f.expiryTo) params.set("expTo", f.expiryTo);
  if (f.riskMin > 0) params.set("riskMin", String(f.riskMin));
  if (f.riskMax < 100) params.set("riskMax", String(f.riskMax));
  if (f.confMin > 0) params.set("confMin", String(f.confMin));
  if (f.confMax < 100) params.set("confMax", String(f.confMax));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export interface UrlFiltersState {
  filters: RiskyFilters;
  setFilters: (next: RiskyFilters | ((prev: RiskyFilters) => RiskyFilters)) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  reset: () => void;
}

export function useUrlFilters(): UrlFiltersState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = (searchParams.get("view") as ViewMode) || "table";
  const [filters, setFiltersState] = useState<RiskyFilters>(() => parseFilters(searchParams));
  const [view, setViewState] = useState<ViewMode>(initialView);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setFiltersState(parseFilters(searchParams));
    setViewState(((searchParams.get("view") as ViewMode) || "table"));
  }, [searchParams]);

  const pushUrl = useCallback(
    (next: RiskyFilters, v: ViewMode) => {
      const qs = serializeFilters(next, v);
      router.replace(`/products${qs}`, { scroll: false });
    },
    [router]
  );

  const setFilters = useCallback(
    (next: RiskyFilters | ((prev: RiskyFilters) => RiskyFilters)) => {
      setFiltersState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        pushUrl(value, view);
        return value;
      });
    },
    [pushUrl, view]
  );

  const setView = useCallback(
    (v: ViewMode) => {
      setViewState(v);
      pushUrl(filters, v);
    },
    [filters, pushUrl]
  );

  const reset = useCallback(() => {
    setFiltersState(EMPTY_FILTERS);
    pushUrl(EMPTY_FILTERS, view);
  }, [pushUrl, view]);

  return useMemo(
    () => ({ filters, setFilters, view, setView, reset }),
    [filters, setFilters, view, setView, reset]
  );
}
