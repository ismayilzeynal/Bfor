"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NotificationType } from "@/types";
import type { DateRangeKey } from "./filters-store";

export type Density = "comfortable" | "compact";
export type DateFormat = "dd MMM yyyy" | "yyyy-MM-dd" | "dd/MM/yyyy";

export interface NotifChannelPrefs {
  email: boolean;
  push: boolean;
  in_app: boolean;
}

export type NotificationPreferences = Record<NotificationType, NotifChannelPrefs>;

const ALL_NOTIF_TYPES: NotificationType[] = [
  "critical_risk",
  "approval_needed",
  "task_assigned",
  "task_deadline_approaching",
  "task_expired",
  "transfer_pending",
  "stock_mismatch",
  "low_data_confidence",
  "supplier_issue",
  "result_ready",
];

function defaultPrefs(): NotificationPreferences {
  return ALL_NOTIF_TYPES.reduce((acc, t) => {
    acc[t] = { email: true, push: true, in_app: true };
    return acc;
  }, {} as NotificationPreferences);
}

interface UiState {
  sidebarCollapsed: boolean;
  onboardingSeen: boolean;
  commandPaletteOpen: boolean;
  roleSwitcherOpen: boolean;
  mobileSidebarOpen: boolean;
  density: Density;
  language: "en" | "az";
  dateFormat: DateFormat;
  defaultDateRange: DateRangeKey;
  autoApproveThreshold: number;
  demoMode: boolean;
  complianceMode: boolean;
  notificationPreferences: NotificationPreferences;
  quietHours: { enabled: boolean; start: string; end: string };
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
  setCommandPaletteOpen: (v: boolean) => void;
  setRoleSwitcherOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setDensity: (v: Density) => void;
  setLanguage: (v: "en" | "az") => void;
  setDateFormat: (v: DateFormat) => void;
  setDefaultDateRange: (v: DateRangeKey) => void;
  setAutoApproveThreshold: (v: number) => void;
  setDemoMode: (v: boolean) => void;
  setComplianceMode: (v: boolean) => void;
  setNotifPref: (type: NotificationType, channel: keyof NotifChannelPrefs, v: boolean) => void;
  setQuietHours: (patch: Partial<{ enabled: boolean; start: string; end: string }>) => void;
  resetPreferences: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      onboardingSeen: false,
      commandPaletteOpen: false,
      roleSwitcherOpen: false,
      mobileSidebarOpen: false,
      density: "comfortable",
      language: "en",
      dateFormat: "dd MMM yyyy",
      defaultDateRange: "30d",
      autoApproveThreshold: 0.95,
      demoMode: true,
      complianceMode: false,
      notificationPreferences: defaultPrefs(),
      quietHours: { enabled: false, start: "22:00", end: "07:00" },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setOnboardingSeen: (v) => set({ onboardingSeen: v }),
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
      setRoleSwitcherOpen: (v) => set({ roleSwitcherOpen: v }),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      setDensity: (v) => set({ density: v }),
      setLanguage: (v) => set({ language: v }),
      setDateFormat: (v) => set({ dateFormat: v }),
      setDefaultDateRange: (v) => set({ defaultDateRange: v }),
      setAutoApproveThreshold: (v) => set({ autoApproveThreshold: v }),
      setDemoMode: (v) => set({ demoMode: v }),
      setComplianceMode: (v) => set({ complianceMode: v }),
      setNotifPref: (type, channel, v) => {
        const prev = get().notificationPreferences[type] ?? { email: true, push: true, in_app: true };
        set({
          notificationPreferences: {
            ...get().notificationPreferences,
            [type]: { ...prev, [channel]: v },
          },
        });
      },
      setQuietHours: (patch) => set({ quietHours: { ...get().quietHours, ...patch } }),
      resetPreferences: () =>
        set({
          density: "comfortable",
          language: "en",
          dateFormat: "dd MMM yyyy",
          defaultDateRange: "30d",
          autoApproveThreshold: 0.95,
          demoMode: true,
          complianceMode: false,
          notificationPreferences: defaultPrefs(),
          quietHours: { enabled: false, start: "22:00", end: "07:00" },
        }),
    }),
    {
      name: "bravo-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        onboardingSeen: state.onboardingSeen,
        density: state.density,
        language: state.language,
        dateFormat: state.dateFormat,
        defaultDateRange: state.defaultDateRange,
        autoApproveThreshold: state.autoApproveThreshold,
        demoMode: state.demoMode,
        complianceMode: state.complianceMode,
        notificationPreferences: state.notificationPreferences,
        quietHours: state.quietHours,
      }),
    }
  )
);
