"use client";

import { useMemo } from "react";
import { ROLE_ALLOWED_ROUTES, ROLE_DEFAULT_ROUTES } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-role";

export function usePermissions() {
  const user = useCurrentUser();
  return useMemo(() => {
    const allowed = ROLE_ALLOWED_ROUTES[user.role] ?? [];
    const defaultRoute = ROLE_DEFAULT_ROUTES[user.role] ?? "/executive";
    const canAccess = (pathname: string) => {
      if (!pathname) return false;
      const base = "/" + pathname.split("/").filter(Boolean)[0];
      if (!base || base === "/") return false;
      if (base === "/products" && pathname.startsWith("/products/")) {
        return allowed.includes("/products");
      }
      return allowed.includes(base);
    };
    return { user, allowed, defaultRoute, canAccess };
  }, [user]);
}
