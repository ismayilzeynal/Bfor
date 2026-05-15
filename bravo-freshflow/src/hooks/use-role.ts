"use client";

import { useAuthStore } from "@/store/auth-store";

export function useCurrentUser() {
  return useAuthStore((s) => s.currentUser);
}

export function useAllUsers() {
  return useAuthStore((s) => s.allUsers);
}
