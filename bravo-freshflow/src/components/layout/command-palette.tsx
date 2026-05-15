"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_GROUPS, ROLE_ALLOWED_ROUTES, ROLE_LABELS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-role";
import { useUiStore } from "@/store/ui-store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { usePlatformKeys } from "@/hooks/use-platform";
import {
  loadProducts,
  loadRiskPredictions,
  loadStores,
  loadTasks,
} from "@/lib/mock-loader";
import type { Product, RiskPrediction, Store, Task } from "@/types";
import { NavIcon } from "./nav-icon";
import { Sparkles, PackageSearch, ListChecks, ArrowRightLeft } from "lucide-react";

export function CommandPalette() {
  const router = useRouter();
  const user = useCurrentUser();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setRoleSwitcherOpen = useUiStore((s) => s.setRoleSwitcherOpen);
  const { mod, shift } = usePlatformKeys();

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [risks, setRisks] = useState<RiskPrediction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useKeyboardShortcut({ key: "k", meta: true }, () => setOpen(!open));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([loadProducts(), loadStores(), loadRiskPredictions(), loadTasks()]).then(
      ([p, s, r, t]) => {
        if (cancelled) return;
        setProducts(p);
        setStores(s);
        setRisks(r);
        setTasks(t);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const allowed = ROLE_ALLOWED_ROUTES[user.role] ?? [];
  const navItems = useMemo(
    () =>
      NAV_GROUPS.flatMap((g) => g.items).filter((i) => allowed.includes(i.href)),
    [allowed]
  );

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const topRisky = useMemo(
    () =>
      [...risks]
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 5)
        .map((r) => ({
          risk: r,
          product: productMap.get(r.product_id),
          store: storeMap.get(r.store_id),
        }))
        .filter((x) => x.product && x.store),
    [risks, productMap, storeMap]
  );

  const myTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.assigned_to_user_id === user.id && t.status !== "completed" && t.status !== "expired")
        .slice(0, 5),
    [tasks, user.id]
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, products, tasks..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Pages">
          {navItems.map((item) => (
            <CommandItem key={item.href} value={`page ${item.label}`} onSelect={() => go(item.href)}>
              <NavIcon name={item.icon} className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.href}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {topRisky.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Top Risky Products">
              {topRisky.map(({ risk, product, store }) => (
                <CommandItem
                  key={risk.id}
                  value={`risky ${product!.name} ${store!.name}`}
                  onSelect={() => go(`/products/${product!.id}`)}
                >
                  <PackageSearch className="mr-2 h-4 w-4 text-orange-600" />
                  <span className="truncate">{product!.name}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{store!.code}</span>
                  <span className="ml-auto font-mono text-xs text-orange-600">{risk.risk_score}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {myTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="My Tasks">
              {myTasks.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`task ${t.title}`}
                  onSelect={() => go("/my-tasks")}
                >
                  <ListChecks className="mr-2 h-4 w-4 text-indigo-600" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{t.priority}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem
            value="action switch role"
            onSelect={() => {
              setOpen(false);
              setRoleSwitcherOpen(true);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Switch role…</span>
            <span className="ml-auto rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {mod}{shift}R
            </span>
            <span className="ml-2 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </CommandItem>
          <CommandItem value="action notifications" onSelect={() => go("/notifications")}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            <span>Open notifications inbox</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
