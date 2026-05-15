"use client";

import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFiltersStore, type DateRangeKey } from "@/store/filters-store";

const OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "Year to date" },
];

const LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  ytd: "YTD",
  custom: "Custom",
};

export function DateRangePill() {
  const value = useFiltersStore((s) => s.dateRangeKey);
  const set = useFiltersStore((s) => s.setDateRangeKey);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-9 gap-2 md:inline-flex">
          <CalendarRange className="h-3.5 w-3.5" />
          <span className="text-xs">{LABELS[value]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Date range</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.key} onClick={() => set(opt.key)}>
            {opt.label}
            {value === opt.key && <span className="ml-auto text-xs text-muted-foreground">●</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
