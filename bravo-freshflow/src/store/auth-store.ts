"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

const DEFAULT_CEO: User = {
  id: "u-001",
  full_name: "Aysel Məmmədova",
  email: "aysel.m@bravo.az",
  role: "ceo",
  store_id: null,
  department: "Executive",
  avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=u-001",
  is_active: true,
};

interface AuthState {
  currentUser: User;
  allUsers: User[];
  hasHydrated: boolean;
  userOverrides: Record<string, Partial<User>>;
  hydrateUsers: (users: User[]) => void;
  switchRole: (userId: string) => User | null;
  updateUser: (id: string, patch: Partial<User>) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEFAULT_CEO,
      allUsers: [],
      hasHydrated: false,
      userOverrides: {},
      hydrateUsers: (users) => {
        const overrides = get().userOverrides;
        const all = users.map((u) => (overrides[u.id] ? { ...u, ...overrides[u.id] } : u));
        const current = get().currentUser;
        const matched = all.find((u) => u.id === current.id);
        set({
          allUsers: all,
          currentUser: matched ?? all.find((u) => u.role === "ceo") ?? current,
          hasHydrated: true,
        });
      },
      switchRole: (userId) => {
        const next = get().allUsers.find((u) => u.id === userId);
        if (!next) return null;
        set({ currentUser: next });
        return next;
      },
      updateUser: (id, patch) => {
        const overrides = {
          ...get().userOverrides,
          [id]: { ...(get().userOverrides[id] ?? {}), ...patch },
        };
        const allUsers = get().allUsers.map((u) => (u.id === id ? { ...u, ...patch } : u));
        const currentUser =
          get().currentUser.id === id ? { ...get().currentUser, ...patch } : get().currentUser;
        set({ userOverrides: overrides, allUsers, currentUser });
      },
      reset: () =>
        set({
          currentUser: DEFAULT_CEO,
          allUsers: [],
          hasHydrated: false,
          userOverrides: {},
        }),
    }),
    {
      name: "bravo-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        userOverrides: state.userOverrides,
      }),
    }
  )
);
