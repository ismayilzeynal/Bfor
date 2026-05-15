"use client";

import { useEffect } from "react";
import { loadUsers, loadNotifications } from "@/lib/mock-loader";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationsStore } from "@/store/notifications-store";

export function AppHydrator() {
  const hydrateUsers = useAuthStore((s) => s.hydrateUsers);
  const hydrateNotifications = useNotificationsStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const notificationsHydrated = useNotificationsStore((s) => s.hasHydrated);

  useEffect(() => {
    if (authHydrated) return;
    let cancelled = false;
    loadUsers().then((users) => {
      if (cancelled) return;
      if (users.length > 0) hydrateUsers(users);
    });
    return () => {
      cancelled = true;
    };
  }, [authHydrated, hydrateUsers]);

  useEffect(() => {
    if (notificationsHydrated) return;
    let cancelled = false;
    loadNotifications().then((items) => {
      if (cancelled) return;
      hydrateNotifications(items);
    });
    return () => {
      cancelled = true;
    };
  }, [notificationsHydrated, hydrateNotifications]);

  return null;
}
