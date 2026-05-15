"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  onboardingSeen: boolean;
  commandPaletteOpen: boolean;
  roleSwitcherOpen: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
  setCommandPaletteOpen: (v: boolean) => void;
  setRoleSwitcherOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      onboardingSeen: false,
      commandPaletteOpen: false,
      roleSwitcherOpen: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setOnboardingSeen: (v) => set({ onboardingSeen: v }),
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
      setRoleSwitcherOpen: (v) => set({ roleSwitcherOpen: v }),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
    }),
    {
      name: "bravo-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        onboardingSeen: state.onboardingSeen,
      }),
    }
  )
);
