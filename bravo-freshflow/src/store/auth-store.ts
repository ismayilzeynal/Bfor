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
  hydrateUsers: (users: User[]) => void;
  switchRole: (userId: string) => User | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEFAULT_CEO,
      allUsers: [],
      hasHydrated: false,
      hydrateUsers: (users) => {
        const current = get().currentUser;
        const matched = users.find((u) => u.id === current.id);
        set({
          allUsers: users,
          currentUser: matched ?? users.find((u) => u.role === "ceo") ?? current,
          hasHydrated: true,
        });
      },
      switchRole: (userId) => {
        const next = get().allUsers.find((u) => u.id === userId);
        if (!next) return null;
        set({ currentUser: next });
        return next;
      },
    }),
    {
      name: "bravo-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
