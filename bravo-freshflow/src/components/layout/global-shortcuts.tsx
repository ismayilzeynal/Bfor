"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUiStore } from "@/store/ui-store";
import { useCurrentUser } from "@/hooks/use-role";
import { ROLE_ALLOWED_ROUTES } from "@/lib/constants";

const G_TIMEOUT_MS = 1200;

interface RouteShortcut {
  trigger: string;
  href: string;
  label: string;
}

const ROUTE_SHORTCUTS: RouteShortcut[] = [
  { trigger: "d", href: "/executive", label: "Executive dashboard" },
  { trigger: "p", href: "/products", label: "Risky Products" },
  { trigger: "t", href: "/tasks", label: "Tasks" },
  { trigger: "w", href: "/whatif-lab", label: "What-If Lab" },
  { trigger: "a", href: "/analytics", label: "Analytics" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function GlobalShortcuts() {
  const router = useRouter();
  const user = useCurrentUser();
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setRoleSwitcherOpen = useUiStore((s) => s.setRoleSwitcherOpen);

  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const clearPending = () => {
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
        clearPending();
        return;
      }

      if (key === "g" || key === "G") {
        clearPending();
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, G_TIMEOUT_MS);
        return;
      }

      if (pendingG.current !== null) {
        const lower = key.toLowerCase();
        const match = ROUTE_SHORTCUTS.find((r) => r.trigger === lower);
        clearPending();
        if (!match) return;
        const allowed = ROLE_ALLOWED_ROUTES[user.role] ?? [];
        if (!allowed.includes(match.href)) {
          toast.warning(`${match.label} unavailable for ${user.role}`);
          return;
        }
        e.preventDefault();
        router.push(match.href);
        toast.message(`Go → ${match.label}`);
        return;
      }

      if (key === "n" || key === "N") {
        if (e.shiftKey) return;
        const allowed = ROLE_ALLOWED_ROUTES[user.role] ?? [];
        const canManage = allowed.includes("/tasks");
        if (!canManage) return;
        e.preventDefault();
        router.push("/tasks");
        toast.message("New task — opening Tasks manager");
        return;
      }

      if (key === "k" && !e.metaKey && !e.ctrlKey) {
        // covered by ⌘K in command palette; ignore plain k
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPending();
    };
  }, [router, user.role, setShortcutsOpen, setCommandPaletteOpen, setRoleSwitcherOpen]);

  return null;
}
