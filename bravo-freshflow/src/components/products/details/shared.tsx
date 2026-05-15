"use client";

import { Snowflake, Sun, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORAGE_TYPE_LABELS } from "@/lib/constants";
import type { StorageType } from "@/types";

const STORAGE_ICON: Record<StorageType, typeof Sun> = {
  ambient: Sun,
  chilled: Thermometer,
  frozen: Snowflake,
};

const STORAGE_TONE: Record<StorageType, string> = {
  ambient: "bg-amber-100 text-amber-700",
  chilled: "bg-sky-100 text-sky-700",
  frozen: "bg-indigo-100 text-indigo-700",
};

export function StorageBadge({
  storage,
  className,
}: {
  storage: StorageType;
  className?: string;
}) {
  const Icon = STORAGE_ICON[storage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        STORAGE_TONE[storage],
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {STORAGE_TYPE_LABELS[storage]}
    </span>
  );
}
