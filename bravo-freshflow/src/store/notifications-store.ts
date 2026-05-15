"use client";

import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationsState {
  notifications: Notification[];
  hasHydrated: boolean;
  hydrate: (items: Notification[]) => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: (userId: string) => void;
  markManyRead: (ids: string[]) => void;
  deleteNotification: (id: string) => void;
  deleteMany: (ids: string[]) => void;
  deleteReadForUser: (userId: string) => void;
  unreadCount: (userId: string) => number;
  forUser: (userId: string) => Notification[];
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  hasHydrated: false,
  hydrate: (items) => set({ notifications: items, hasHydrated: true }),
  markRead: (id) =>
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    }),
  markUnread: (id) =>
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, is_read: false } : n
      ),
    }),
  markAllRead: (userId) =>
    set({
      notifications: get().notifications.map((n) =>
        n.user_id === userId ? { ...n, is_read: true } : n
      ),
    }),
  markManyRead: (ids) => {
    const idSet = new Set(ids);
    set({
      notifications: get().notifications.map((n) =>
        idSet.has(n.id) ? { ...n, is_read: true } : n
      ),
    });
  },
  deleteNotification: (id) =>
    set({ notifications: get().notifications.filter((n) => n.id !== id) }),
  deleteMany: (ids) => {
    const idSet = new Set(ids);
    set({ notifications: get().notifications.filter((n) => !idSet.has(n.id)) });
  },
  deleteReadForUser: (userId) =>
    set({
      notifications: get().notifications.filter(
        (n) => !(n.user_id === userId && n.is_read)
      ),
    }),
  unreadCount: (userId) =>
    get().notifications.filter((n) => n.user_id === userId && !n.is_read).length,
  forUser: (userId) =>
    get()
      .notifications.filter((n) => n.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  reset: () => set({ notifications: [], hasHydrated: false }),
}));
