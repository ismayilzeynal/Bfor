import { ROLE_ALLOWED_ROUTES, ROLE_DEFAULT_ROUTES } from "@/lib/constants";
import type { Role, User } from "@/types";

export function defaultRouteFor(role: Role): string {
  return ROLE_DEFAULT_ROUTES[role];
}

export function allowedRoutesFor(role: Role): string[] {
  return ROLE_ALLOWED_ROUTES[role];
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_ROUTES[role];
  return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isStoreScoped(role: Role): boolean {
  return role === "store_manager" || role === "supervisor" || role === "employee";
}

export interface StoreScopedRecord {
  store_id: string | null | undefined;
}

export function filterByStoreScope<T extends StoreScopedRecord>(items: T[], user: User): T[] {
  if (!isStoreScoped(user.role) || !user.store_id) return items;
  return items.filter((item) => item.store_id === user.store_id);
}

export function canApprove(role: Role, requiredRole: Role | null | undefined): boolean {
  if (!requiredRole) return true;
  if (role === requiredRole) return true;
  if (role === "ceo" || role === "coo") return true;
  return false;
}
