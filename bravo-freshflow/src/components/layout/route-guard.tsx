"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/constants";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth-store";

export function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, canAccess, defaultRoute } = usePermissions();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const lastRedirectedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!pathname) return;
    if (canAccess(pathname)) return;
    const key = `${user.role}:${pathname}`;
    if (lastRedirectedFor.current === key) return;
    lastRedirectedFor.current = key;
    toast.warning(`${ROLE_LABELS[user.role]} can't access this page`, {
      description: `Redirecting to ${defaultRoute}`,
    });
    router.replace(defaultRoute);
  }, [pathname, user.role, hasHydrated, canAccess, defaultRoute, router]);

  return null;
}
