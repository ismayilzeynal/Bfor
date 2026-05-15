"use client";

import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationsState {
  notifications: Notification[];
  hasHydrated: boolean;
  hydrate: (items: Notification[]) => void;
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  unreadCount: (userId: string) => number;
  forUser: (userId: string) => Notification[];
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
  markAllRead: (userId) =>
    set({
      notifications: get().notifications.map((n) =>
        n.user_id === userId ? { ...n, is_read: true } : n
      ),
    }),
  unreadCount: (userId) =>
    get().notifications.filter((n) => n.user_id === userId && !n.is_read).length,
  forUser: (userId) =>
    get()
      .notifications.filter((n) => n.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
}));
