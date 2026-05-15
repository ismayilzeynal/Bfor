"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadAuditLogs,
  loadUsers,
  loadProducts,
  loadStores,
} from "@/lib/mock-loader";
import { useActionsStore } from "@/store/actions-store";
import type { AuditLog, Product, Store, User } from "@/types";

export interface AuditDataState {
  loading: boolean;
  baseLogs: AuditLog[];
  liveLogs: AuditLog[];
  combined: AuditLog[];
  users: User[];
  products: Product[];
  stores: Store[];
}

export function useAuditData(): AuditDataState {
  const [loading, setLoading] = useState(true);
  const [baseLogs, setBaseLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const liveLogs = useActionsStore((s) => s.auditEntries);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAuditLogs(), loadUsers(), loadProducts(), loadStores()]).then(
      ([logs, u, p, s]) => {
        if (cancelled) return;
        setBaseLogs(logs);
        setUsers(u);
        setProducts(p);
        setStores(s);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const combined = useMemo(() => {
    const all = [...baseLogs, ...liveLogs];
    return all
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [baseLogs, liveLogs]);

  return { loading, baseLogs, liveLogs, combined, users, products, stores };
}
